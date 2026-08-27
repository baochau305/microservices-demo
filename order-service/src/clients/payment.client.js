const grpc = require("@grpc/grpc-js");
const { loadProto } = require("../proto/loader");
const { deadline } = require("./deadline");
const { correlationMetadata } = require("../context/grpc");
const config = require("../config");

const paymentProto = loadProto("payment.proto", "payment");
const client = new paymentProto.PaymentService(
  config.services.payment,
  grpc.credentials.createInsecure()
);

function processPayment({ orderId, userId, amount, method }) {
  return new Promise((resolve, reject) => {
    client.ProcessPayment(
      { orderId, userId, amount, method },
      correlationMetadata(),
      { deadline: deadline(config.grpcTimeouts.payment) },
      (err, response) => (err ? reject(err) : resolve(response))
    );
  });
}

function refundPayment(paymentId) {
  return new Promise((resolve, reject) => {
    client.RefundPayment(
      { paymentId },
      correlationMetadata(),
      { deadline: deadline(config.grpcTimeouts.payment) },
      (err, response) => (err ? reject(err) : resolve(response))
    );
  });
}

/**
 * Compensation dùng trong Saga: hoàn tiền theo orderId, idempotent phía server.
 * Dùng cái này thay cho refundPayment vì saga có thể cần rollback ngay cả khi
 * ProcessPayment bị DEADLINE_EXCEEDED — lúc đó nó không hề biết paymentId.
 */
function refundByOrderId(orderId) {
  return new Promise((resolve, reject) => {
    client.RefundByOrderId(
      { orderId },
      correlationMetadata(),
      { deadline: deadline(config.grpcTimeouts.payment) },
      (err, response) => (err ? reject(err) : resolve(response))
    );
  });
}

module.exports = { processPayment, refundPayment, refundByOrderId };
