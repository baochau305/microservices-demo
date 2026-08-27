const grpc = require("@grpc/grpc-js");
const { loadProto } = require("../proto/loader");
const { createCaller } = require("./deadline");
const config = require("../config");

const orderProto = loadProto("order.proto", "order");
const client = new orderProto.OrderService(
  config.services.order,
  grpc.credentials.createInsecure()
);

const call = createCaller(client);

module.exports = {
  // CreateOrder chạy cả Saga bên trong -> dùng ngân sách thời gian riêng, rộng hơn.
  createOrder: ({ userId, productId, quantity }) =>
    call(
      "CreateOrder",
      { userId, productId, quantity },
      config.grpcTimeouts.createOrder
    ),
  getOrder: (id) => call("GetOrder", { id }),
};
