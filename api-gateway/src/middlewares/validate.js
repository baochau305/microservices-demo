// Validation middleware đơn giản: kiểm tra các field bắt buộc trong body.
function validateBody(requiredFields) {
  return (req, res, next) => {
    const body = req.body || {};
    const missing = requiredFields.filter(
      (field) =>
        body[field] === undefined || body[field] === null || body[field] === ""
    );

    if (missing.length > 0) {
      return res
        .status(400)
        .json({ error: `Missing required fields: ${missing.join(", ")}` });
    }
    next();
  };
}

module.exports = { validateBody };
