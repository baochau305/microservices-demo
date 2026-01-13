const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../proto/payment.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const paymentProto = grpc.loadPackageDefinition(packageDefinition).payment;

// In-memory storage for payments
const payments = new Map();
let nextId = 1;

// Simulate payment gateway with timeout and failures
async function processPaymentGateway(orderId, amount) {
  console.log(`💳 Processing payment for order ${orderId}: $${amount}`);

  // Simulate random delays (network latency)
  const delay = Math.random() * 2000; // 0-2 seconds
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simulate 20% failure rate for demo
  if (Math.random() < 0.2) {
    throw new Error("Payment gateway timeout or declined");
  }

  return {
    transactionId: `TXN-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
}

// Process payment with retry logic
async function processPayment(call, callback) {
  const { orderId, userId, amount, method } = call.request;
  const MAX_RETRIES = 3;
  let lastError;

  console.log("ProcessPayment called:", { orderId, userId, amount, method });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 Payment attempt ${attempt}/${MAX_RETRIES}`);

      // Call payment gateway
      const gatewayResponse = await processPaymentGateway(orderId, amount);

      // Save payment record
      const id = String(nextId++);
      const payment = {
        id,
        orderId,
        userId,
        amount,
        method,
        status: "SUCCESS",
        transactionId: gatewayResponse.transactionId,
        timestamp: gatewayResponse.timestamp,
      };

      payments.set(id, payment);
      console.log("✅ Payment processed successfully:", payment);

      return callback(null, {
        id: payment.id,
        status: "SUCCESS",
        transactionId: payment.transactionId,
        message: "Payment processed successfully",
      });
    } catch (error) {
      lastError = error;
      console.error(`❌ Payment attempt ${attempt} failed:`, error.message);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        const backoff = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  // All retries failed
  const id = String(nextId++);
  const payment = {
    id,
    orderId,
    userId,
    amount,
    method,
    status: "FAILED",
    error: lastError.message,
    timestamp: new Date().toISOString(),
  };

  payments.set(id, payment);
  console.log("❌ Payment failed after all retries:", payment);

  return callback(null, {
    id: payment.id,
    status: "FAILED",
    transactionId: "",
    message: `Payment failed: ${lastError.message}`,
  });
}

// Get payment info
function getPayment(call, callback) {
  const { id } = call.request;
  console.log("GetPayment called for ID:", id);

  const payment = payments.get(id);
  if (!payment) {
    return callback({
      code: grpc.status.NOT_FOUND,
      message: `Payment not found: ${id}`,
    });
  }

  callback(null, payment);
}

// Refund payment (for Saga compensation)
async function refundPayment(call, callback) {
  const { paymentId } = call.request;
  console.log("RefundPayment called for ID:", paymentId);

  const payment = payments.get(paymentId);
  if (!payment) {
    return callback({
      code: grpc.status.NOT_FOUND,
      message: `Payment not found: ${paymentId}`,
    });
  }

  if (payment.status !== "SUCCESS") {
    return callback({
      code: grpc.status.FAILED_PRECONDITION,
      message: "Cannot refund a failed payment",
    });
  }

  // Simulate refund processing
  await new Promise((resolve) => setTimeout(resolve, 500));

  payment.status = "REFUNDED";
  payment.refundedAt = new Date().toISOString();

  console.log("✅ Payment refunded:", payment);

  callback(null, {
    success: true,
    message: "Payment refunded successfully",
  });
}

// Start gRPC server
function main() {
  const server = new grpc.Server();

  server.addService(paymentProto.PaymentService.service, {
    processPayment,
    getPayment,
    refundPayment,
  });

  server.bindAsync(
    "0.0.0.0:50054",
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error("Failed to bind server:", err);
        return;
      }
      console.log("💳 Payment Service is running on port 50054...");
      console.log("Ready to process payments with retry logic");
    }
  );
}

main();
