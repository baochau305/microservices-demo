const path = require("path");

// Cấu hình tập trung cho order-service.
const config = {
  serviceName: "order-service",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  grpc: {
    host: process.env.GRPC_HOST || "0.0.0.0",
    port: process.env.GRPC_PORT || "50053",
  },
  protoDir: process.env.PROTO_DIR || path.resolve(__dirname, "../../../proto"),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/orderdb",
  services: {
    user: process.env.USER_SERVICE_URL || "localhost:50051",
    product: process.env.PRODUCT_SERVICE_URL || "localhost:50052",
    payment: process.env.PAYMENT_SERVICE_URL || "localhost:50054",
  },
  // Deadline cho các gRPC call đi ra. Không có deadline thì một service bị treo
  // (không crash, chỉ không trả lời) sẽ làm saga đứng vĩnh viễn -> compensation
  // không bao giờ chạy. Hết deadline, gRPC trả DEADLINE_EXCEEDED và saga rollback.
  grpcTimeouts: {
    // user/product: lookup đơn giản, phản hồi nhanh.
    default: parseInt(process.env.GRPC_TIMEOUT_MS || "5000", 10),
    // payment: rộng hơn vì payment-service TỰ retry bên trong.
    // Worst case = PAYMENT_MAX_RETRIES(3) x gateway delay(<=2s) + backoff(1s+2s) ~ 9s.
    // Deadline phải lớn hơn con số đó, nếu không sẽ cắt ngang giữa chuỗi retry.
    payment: parseInt(process.env.GRPC_PAYMENT_TIMEOUT_MS || "15000", 10),
  },
  kafka: {
    clientId: "order-service",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    topic: "order-events",
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    notificationQueue: "order_notifications",
  },
};

function validate() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  for (const [name, ms] of Object.entries(config.grpcTimeouts)) {
    if (!Number.isFinite(ms) || ms <= 0) {
      throw new Error(`gRPC timeout "${name}" must be a positive number, got: ${ms}`);
    }
  }
}

validate();

module.exports = config;
