const pool = require("../db/pool");

const AnalyticsRepository = {
  async recordOrderCreated(order) {
    const q = `
      INSERT INTO order_metrics (order_id, user_id, product_name, total_price, status)
      VALUES ($1, $2, $3, $4, 'CREATED')`;
    await pool.query(q, [
      order.id,
      order.userId,
      order.productName || null,
      order.totalPrice || 0,
    ]);
  },

  async recordOrderFailed(data) {
    const q = `INSERT INTO order_metrics (order_id, status) VALUES ($1, 'FAILED')`;
    await pool.query(q, [data.id]);
  },

  async getSummary() {
    const q = `
      SELECT
        COUNT(*)                                              AS total_orders,
        COUNT(*) FILTER (WHERE status = 'CREATED')            AS successful_orders,
        COUNT(*) FILTER (WHERE status = 'FAILED')             AS failed_orders,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'CREATED'), 0) AS total_revenue
      FROM order_metrics`;
    const { rows } = await pool.query(q);
    return rows[0];
  },

  async getTopProducts(limit = 5) {
    const q = `
      SELECT product_name, COUNT(*) AS orders
      FROM order_metrics
      WHERE status = 'CREATED' AND product_name IS NOT NULL
      GROUP BY product_name
      ORDER BY orders DESC
      LIMIT $1`;
    const { rows } = await pool.query(q, [limit]);
    return rows;
  },
};

module.exports = AnalyticsRepository;
