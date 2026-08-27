const pino = require("pino");
const config = require("../config");
const { getCorrelationId } = require("../context");

// Structured JSON logger. Production-friendly (parse được bởi ELK/Loki...).
const logger = pino({
  level: config.logLevel,
  base: { service: config.serviceName },
  // Mọi dòng log tự mang correlationId của ngữ cảnh đang chạy — không phải
  // truyền tay qua từng hàm, và không thể quên.
  mixin() {
    const correlationId = getCorrelationId();
    return correlationId ? { correlationId } : {};
  },
});

module.exports = logger;
