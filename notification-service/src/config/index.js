// Cấu hình tập trung cho notification-service.
const config = {
  serviceName: "notification-service",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    queue: "order_notifications",
    // Message lỗi được đẩy sang đây; hết TTL, RabbitMQ tự dead-letter nó về
    // queue chính. Nhờ vậy consumer không phải tự setTimeout rồi giữ message.
    retryQueue: "order_notifications_retry",
    deadLetterQueue: "order_notifications_dlq",
    maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || "3", 10),
    prefetch: 1,
  },
  email: {
    from: '"E-Commerce System" <noreply@ecommerce.com>',
    // Tỉ lệ lỗi giả lập để demo retry + Dead Letter Queue.
    failureRate: parseFloat(process.env.EMAIL_FAILURE_RATE || "0.1"),
  },
};

module.exports = config;
