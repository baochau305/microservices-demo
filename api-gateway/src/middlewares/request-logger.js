const logger = require("../logger");

// Log mỗi HTTP request kèm status code và thời gian xử lý.
module.exports = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - start,
      },
      "request"
    );
  });
  next();
};
