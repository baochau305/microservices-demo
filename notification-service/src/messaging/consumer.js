const amqp = require("amqplib");
const config = require("../config");
const logger = require("../logger");
const handler = require("../handlers/notification.handler");
const { runWithCorrelationId } = require("../context");

/**
 * Consumer RabbitMQ với retry + Dead Letter Queue, nhưng để BROKER lo phần delay.
 *
 * Cách cũ (setTimeout + nack(requeue=true)) có ba vấn đề:
 *   1. Message requeue quay lại ĐẦU queue, và với prefetch=1 nó chặn toàn bộ
 *      queue suốt thời gian backoff -> head-of-line blocking.
 *   2. Bộ đếm retry nằm trong Map ở RAM: restart là mất, và không bao giờ được
 *      dọn nếu message đi vào DLQ bằng đường khác -> rò rỉ bộ nhớ.
 *   3. Giữ message chưa ack trong lúc chờ setTimeout: consumer chết là message
 *      quay về queue với bộ đếm đã mất, retry lại từ đầu.
 *
 * Cách mới: lỗi thì ack message gốc và publish sang `order_notifications_retry`
 * (queue có x-message-ttl). Hết TTL, RabbitMQ tự dead-letter nó về queue chính.
 * Consumer rảnh ngay lập tức, và số lần retry đọc từ header `x-death` do chính
 * broker duy trì nên sống sót qua restart.
 */
class NotificationConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async start() {
    this.connection = await amqp.connect(config.rabbitmq.url);
    this.channel = await this.connection.createChannel();

    // KHÔNG assertQueue ở đây: topology (queue + retry + DLQ + arguments) do
    // container `rabbitmq-init` khai báo một lần duy nhất. Nếu cả publisher lẫn
    // consumer cùng assertQueue mà arguments lệch nhau thì AMQP trả 406
    // PRECONDITION_FAILED và đóng channel. checkQueue chỉ xác nhận đã có sẵn.
    await this.checkTopology();

    this.connection.on("error", (err) =>
      logger.error({ err: err.message }, "RabbitMQ connection error")
    );

    await this.channel.prefetch(config.rabbitmq.prefetch);
    await this.consumeMainQueue();

    logger.info({ queue: config.rabbitmq.queue }, "Notification consumer ready");
  }

  /**
   * Xác nhận cả 3 queue đã tồn tại. Nếu chưa, dọn sạch connection rồi throw để
   * `connectWithRetry` thử lại mà không rò rỉ connection mỗi vòng.
   */
  async checkTopology() {
    const queues = [
      config.rabbitmq.deadLetterQueue,
      config.rabbitmq.retryQueue,
      config.rabbitmq.queue,
    ];
    try {
      for (const q of queues) {
        await this.channel.checkQueue(q);
      }
    } catch (err) {
      await this.stop().catch(() => {});
      throw new Error(
        `Queue ${queues.join(" / ")} chưa tồn tại. Topology do rabbitmq-init ` +
          `tạo; chạy 'docker compose up rabbitmq-init'. Chi tiết: ${err.message}`
      );
    }
  }

  async consumeMainQueue() {
    await this.channel.consume(
      config.rabbitmq.queue,
      (msg) => {
        if (!msg) return;
        // Nối lại trace từ AMQP property do order-service đặt.
        runWithCorrelationId(msg.properties.correlationId, () =>
          this.handleMessage(msg)
        );
      },
      { noAck: false }
    );
  }

  // KHÔNG consume DLQ: message phải NẰM LẠI đó để soi bằng
  // `rabbitmqctl list_queues` hoặc Management UI (localhost:15672). Consumer tự
  // ack DLQ thì coi như xoá luôn bằng chứng — đúng thứ mà DLQ sinh ra để giữ.

  async handleMessage(msg) {
    const content = safeParse(msg.content);
    const messageId = msg.properties.messageId || content?.orderId || "unknown";
    const retries = retryCountOf(msg);

    logger.info({ messageId, retries }, "Processing notification");

    try {
      await handler.process(content);
      this.channel.ack(msg);
      logger.info({ messageId }, "Notification processed successfully");
      return;
    } catch (err) {
      logger.warn(
        { messageId, retries, err: err.message },
        "Notification processing failed"
      );

      if (retries >= config.rabbitmq.maxRetries) {
        logger.error(
          { messageId, retries },
          "Hết số lần retry; đẩy vào Dead Letter Queue"
        );
        // requeue=false -> RabbitMQ route theo x-dead-letter-* của queue chính.
        this.channel.nack(msg, false, false);
        return;
      }

      this.scheduleRetry(msg, messageId, retries);
    }
  }

  /**
   * Đẩy message sang retry queue rồi ack bản gốc.
   *
   * Thứ tự quan trọng: publish TRƯỚC, ack SAU. Nếu ack trước mà publish lỗi thì
   * message bốc hơi. Publish lỗi thì nack(requeue=false) để nó vào thẳng DLQ,
   * thà nằm DLQ còn hơn mất hẳn.
   */
  scheduleRetry(msg, messageId, retries) {
    try {
      this.channel.sendToQueue(config.rabbitmq.retryQueue, msg.content, {
        persistent: true,
        messageId: msg.properties.messageId,
        correlationId: msg.properties.correlationId,
        // Giữ nguyên headers để broker cộng dồn x-death qua từng vòng retry.
        headers: msg.properties.headers,
      });
      this.channel.ack(msg);
      logger.info(
        { messageId, attempt: retries + 1, max: config.rabbitmq.maxRetries },
        "Đã hẹn retry qua retry queue"
      );
    } catch (err) {
      logger.error(
        { messageId, err: err.message },
        "Không đẩy được sang retry queue; cho vào DLQ"
      );
      this.channel.nack(msg, false, false);
    }
  }

  async stop() {
    // channel có thể đã bị broker đóng sẵn (vd checkQueue lỗi) -> bỏ qua lỗi đóng.
    if (this.channel) await this.channel.close().catch(() => {});
    if (this.connection) await this.connection.close().catch(() => {});
    this.channel = null;
    this.connection = null;
  }
}

/**
 * Số vòng retry đã đi qua, đọc từ header `x-death` do chính RabbitMQ duy trì.
 *
 * Mỗi lần message hết TTL ở retry queue và bị dead-letter về queue chính,
 * RabbitMQ tăng `count` của entry ứng với queue đó. Không cần state ở app, và
 * bộ đếm sống sót qua restart của consumer.
 */
function retryCountOf(msg) {
  const deaths = msg.properties.headers?.["x-death"];
  if (!Array.isArray(deaths)) return 0;
  const entry = deaths.find(
    (d) => d.queue === config.rabbitmq.retryQueue && d.reason === "expired"
  );
  return entry ? Number(entry.count) || 0 : 0;
}

function safeParse(buffer) {
  try {
    return JSON.parse(buffer.toString());
  } catch {
    return null;
  }
}

module.exports = NotificationConsumer;
