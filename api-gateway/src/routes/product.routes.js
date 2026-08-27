const express = require("express");
const productClient = require("../clients/product.client");
const asyncHandler = require("../utils/async-handler");
const { validateBody } = require("../middlewares/validate");

const router = express.Router();

router.post(
  "/",
  validateBody(["name", "price"]),
  asyncHandler(async (req, res) => {
    const { name, price } = req.body;
    const product = await productClient.createProduct({
      name,
      price: Number(price),
    });
    res.status(201).json(product);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await productClient.getProduct(req.params.id);
    res.json(product);
  })
);

module.exports = router;
