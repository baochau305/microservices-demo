const emailService = require("../services/email.service");

// Business logic xử lý một message notification.
async function process(content) {
  if (!content) {
    throw new Error("Invalid message payload");
  }
  await emailService.sendOrderConfirmation(content);
}

module.exports = { process };
