const grpc = require("@grpc/grpc-js");

// Map gRPC status code -> HTTP status code.
const GRPC_TO_HTTP = {
  [grpc.status.OK]: 200,
  [grpc.status.INVALID_ARGUMENT]: 400,
  [grpc.status.FAILED_PRECONDITION]: 400,
  [grpc.status.OUT_OF_RANGE]: 400,
  [grpc.status.UNAUTHENTICATED]: 401,
  [grpc.status.PERMISSION_DENIED]: 403,
  [grpc.status.NOT_FOUND]: 404,
  [grpc.status.ALREADY_EXISTS]: 409,
  [grpc.status.ABORTED]: 409,
  [grpc.status.RESOURCE_EXHAUSTED]: 429,
  [grpc.status.UNIMPLEMENTED]: 501,
  [grpc.status.UNAVAILABLE]: 503,
  [grpc.status.DEADLINE_EXCEEDED]: 504,
};

function grpcToHttpStatus(code) {
  return GRPC_TO_HTTP[code] || 500;
}

module.exports = { grpcToHttpStatus };
