const grpc = require("@grpc/grpc-js");
const { loadProto } = require("../proto/loader");
const { deadline } = require("./deadline");
const { correlationMetadata } = require("../context/grpc");
const config = require("../config");

const userProto = loadProto("user.proto", "user");
const client = new userProto.UserService(
  config.services.user,
  grpc.credentials.createInsecure()
);

function getUser(id) {
  return new Promise((resolve, reject) => {
    client.GetUser(
      { id },
      correlationMetadata(),
      { deadline: deadline(config.grpcTimeouts.default) },
      (err, response) => (err ? reject(err) : resolve(response))
    );
  });
}

module.exports = { getUser };
