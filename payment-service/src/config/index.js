const path = require("path");

// Cấu hình tập trung cho payment-service, load từ biến môi trường.
const config = {
  serviceName: "payment-service",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  grpc: {
    host: process.env.GRPC_HOST || "0.0.0.0",
    port: process.env.GRPC_PORT || "50054",
  },
  // Thư mục chứa file .proto dùng chung. Docker set PROTO_DIR=/app/proto.
  protoDir: process.env.PROTO_DIR || path.resolve(__dirname, "../../../proto"),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/paymentdb",
  payment: {
    failureRate: parseFloat(process.env.PAYMENT_FAILURE_RATE || "0.2"),
    maxRetries: parseInt(process.env.PAYMENT_MAX_RETRIES || "3", 10),
  },
};

function validate() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
}

validate();

module.exports = config;
