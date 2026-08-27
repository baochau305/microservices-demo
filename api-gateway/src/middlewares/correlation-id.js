const {
  CORRELATION_HEADER,
  newCorrelationId,
  runWithCorrelationId,
} = require("../context");

/**
 * Điểm khởi sinh của correlation ID cho toàn hệ thống.
 *
 * Tôn trọng id có sẵn trên request (để client hoặc load balancer phía trước nối
 * được trace của họ vào), nếu không thì sinh mới. Trả lại qua response header
 * để người gọi biết mà tra log.
 *
 * Phải đặt TRƯỚC request-logger, nếu không dòng log của chính request đó sẽ
 * thiếu correlationId.
 */
module.exports = (req, res, next) => {
  const incoming = req.headers[CORRELATION_HEADER];
  const correlationId = (Array.isArray(incoming) ? incoming[0] : incoming) || newCorrelationId();

  runWithCorrelationId(correlationId, () => {
    res.setHeader(CORRELATION_HEADER, correlationId);
    next();
  });
};
