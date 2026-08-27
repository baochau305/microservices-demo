const grpc = require("@grpc/grpc-js");
const { loadProto } = require("../proto/loader");
const { createCaller } = require("./deadline");
const config = require("../config");

const paymentProto = loadProto("payment.proto", "payment");
const client = new paymentProto.PaymentService(
  config.services.payment,
  grpc.credentials.createInsecure()
);

const call = createCaller(client);

module.exports = {
  getPayment: (id) => call("GetPayment", { id }),
};
