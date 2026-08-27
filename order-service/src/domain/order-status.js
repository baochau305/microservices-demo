/**
 * Các trạng thái hợp lệ của một order.
 *
 * CONFIRMED : saga chạy xong, đã thanh toán và lưu thành công.
 * CANCELLED : saga lỗi sau khi order đã được lưu -> compensation đã huỷ đơn
 *             (kèm refund payment nếu đã charge).
 */
const ORDER_STATUS = Object.freeze({
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
});

module.exports = { ORDER_STATUS };
