const config = require("../config");
const logger = require("../logger");

/**
 * Gửi email xác nhận đơn hàng.
 * Ở demo này chỉ log nội dung; production thay bằng SMTP/SendGrid/SES.
 */
async function sendOrderConfirmation(orderData) {
  const { orderId, userName, userEmail, productName, quantity, totalPrice } =
    orderData;

  // Mô phỏng lỗi tạm thời để demo cơ chế retry và DLQ.
  if (Math.random() < config.email.failureRate) {
    throw new Error("Email provider temporary failure");
  }

  const mail = {
    from: config.email.from,
    to: userEmail,
    subject: `Order Confirmation - #${orderId}`,
    body: `Hi ${userName}, your order ${orderId} (${productName} x${quantity}, total $${totalPrice}) has been confirmed. Thank you!`,
  };

  // Mô phỏng thời gian gửi.
  await new Promise((resolve) => setTimeout(resolve, 100));

  logger.info({ to: mail.to, orderId }, "Order confirmation email sent");
  return mail;
}

module.exports = { sendOrderConfirmation };
