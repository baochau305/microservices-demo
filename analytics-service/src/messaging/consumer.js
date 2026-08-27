const { Kafka } = require("kafkajs");
const config = require("../config");
const logger = require("../logger");
const analyticsService = require("../services/analytics.service");
const dlqProducer = require("./dlq.producer");
const { runWithCorrelationId } = require("../context");

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  retry: { initialRetryTime: 100, retries: 8 },
});

const consumer = kafka.consumer({ groupId: config.kafka.groupId });
dlqProducer.init(kafka);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function start() {
  await dlqProducer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: config.kafka.topic, fromBeginning: true });

  await consumer.run({
    // Nối lại trace: correlationId đi kèm message từ order-service, nên log
    // của analytics ghép được vào đúng request HTTP đã sinh ra event.
    eachMessage: ({ message, partition }) =>
      runWithCorrelationId(correlationIdOf(message), () =>
        processMessage({ ...message, partition })
      ),
  });

  logger.info({ topic: config.kafka.topic }, "Analytics consumer running");
}

/**
 * Xử lý một message với retry tại chỗ, hết retry thì đẩy sang DLQ.
 *
 * Trước đây chỗ này chỉ `catch` rồi log: offset vẫn commit nên message hỏng biến
 * mất không dấu vết. Nhưng cũng không được ném lỗi ra ngoài — kafkajs sẽ retry
 * mãi và một message hỏng vĩnh viễn (poison message) sẽ chặn đứng cả partition.
 *
 * Nên: thử lại vài lần cho lỗi tạm thời (vd Postgres đang restart), rồi bỏ cuộc
 * và chuyển sang DLQ để pipeline chạy tiếp mà bằng chứng vẫn còn.
 */
async function processMessage(message) {
  const raw = message.value ? message.value.toString() : "";
  let event;

  // Lỗi parse là hỏng vĩnh viễn — retry không bao giờ cứu được, vào DLQ luôn.
  try {
    event = JSON.parse(raw);
  } catch (err) {
    await sendToDlq(message, `Malformed JSON: ${err.message}`, 0);
    return;
  }

  let lastError;
  for (let attempt = 1; attempt <= config.kafka.maxRetries; attempt++) {
    try {
      await analyticsService.handleEvent(event);
      return;
    } catch (err) {
      lastError = err;
      logger.warn(
        {
          attempt,
          maxRetries: config.kafka.maxRetries,
          offset: message.offset,
          err: err.message,
        },
        "Xử lý message Kafka thất bại"
      );
      if (attempt < config.kafka.maxRetries) {
        await sleep(config.kafka.retryDelayMs * attempt);
      }
    }
  }

  await sendToDlq(message, lastError.message, config.kafka.maxRetries);
}

async function sendToDlq(message, error, attempts) {
  try {
    await dlqProducer.publishFailed({ message, error, attempts });
    logger.error(
      { offset: message.offset, partition: message.partition, error, attempts },
      "Message chuyển sang Kafka DLQ"
    );
  } catch (err) {
    // Không gửi được DLQ thì phải hét thật to: đây mới đúng là mất dữ liệu.
    logger.error(
      { offset: message.offset, err: err.message, originalError: error },
      "MẤT MESSAGE: không publish được sang DLQ"
    );
  }
}

function correlationIdOf(message) {
  const raw = message.headers?.["x-correlation-id"];
  const value = raw ? raw.toString() : "";
  return value || undefined; // undefined -> tự sinh id mới
}

async function stop() {
  await consumer.disconnect();
  await dlqProducer.disconnect();
}

module.exports = { start, stop };
