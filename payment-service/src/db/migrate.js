const pool = require("./pool");

// Schema cho payment-service. Idempotent (IF NOT EXISTS).
const SCHEMA = `
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       TEXT NOT NULL,
  user_id        TEXT NOT NULL,
  amount         NUMERIC(12, 2) NOT NULL,
  method         TEXT NOT NULL,
  status         TEXT NOT NULL,
  transaction_id TEXT,
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  refunded_at    TIMESTAMPTZ
);

-- Semantic lock cho Saga compensation.
--
-- Khi order-service gọi RefundByOrderId mà charge tương ứng VẪN ĐANG BAY (vd
-- ProcessPayment bị DEADLINE_EXCEEDED nhưng payment-service còn đang xử lý),
-- sẽ không có row payment nào để refund. Nếu chỉ refund "cái đang có" thì charge
-- về sau sẽ ghi SUCCESS và nằm lại vĩnh viễn -> mất tiền.
--
-- Vì vậy compensation ghi lại Ý ĐỊNH hoàn tiền vào bảng này. ProcessPayment
-- kiểm tra bảng này trước khi commit: nếu đã có ý định refund thì ghi thẳng
-- trạng thái REFUNDED thay vì SUCCESS.
CREATE TABLE IF NOT EXISTS refund_intents (
  order_id     TEXT PRIMARY KEY,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function migrate() {
  await pool.query(SCHEMA);
}

module.exports = migrate;
