const { grpcToHttpStatus } = require("../utils/grpc-error");
const logger = require("../logger");

// Error middleware tập trung: chuyển lỗi gRPC từ upstream service thành HTTP response.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Lỗi gRPC có `code` dạng number.
  if (err && typeof err.code === "number") {
    const httpStatus = grpcToHttpStatus(err.code);
    const message = err.details || err.message || "Upstream service error";
    logger.warn(
      { path: req.originalUrl, grpcCode: err.code, httpStatus, err: message },
      "Upstream gRPC error"
    );
    return res.status(httpStatus).json({ error: message });
  }

  logger.error(
    { path: req.originalUrl, err: err.message },
    "Unhandled gateway error"
  );
  res.status(500).json({ error: "Internal server error" });
}

module.exports = errorHandler;
