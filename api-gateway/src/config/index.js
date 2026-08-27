const path = require("path");

// Cấu hình tập trung cho API Gateway.
const config = {
  serviceName: "api-gateway",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  port: parseInt(process.env.GATEWAY_PORT || "3000", 10),
  protoDir: process.env.PROTO_DIR || path.resolve(__dirname, "../../../proto"),
  services: {
    user: process.env.USER_SERVICE_URL || "localhost:50051",
    product: process.env.PRODUCT_SERVICE_URL || "localhost:50052",
    order: process.env.ORDER_SERVICE_URL || "localhost:50053",
    payment: process.env.PAYMENT_SERVICE_URL || "localhost:50054",
  },
  // Deadline cho gRPC call đi ra. Hết deadline -> DEADLINE_EXCEEDED -> HTTP 504.
  grpcTimeouts: {
    // CRUD đơn giản: user, product, payment, GetOrder.
    default: parseInt(process.env.GRPC_TIMEOUT_MS || "5000", 10),

    // CreateOrder chạy cả Saga bên trong order-service nên cần ngân sách RẤT rộng.
    //
    // Lưu ý: gRPC huỷ call ở phía client khi hết deadline, nhưng handler Node ở
    // order-service VẪN chạy tiếp tới cùng. Nếu deadline này ngắn hơn thời gian
    // saga, gateway sẽ trả 504 trong khi order thực tế vẫn được tạo (hoặc đang
    // rollback dở) -> client hiểu sai trạng thái. Vì vậy phải >= worst case:
    //   user(5s) + product(5s) + payment(15s) + compensation refund(15s) + dư
    createOrder: parseInt(
      process.env.GRPC_CREATE_ORDER_TIMEOUT_MS || "45000",
      10
    ),
  },
};

function validate() {
  for (const [name, ms] of Object.entries(config.grpcTimeouts)) {
    if (!Number.isFinite(ms) || ms <= 0) {
      throw new Error(`gRPC timeout "${name}" must be a positive number, got: ${ms}`);
    }
  }
}

validate();

module.exports = config;
