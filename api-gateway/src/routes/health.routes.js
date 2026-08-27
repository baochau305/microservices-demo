const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ status: "OK", service: "api-gateway" });
});

module.exports = router;
