const grpc = require("@grpc/grpc-js");
const { loadProto } = require("../proto/loader");
const { createCaller } = require("./deadline");
const config = require("../config");

const userProto = loadProto("user.proto", "user");
const client = new userProto.UserService(
  config.services.user,
  grpc.credentials.createInsecure()
);

const call = createCaller(client);

module.exports = {
  getUser: (id) => call("GetUser", { id }),
  createUser: ({ name, email }) => call("CreateUser", { name, email }),
};
