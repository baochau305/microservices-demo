const config = require("../config");
const logger = require("../logger");

/**
 * Producer đẩy message hỏng sang Kafka DLQ.
 *
 * Kafka không có khái niệm DLQ dựng sẵn như RabbitMQ: consumer commit offset là
 * message coi như xong, kể cả khi xử lý thất bại. Nên "DLQ" ở đây chỉ là một
 * topic riêng do chính consumer publish sang, kèm đủ metadata để điều tra và
 * replay về sau.
 */
let producer = null;

function init(kafka) {
  producer = kafka.producer();
}

async function connect() {
  await producer.connect();
  logger.info({ topic: config.kafka.dlqTopic }, "DLQ producer connected");
}

/**
 * Gửi message hỏng kèm nguyên văn payload gốc và lý do thất bại.
 * Giữ nguyên key để message của cùng một order vẫn nằm cùng partition.
 */
async function publishFailed({ message, error, attempts }) {
  await producer.send({
    topic: config.kafka.dlqTopic,
    messages: [
      {
        key: message.key,
        value: JSON.stringify({
          failedAt: new Date().toISOString(),
          error,
          attempts,
          originalTopic: config.kafka.topic,
          originalPartition: message.partition,
          originalOffset: message.offset,
          // Nguyên văn, chưa parse — để replay được cả message không phải JSON.
          originalValue: message.value ? message.value.toString() : null,
        }),
        headers: {
          "error-reason": error,
          "original-topic": config.kafka.topic,
        },
      },
    ],
  });
}

async function disconnect() {
  if (producer) await producer.disconnect();
}

module.exports = { init, connect, publishFailed, disconnect };
