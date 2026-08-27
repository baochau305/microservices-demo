const amqp = require("amqplib");
const config = require("../config");
const logger = require("../logger");
const { getCorrelationId } = require("../context");

let connection = null;
let channel = null;

/**
 * Publisher RabbitMQ.
 *
 * QUAN TRỌNG: service này KHÔNG khai báo queue. Topology (queue + DLQ + arguments)
 * do container `rabbitmq-init` trong docker-compose tạo một lần duy nhất.
 * Ở đây chỉ `checkQueue` để fail sớm nếu topology chưa sẵn sàng — nhờ vậy không
 * thể xảy ra chuyện hai service assertQueue cùng tên với arguments khác nhau
 * (AMQP trả 406 PRECONDITION_FAILED và đóng channel).
 *
 * Dùng confirm channel để publishNotification chỉ resolve khi broker đã thực sự
 * nhận message, thay vì fire-and-forget.
 */
async function connect() {
  connection = await amqp.connect(config.rabbitmq.url);
  channel = await connection.createConfirmChannel();

  try {
    await channel.checkQueue(config.rabbitmq.notificationQueue);
  } catch (err) {
    // checkQueue thất bại làm channel đóng -> bỏ tham chiếu để connect() sau tạo lại.
    channel = null;
    throw new Error(
      `Queue "${config.rabbitmq.notificationQueue}" chưa tồn tại. Topology do ` +
        "rabbitmq-init tạo; chạy 'docker compose up rabbitmq-init' (hoặc tạo " +
        `queue thủ công nếu chạy ngoài Docker). Chi tiết: ${err.message}`
    );
  }

  connection.on("error", (err) => {
    logger.error({ err: err.message }, "RabbitMQ connection error");
  });
  connection.on("close", () => {
    logger.warn("RabbitMQ connection closed");
    channel = null;
  });

  logger.info("RabbitMQ publisher connected");
}

/**
 * Publish notification. Trả về Promise reject nếu không gửi được, để caller biết
 * mà log/xử lý thay vì âm thầm mất message.
 */
function publishNotification(message) {
  if (!channel) {
    return Promise.reject(new Error("RabbitMQ channel not available"));
  }

  return new Promise((resolve, reject) => {
    channel.sendToQueue(
      config.rabbitmq.notificationQueue,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        messageId: message.orderId,
        // AMQP có sẵn ô correlationId — dùng đúng chỗ tiêu chuẩn của nó.
        correlationId: getCorrelationId(),
      },
      (err) => {
        if (err) return reject(err);
        logger.info(
          { orderId: message.orderId },
          "Notification queued to RabbitMQ"
        );
        resolve();
      }
    );
  });
}

async function disconnect() {
  if (channel) await channel.close();
  if (connection) await connection.close();
  channel = null;
  connection = null;
}

module.exports = { connect, disconnect, publishNotification };
