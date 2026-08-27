const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const config = require("../config");

const LOADER_OPTIONS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

function loadProto(fileName, packageName) {
  const protoPath = path.join(config.protoDir, fileName);
  const packageDefinition = protoLoader.loadSync(protoPath, LOADER_OPTIONS);
  return grpc.loadPackageDefinition(packageDefinition)[packageName];
}

module.exports = { loadProto };
