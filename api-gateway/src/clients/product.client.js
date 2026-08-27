const grpc = require("@grpc/grpc-js");
const { loadProto } = require("../proto/loader");
const { createCaller } = require("./deadline");
const config = require("../config");

const productProto = loadProto("product.proto", "product");
const client = new productProto.ProductService(
  config.services.product,
  grpc.credentials.createInsecure()
);

const call = createCaller(client);

module.exports = {
  getProduct: (id) => call("GetProduct", { id }),
  createProduct: ({ name, price }) => call("CreateProduct", { name, price }),
};
