const saga = require("../sagas/create-order.saga");
const orderRepository = require("../repositories/order.repository");

// Application service: điều phối nghiệp vụ order.
async function createOrder(input) {
  return saga.execute(input);
}

async function getOrder(id) {
  return orderRepository.findById(id);
}

module.exports = { createOrder, getOrder };
