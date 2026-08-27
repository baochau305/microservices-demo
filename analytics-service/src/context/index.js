const { AsyncLocalStorage } = require("node:async_hooks");
const crypto = require("crypto");

/**
 * Correlation ID xuyên suốt một request, dùng AsyncLocalStorage.
 *
 * Mục đích: `docker compose logs | grep <id>` ra được TOÀN BỘ đường đi của một
 * order qua cả 6 service. Không có nó, log của từng service là những mảnh rời
 * không ghép lại được.
 *
 * AsyncLocalStorage giữ id theo ngữ cảnh async, nên không phải truyền tay qua
 * từng lớp hàm; logger tự đọc ra qua `mixin` của pino.
 */
const CORRELATION_HEADER = "x-correlation-id";

const storage = new AsyncLocalStorage();

function newCorrelationId() {
  return crypto.randomUUID();
}

/** Chạy `fn` trong ngữ cảnh mang correlationId (tự sinh nếu không truyền vào). */
function runWithCorrelationId(correlationId, fn) {
  return storage.run({ correlationId: correlationId || newCorrelationId() }, fn);
}

/** correlationId của ngữ cảnh hiện tại, hoặc undefined nếu ngoài ngữ cảnh. */
function getCorrelationId() {
  return storage.getStore()?.correlationId;
}

module.exports = {
  CORRELATION_HEADER,
  newCorrelationId,
  runWithCorrelationId,
  getCorrelationId,
};
