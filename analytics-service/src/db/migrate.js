const pool = require("./pool");

// Lưu từng order event để tính metrics bằng SQL aggregate.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS order_metrics (
  id          BIGSERIAL PRIMARY KEY,
  order_id    TEXT,
  user_id     TEXT,
  product_name TEXT,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status      TEXT NOT NULL,           -- CREATED | FAILED
  event_time  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_metrics_status ON order_metrics (status);
`;

async function migrate() {
  await pool.query(SCHEMA);
}

module.exports = migrate;
