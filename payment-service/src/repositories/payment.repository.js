const pool = require("../db/pool");

/**
 * Chạy một hàm trong transaction, có giữ advisory lock theo orderId.
 *
 * Advisory lock là thứ đóng lại race giữa ProcessPayment và RefundByOrderId.
 * Nếu không có nó, hai transaction chạy song song ở mức READ COMMITTED sẽ bị
 * write-skew: bên refund chưa thấy payment (chưa insert xong), bên payment chưa
 * thấy refund intent (chưa commit) -> cả hai cùng commit và tiền bị giữ lại.
 * Lock này ép hai bên xếp hàng theo từng order, nên bên chạy sau luôn thấy
 * kết quả của bên chạy trước.
 */
async function withOrderLock(orderId, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [
      orderId,
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Data access layer cho payments. Toàn bộ SQL gói ở đây.
const PaymentRepository = {
  async create({ orderId, userId, amount, method, status, transactionId, error }) {
    const q = `
      INSERT INTO payments (order_id, user_id, amount, method, status, transaction_id, error)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id::text, order_id, user_id, amount, method, status, transaction_id, error, created_at`;
    const { rows } = await pool.query(q, [
      orderId,
      userId,
      amount,
      method,
      status,
      transactionId || null,
      error || null,
    ]);
    return rows[0];
  },

  async findById(id) {
    const q = `
      SELECT id::text, order_id, user_id, amount, method, status, transaction_id, error, created_at, refunded_at
      FROM payments WHERE id::text = $1`;
    const { rows } = await pool.query(q, [id]);
    return rows[0] || null;
  },

  async findByOrderId(orderId) {
    const q = `
      SELECT id::text, order_id, user_id, amount, method, status, transaction_id, error, created_at, refunded_at
      FROM payments WHERE order_id = $1 ORDER BY created_at`;
    const { rows } = await pool.query(q, [orderId]);
    return rows;
  },

  /**
   * Ghi nhận charge THÀNH CÔNG, nhưng tôn trọng refund intent đã có.
   *
   * Nếu compensation của saga đã chạy trước (vì ProcessPayment bị
   * DEADLINE_EXCEEDED), row được ghi thẳng ở trạng thái REFUNDED thay vì
   * SUCCESS — tiền không bao giờ nằm lại ở trạng thái đã trừ mà không có order.
   */
  async createChargedPayment({ orderId, userId, amount, method, transactionId }) {
    return withOrderLock(orderId, async (client) => {
      const { rows: intents } = await client.query(
        "SELECT 1 FROM refund_intents WHERE order_id = $1",
        [orderId]
      );
      const refundRequested = intents.length > 0;

      const q = `
        INSERT INTO payments (order_id, user_id, amount, method, status, transaction_id, refunded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id::text, order_id, user_id, amount, method, status, transaction_id, error, created_at, refunded_at`;
      const { rows } = await client.query(q, [
        orderId,
        userId,
        amount,
        method,
        refundRequested ? "REFUNDED" : "SUCCESS",
        transactionId || null,
        refundRequested ? new Date() : null,
      ]);

      return { payment: rows[0], refundRequested };
    });
  },

  /**
   * Compensation: ghi nhận ý định hoàn tiền RỒI hoàn mọi payment SUCCESS.
   *
   * Thứ tự này quan trọng. Ghi intent trước nghĩa là một charge đang bay, chưa
   * kịp insert, khi commit sẽ nhìn thấy intent và tự ghi REFUNDED. Còn UPDATE
   * xử lý trường hợp charge đã kịp commit trước đó.
   *
   * Idempotent: ON CONFLICT DO NOTHING + điều kiện status='SUCCESS' trong WHERE
   * nên gọi lại nhiều lần không double-refund.
   */
  async requestRefundByOrderId(orderId) {
    return withOrderLock(orderId, async (client) => {
      await client.query(
        "INSERT INTO refund_intents (order_id) VALUES ($1) ON CONFLICT DO NOTHING",
        [orderId]
      );
      const { rows } = await client.query(
        `UPDATE payments SET status = 'REFUNDED', refunded_at = now()
         WHERE order_id = $1 AND status = 'SUCCESS'
         RETURNING id::text, status`,
        [orderId]
      );
      return rows;
    });
  },

  async markRefunded(id) {
    const q = `
      UPDATE payments SET status = 'REFUNDED', refunded_at = now()
      WHERE id::text = $1
      RETURNING id::text, status`;
    const { rows } = await pool.query(q, [id]);
    return rows[0] || null;
  },
};

module.exports = PaymentRepository;
