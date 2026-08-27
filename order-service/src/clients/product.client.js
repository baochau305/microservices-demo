const grpc = require("@grpc/grpc-js");
const { loadProto } = require("../proto/loader");
const { deadline } = require("./deadline");
const { correlationMetadata } = require("../context/grpc");
const config = require("../config");

const productProto = loadProto("product.proto", "product");
const client = new productProto.ProductService(
  config.services.product,
  grpc.credentials.createInsecure()
);

function getProduct(id) {
  return new Promise((resolve, reject) => {
    client.GetProduct(
      { id },
      correlationMetadata(),
      { deadline: deadline(config.grpcTimeouts.default) },
      (err, response) => (err ? reject(err) : resolve(response))
    );
  });
}

module.exports = { getProduct };
