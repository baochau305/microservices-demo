const grpc = require("@grpc/grpc-js");
const service = require("../services/order.service");
const logger = require("../logger");

async function createOrder(call, callback) {
  const { userId, productId, quantity } = call.request;
  logger.info({ userId, productId, quantity }, "CreateOrder called");

  if (!userId || !productId || !quantity || quantity <= 0) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: "userId, productId and a positive quantity are required",
    });
  }

  try {
    const order = await service.createOrder({ userId, productId, quantity });
    callback(null, toResponse(order));
  } catch (err) {
    logger.error({ err: err.message }, "CreateOrder failed");
    callback({
      code: grpc.status.INTERNAL,
      message: `Failed to create order: ${err.message}`,
    });
  }
}

async function getOrder(call, callback) {
  const { id } = call.request;
  logger.info({ id }, "GetOrder called");

  try {
    const order = await service.getOrder(id);
    if (!order) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Order not found: ${id}`,
      });
    }
    callback(null, toResponse(order));
  } catch (err) {
    logger.error({ err: err.message }, "GetOrder failed");
    callback({ code: grpc.status.INTERNAL, message: "internal error" });
  }
}

// Map dòng DB sang OrderResponse (theo order.proto).
function toResponse(order) {
  return {
    id: order.id,
    userId: order.user_id,
    productId: order.product_id,
    quantity: order.quantity,
    totalPrice: Number(order.total_price),
    userName: order.user_name,
    productName: order.product_name,
  };
}

module.exports = { createOrder, getOrder };
