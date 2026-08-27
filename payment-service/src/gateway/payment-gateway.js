const config = require("../config");

// Giả lập một payment gateway bên ngoài: có độ trễ mạng và tỉ lệ lỗi ngẫu nhiên.
async function charge(orderId, amount) {
  // Mô phỏng độ trễ mạng 0-2s.
  const delay = Math.random() * 2000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Mô phỏng tỉ lệ thất bại để demo retry.
  if (Math.random() < config.payment.failureRate) {
    throw new Error("Payment gateway timeout or declined");
  }

  return {
    transactionId: `TXN-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`,
  };
}

module.exports = { charge };
