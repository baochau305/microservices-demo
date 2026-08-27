const express = require("express");
const userClient = require("../clients/user.client");
const asyncHandler = require("../utils/async-handler");
const { validateBody } = require("../middlewares/validate");

const router = express.Router();

router.post(
  "/",
  validateBody(["name", "email"]),
  asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    const user = await userClient.createUser({ name, email });
    res.status(201).json(user);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await userClient.getUser(req.params.id);
    res.json(user);
  })
);

module.exports = router;
