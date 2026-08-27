const config = require("../config");
const { correlationMetadata } = require("../context/grpc");

/**
 * Tạo hàm gọi gRPC đã promisify, luôn kèm deadline.
 *
 * gRPC dùng deadline (mốc thời gian tuyệt đối) chứ không phải timeout, và nó
 * được gửi kèm qua header `grpc-timeout` để downstream biết còn bao nhiêu thời
 * gian. Không đặt deadline thì call sẽ treo vĩnh viễn khi service đích không
 * phản hồi (khác với việc service chết hẳn — lúc đó mới có UNAVAILABLE ngay).
 */
function createCaller(client) {
  return (method, payload, timeoutMs = config.grpcTimeouts.default) =>
    new Promise((resolve, reject) => {
      client[method](
        payload,
        // Truyền correlationId xuống downstream qua gRPC metadata.
        correlationMetadata(),
        { deadline: new Date(Date.now() + timeoutMs) },
        (err, response) => (err ? reject(err) : resolve(response))
      );
    });
}

module.exports = { createCaller };
