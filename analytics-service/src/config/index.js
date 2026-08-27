// Cấu hình tập trung cho analytics-service.
const config = {
  serviceName: "analytics-service",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/analyticsdb",
  kafka: {
    clientId: "analytics-service",
    groupId: "analytics-group",
    topic: "order-events",
    // Message xử lý mãi không được thì đẩy vào đây thay vì nuốt im lặng.
    dlqTopic: "order-events-dlq",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    // Số lần thử lại tại chỗ trước khi bỏ cuộc và đẩy sang DLQ.
    maxRetries: parseInt(process.env.KAFKA_MAX_RETRIES || "3", 10),
    retryDelayMs: parseInt(process.env.KAFKA_RETRY_DELAY_MS || "1000", 10),
  },
};

function validate() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
}

validate();

module.exports = config;
