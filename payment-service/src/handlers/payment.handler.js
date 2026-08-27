const grpc = require("@grpc/grpc-js");
const service = require("../services/payment.service");
const logger = require("../logger");

const CODE_MAP = {
  NOT_FOUND: grpc.status.NOT_FOUND,
  FAILED_PRECONDITION: grpc.status.FAILED_PRECONDITION,
};

async function processPayment(call, callback) {
  const { orderId, userId, amount, method } = call.request;
  logger.info({ orderId, userId, amount, method }, "ProcessPayment called");

  try {
    const payment = await service.processPayment({
      orderId,
      userId,
      amount,
      method,
    });
    callback(null, {
      id: payment.id,
      status: payment.status,
      transactionId: payment.transaction_id || "",
      message: describeOutcome(payment),
    });
  } catch (err) {
    logger.error({ err: err.message }, "ProcessPayment error");
    callback({ code: grpc.status.INTERNAL, message: "internal error" });
  }
}

function describeOutcome(payment) {
  switch (payment.status) {
    case "SUCCESS":
      return "Payment processed successfully";
    // Charge đã thành công nhưng saga yêu cầu hoàn tiền trước khi kịp ghi nhận
    // (order-service đã bỏ cuộc vì DEADLINE_EXCEEDED). Tiền đã được trả lại.
    case "REFUNDED":
      return "Payment was charged then auto-refunded (saga had already rolled back)";
    default:
      return `Payment failed: ${payment.error}`;
  }
}

async function getPayment(call, callback) {
  const { id } = call.request;
  try {
    const p = await service.getPayment(id);
    if (!p) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Payment not found: ${id}`,
      });
    }
    callback(null, {
      id: p.id,
      orderId: p.order_id,
      userId: p.user_id,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
      transactionId: p.transaction_id || "",
      timestamp: p.created_at ? new Date(p.created_at).toISOString() : "",
    });
  } catch (err) {
    logger.error({ err: err.message }, "GetPayment error");
    callback({ code: grpc.status.INTERNAL, message: "internal error" });
  }
}

async function refundPayment(call, callback) {
  const { paymentId } = call.request;
  logger.info({ paymentId }, "RefundPayment called");

  try {
    await service.refundPayment(paymentId);
    callback(null, { success: true, message: "Payment refunded successfully" });
  } catch (err) {
    const code = CODE_MAP[err.code] || grpc.status.INTERNAL;
    logger.warn({ paymentId, err: err.message }, "RefundPayment failed");
    callback({ code, message: err.message });
  }
}

async function refundByOrderId(call, callback) {
  const { orderId } = call.request;
  logger.info({ orderId }, "RefundByOrderId called");

  try {
    const result = await service.refundByOrderId(orderId);
    callback(null, { success: true, message: result.message });
  } catch (err) {
    // Chỉ lỗi hạ tầng (DB down) mới tới đây; lỗi nghiệp vụ đã được nuốt trong service.
    logger.error({ orderId, err: err.message }, "RefundByOrderId error");
    callback({ code: grpc.status.INTERNAL, message: "internal error" });
  }
}

module.exports = { processPayment, getPayment, refundPayment, refundByOrderId };
