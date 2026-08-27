const crypto = require("crypto");
const userClient = require("../clients/user.client");
const productClient = require("../clients/product.client");
const paymentClient = require("../clients/payment.client");
const orderRepository = require("../repositories/order.repository");
const { ORDER_STATUS } = require("../domain/order-status");
const kafkaProducer = require("../messaging/kafka.producer");
const rabbitPublisher = require("../messaging/rabbitmq.publisher");
const logger = require("../logger");

class SagaError extends Error {}

/**
 * Saga Orchestration cho việc tạo order.
 *
 * Các bước:
 *   1. Lấy thông tin user      (user-service)
 *   2. Lấy thông tin product   (product-service)
 *   3. Xử lý thanh toán         (payment-service)
 *   4. Lưu order vào Postgres
 *   --- hết ranh giới rollback ---
 *   5. Publish event (Kafka) + notification (RabbitMQ)
 *
 * HAI QUY TẮC quyết định tính đúng đắn ở đây:
 *
 * (a) Compensation được ĐĂNG KÝ TRƯỚC khi thực hiện thao tác, không phải sau.
 *     Nếu đăng ký sau, một call bị DEADLINE_EXCEEDED (server đã làm xong nhưng
 *     client không nhận được kết quả) sẽ để lại thay đổi mồ côi mà không có
 *     compensation nào. Đổi lại, mọi compensation phải idempotent và an toàn
 *     ngay cả khi thao tác thực ra chưa hề xảy ra.
 *
 * (b) Bước 5 nằm NGOÀI ranh giới rollback. Tới đó tiền đã trừ và order đã lưu
 *     hợp lệ; nếu chỉ vì publish lỗi mà đi refund + huỷ đơn thì còn tệ hơn.
 *     Publish lỗi được log ở mức error, order vẫn đứng vững. Đây chính là
 *     dual-write problem — lời giải triệt để là Transactional Outbox.
 */
async function execute({ userId, productId, quantity }) {
  const orderId = crypto.randomUUID();
  const compensations = [];
  const log = logger.child({ sagaId: orderId });
  log.info({ userId, productId, quantity }, "Saga started");

  let order;
  try {
    // Step 1
    const user = await userClient.getUser(userId);
    log.info({ email: user.email }, "Step 1: user retrieved");

    // Step 2
    const product = await productClient.getProduct(productId);
    log.info({ product: product.name }, "Step 2: product retrieved");

    // Step 3 — đăng ký refund TRƯỚC khi charge.
    // RefundByOrderId idempotent và không lỗi khi chưa có payment nào, nên gọi
    // "mù" vẫn an toàn kể cả khi ta không biết charge đã kịp xảy ra hay chưa.
    const totalPrice = product.price * quantity;
    compensations.push({
      name: "refund-payment",
      run: async () => {
        const res = await paymentClient.refundByOrderId(orderId);
        log.warn({ result: res.message }, "Compensation: refund payment");
      },
    });

    const payment = await paymentClient.processPayment({
      orderId,
      userId,
      amount: totalPrice,
      method: "CREDIT_CARD",
    });
    if (payment.status !== "SUCCESS") {
      throw new SagaError(`Payment failed: ${payment.message}`);
    }
    log.info({ transactionId: payment.transactionId }, "Step 3: payment ok");

    // Step 4 — đăng ký huỷ đơn TRƯỚC khi insert.
    // updateStatus trên row không tồn tại chỉ trả null, nên an toàn cả khi
    // insert chưa kịp chạy hoặc đã fail.
    compensations.push({
      name: "cancel-order",
      run: async () => {
        const cancelled = await orderRepository.updateStatus(
          orderId,
          ORDER_STATUS.CANCELLED
        );
        log.warn(
          { cancelled: Boolean(cancelled) },
          "Compensation: cancel order"
        );
      },
    });

    order = await orderRepository.create({
      id: orderId,
      userId,
      productId,
      quantity,
      totalPrice,
      userName: user.name || "Customer",
      userEmail: user.email,
      productName: product.name,
      paymentId: payment.id,
      status: ORDER_STATUS.CONFIRMED,
    });
    log.info("Step 4: order persisted");
  } catch (err) {
    log.error({ err: err.message }, "Saga failed; running compensation");
    await runCompensations(compensations, log);
    await safePublishFailed(orderId, err.message);
    throw err;
  }

  // Step 5 — ngoài ranh giới rollback: publish lỗi KHÔNG huỷ đơn đã confirmed.
  await publishEventsBestEffort(order, log);

  log.info("Saga completed successfully");
  return order;
}

/**
 * Chạy compensation theo thứ tự ngược. Một compensation lỗi không được chặn các
 * compensation còn lại — nhưng phải báo động, vì lúc đó hệ thống đang ở trạng
 * thái không nhất quán và cần can thiệp thủ công.
 */
async function runCompensations(compensations, log) {
  const failed = [];

  for (let i = compensations.length - 1; i >= 0; i--) {
    const { name, run } = compensations[i];
    try {
      await run();
    } catch (e) {
      failed.push(name);
      log.error({ compensation: name, err: e.message }, "Compensation failed");
    }
  }

  if (failed.length > 0) {
    log.error(
      { failedCompensations: failed },
      "INCONSISTENT STATE: compensation chưa hoàn tất, cần can thiệp thủ công"
    );
  }
}

/**
 * Publish Kafka và RabbitMQ ĐỘC LẬP: một bên lỗi không làm bên kia bị bỏ qua.
 */
async function publishEventsBestEffort(order, log) {
  const eventData = mapOrderToEvent(order);

  const results = await Promise.allSettled([
    kafkaProducer.publishOrderEvent("ORDER_CREATED", eventData),
    rabbitPublisher.publishNotification({
      orderId: order.id,
      userName: order.user_name,
      userEmail: order.user_email || "customer@example.com",
      productName: order.product_name,
      quantity: order.quantity,
      totalPrice: Number(order.total_price),
      timestamp: new Date().toISOString(),
    }),
  ]);

  const targets = ["kafka", "rabbitmq"];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      log.error(
        { target: targets[i], err: result.reason?.message },
        "Order đã CONFIRMED nhưng publish thất bại — event bị mất (cần Outbox pattern)"
      );
    }
  });
}

async function safePublishFailed(orderId, error) {
  try {
    await kafkaProducer.publishOrderEvent("ORDER_FAILED", { id: orderId, error });
  } catch (e) {
    logger.error({ err: e.message }, "Failed to publish ORDER_FAILED event");
  }
}

function mapOrderToEvent(order) {
  return {
    id: order.id,
    userId: order.user_id,
    productId: order.product_id,
    quantity: order.quantity,
    totalPrice: Number(order.total_price),
    userName: order.user_name,
    productName: order.product_name,
    createdAt: order.created_at
      ? new Date(order.created_at).toISOString()
      : new Date().toISOString(),
  };
}

module.exports = { execute, SagaError };
