const pool = require("../db/pool");

const OrderRepository = {
  async create(order) {
    const q = `
      INSERT INTO orders
        (id, user_id, product_id, quantity, total_price, user_name, user_email, product_name, payment_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id::text, user_id, product_id, quantity, total_price,
                user_name, user_email, product_name, payment_id, status, created_at`;
    const { rows } = await pool.query(q, [
      order.id,
      order.userId,
      order.productId,
      order.quantity,
      order.totalPrice,
      order.userName,
      order.userEmail,
      order.productName,
      order.paymentId,
      order.status,
    ]);
    return rows[0];
  },

  /**
   * Đổi trạng thái order. Dùng cho compensation của saga (CONFIRMED -> CANCELLED).
   * Trả về null nếu không tìm thấy row nào để caller biết compensation không ăn.
   */
  async updateStatus(id, status) {
    const q = `
      UPDATE orders SET status = $2
      WHERE id::text = $1
      RETURNING id::text, user_id, product_id, quantity, total_price,
                user_name, user_email, product_name, payment_id, status, created_at`;
    const { rows } = await pool.query(q, [id, status]);
    return rows[0] || null;
  },

  async findById(id) {
    const q = `
      SELECT id::text, user_id, product_id, quantity, total_price,
             user_name, user_email, product_name, payment_id, status, created_at
      FROM orders WHERE id::text = $1`;
    const { rows } = await pool.query(q, [id]);
    return rows[0] || null;
  },
};

module.exports = OrderRepository;
