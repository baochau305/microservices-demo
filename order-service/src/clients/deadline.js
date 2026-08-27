/**
 * Tạo deadline tuyệt đối cho một gRPC call.
 *
 * gRPC dùng deadline (mốc thời gian) chứ không phải timeout (khoảng thời gian),
 * và deadline được truyền xuống downstream qua header `grpc-timeout` — nhờ vậy
 * cả chuỗi call chia sẻ chung một ngân sách thời gian.
 */
function deadline(ms) {
  return new Date(Date.now() + ms);
}

module.exports = { deadline };
