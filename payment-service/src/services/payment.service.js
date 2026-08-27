const repository = require("../repositories/payment.repository");
const gateway = require("../gateway/payment-gateway");
const config = require("../config");
const logger = require("../logger");

// Lỗi nghiệp vụ có gắn "code" để handler map sang gRPC status.
class ServiceError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Xử lý thanh toán với retry + exponential backoff.
 * Luôn lưu lại bản ghi payment (SUCCESS hoặc FAILED) để audit.
 */
async function processPayment({ orderId, userId, amount, method }) {
  const maxRetries = config.payment.maxRetries;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info({ orderId, attempt, maxRetries }, "Payment attempt");
      const { transactionId } = await gateway.charge(orderId, amount);

      // Charge xong mới ghi DB — và lúc ghi phải kiểm tra xem saga đã yêu cầu
      // hoàn tiền trong lúc mình đang xử lý hay chưa (trường hợp order-service
      // đã bỏ cuộc vì DEADLINE_EXCEEDED).
      const { payment, refundRequested } = await repository.createChargedPayment(
        { orderId, userId, amount, method, transactionId }
      );

      if (refundRequested) {
        logger.warn(
          { paymentId: payment.id, orderId, transactionId },
          "Charge thành công nhưng saga đã yêu cầu hoàn tiền -> ghi thẳng REFUNDED"
        );
      } else {
        logger.info(
          { paymentId: payment.id, transactionId },
          "Payment succeeded"
        );
      }
      return payment;
    } catch (err) {
      lastError = err;
      logger.warn(
        { orderId, attempt, err: err.message },
        "Payment attempt failed"
      );

      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
        await sleep(backoff);
      }
    }
  }

  const payment = await repository.create({
    orderId,
    userId,
    amount,
    method,
    status: "FAILED",
    error: lastError.message,
  });
  logger.error(
    { orderId, paymentId: payment.id, err: lastError.message },
    "Payment failed after all retries"
  );
  return payment;
}

async function getPayment(id) {
  return repository.findById(id);
}

/**
 * Hoàn tiền cho Saga compensation. Chỉ hoàn được payment đã SUCCESS.
 */
async function refundPayment(paymentId) {
  const payment = await repository.findById(paymentId);
  if (!payment) {
    throw new ServiceError(`Payment not found: ${paymentId}`, "NOT_FOUND");
  }
  if (payment.status !== "SUCCESS") {
    throw new ServiceError(
      "Cannot refund a non-successful payment",
      "FAILED_PRECONDITION"
    );
  }

  await sleep(500); // mô phỏng thời gian xử lý refund
  await repository.markRefunded(paymentId);
  logger.info({ paymentId }, "Payment refunded");
  return true;
}

/**
 * Compensation của Saga: hoàn tiền theo orderId.
 *
 * Khác `refundPayment` (dùng paymentId, ném lỗi khi không hợp lệ), hàm này được
 * thiết kế để KHÔNG BAO GIỜ ném lỗi nghiệp vụ, vì compensation phải:
 *   - idempotent  : gọi lại nhiều lần vẫn an toàn (không double-refund)
 *   - "blind-safe": gọi được cả khi order-service không chắc đã charge hay chưa
 *                   (vd ProcessPayment bị DEADLINE_EXCEEDED sau khi đã charge)
 */
async function refundByOrderId(orderId) {
  const refunded = await repository.requestRefundByOrderId(orderId);

  if (refunded.length > 0) {
    logger.info(
      { orderId, paymentIds: refunded.map((p) => p.id) },
      "Refunded payment(s) by orderId"
    );
    return { refunded: refunded.length, message: "Payment refunded" };
  }

  // Không có row SUCCESS nào -> phân biệt "đã refund rồi" với "chưa hề charge".
  const existing = await repository.findByOrderId(orderId);
  if (existing.length === 0) {
    logger.info(
      { orderId },
      "Chưa có payment nào; đã ghi refund intent để charge tới sau tự huỷ"
    );
    return {
      refunded: 0,
      message: "No payment yet; refund intent recorded",
    };
  }

  const alreadyRefunded = existing.some((p) => p.status === "REFUNDED");
  const message = alreadyRefunded
    ? "Payment already refunded (idempotent no-op)"
    : "No successful payment to refund";
  logger.info({ orderId, message }, "Refund by orderId was a no-op");
  return { refunded: 0, message };
}

module.exports = {
  processPayment,
  getPayment,
  refundPayment,
  refundByOrderId,
  ServiceError,
};
