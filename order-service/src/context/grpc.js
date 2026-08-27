const grpc = require("@grpc/grpc-js");
const {
  CORRELATION_HEADER,
  runWithCorrelationId,
  getCorrelationId,
} = require("./index");

/**
 * Metadata kèm correlationId để gửi cho service downstream.
 * gRPC metadata chính là chỗ chuẩn để truyền thông tin dạng "header" như thế này.
 */
function correlationMetadata() {
  const metadata = new grpc.Metadata();
  const correlationId = getCorrelationId();
  if (correlationId) metadata.set(CORRELATION_HEADER, correlationId);
  return metadata;
}

/**
 * Bọc một gRPC handler: lấy correlationId từ metadata của caller rồi chạy
 * handler trong ngữ cảnh đó. Nhờ vậy mọi log bên trong handler — kể cả log ở
 * repository hay saga sâu bên dưới — đều tự mang đúng id.
 *
 * Không có metadata (vd gọi thẳng bằng grpcurl) thì tự sinh id mới, để mọi
 * request luôn truy vết được.
 */
function withCorrelation(handler) {
  return (call, callback) => {
    const incoming = call.metadata?.get(CORRELATION_HEADER)?.[0];
    return runWithCorrelationId(incoming ? String(incoming) : undefined, () =>
      handler(call, callback)
    );
  };
}

module.exports = { correlationMetadata, withCorrelation };
