const pool = require("./pool");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  product_id   TEXT NOT NULL,
  quantity     INT NOT NULL,
  total_price  NUMERIC(12, 2) NOT NULL,
  user_name    TEXT,
  user_email   TEXT,
  product_name TEXT,
  payment_id   TEXT,
  status       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function migrate() {
  await pool.query(SCHEMA);
}

module.exports = migrate;
