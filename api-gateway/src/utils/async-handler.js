// Bọc async route handler để tự forward lỗi sang error middleware.
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
