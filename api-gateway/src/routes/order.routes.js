const express = require("express");
const orderClient = require("../clients/order.client");
const asyncHandler = require("../utils/async-handler");
const { validateBody } = require("../middlewares/validate");

const router = express.Router();

router.post(
  "/",
  validateBody(["userId", "productId", "quantity"]),
  asyncHandler(async (req, res) => {
    const { userId, productId, quantity } = req.body;
    const order = await orderClient.createOrder({
      userId,
      productId,
      quantity: Number(quantity),
    });
    res.status(201).json(order);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await orderClient.getOrder(req.params.id);
    res.json(order);
  })
);

module.exports = router;
