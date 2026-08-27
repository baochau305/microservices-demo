const express = require("express");
const paymentClient = require("../clients/payment.client");
const asyncHandler = require("../utils/async-handler");

const router = express.Router();

// Payment được kích hoạt bên trong Saga của order. Gateway chỉ expose tra cứu.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const payment = await paymentClient.getPayment(req.params.id);
    res.json(payment);
  })
);

module.exports = router;
