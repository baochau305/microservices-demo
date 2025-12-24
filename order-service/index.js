const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// Load proto files
const ORDER_PROTO_PATH = path.join(__dirname, "../proto/order.proto");
const USER_PROTO_PATH = path.join(__dirname, "../proto/user.proto");
const PRODUCT_PROTO_PATH = path.join(__dirname, "../proto/product.proto");

const packageDefinition = protoLoader.loadSync(ORDER_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userPackageDefinition = protoLoader.loadSync(USER_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const productPackageDefinition = protoLoader.loadSync(PRODUCT_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const orderProto = grpc.loadPackageDefinition(packageDefinition).order;
const userProto = grpc.loadPackageDefinition(userPackageDefinition).user;
const productProto = grpc.loadPackageDefinition(
  productPackageDefinition
).product;

// gRPC clients to other services with environment variable support
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "localhost:50051";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "localhost:50052";

const userClient = new userProto.UserService(
  USER_SERVICE_URL,
  grpc.credentials.createInsecure()
);

const productClient = new productProto.ProductService(
  PRODUCT_SERVICE_URL,
  grpc.credentials.createInsecure()
);

// In-memory storage
const orders = new Map();
let nextId = 1;

// Service implementation
function createOrder(call, callback) {
  const { userId, productId, quantity } = call.request;

  console.log("CreateOrder called:", { userId, productId, quantity });

  // Get user info
  userClient.GetUser({ id: userId }, (err, user) => {
    if (err) {
      console.error("Error getting user:", err);
      return callback(err);
    }

    // Get product info
    productClient.GetProduct({ id: productId }, (err, product) => {
      if (err) {
        console.error("Error getting product:", err);
        return callback(err);
      }

      // Create order
      const id = String(nextId++);
      const totalPrice = product.price * quantity;

      const order = {
        id,
        userId,
        productId,
        quantity,
        totalPrice,
        userName: user.name,
        productName: product.name,
      };

      orders.set(id, order);
      console.log("Order created:", order);
      callback(null, order);
    });
  });
}

function getOrder(call, callback) {
  const { id } = call.request;
  console.log("GetOrder called for ID:", id);

  const order = orders.get(id);
  if (!order) {
    return callback({
      code: grpc.status.NOT_FOUND,
      message: `Order not found: ${id}`,
    });
  }

  callback(null, order);
}

// Start gRPC server
function main() {
  const server = new grpc.Server();

  server.addService(orderProto.OrderService.service, {
    createOrder,
    getOrder,
  });

  server.bindAsync(
    "0.0.0.0:50053",
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error("Failed to bind server:", err);
        return;
      }
      console.log("Order Service (Node.js) is running on port 50053...");
    }
  );
}

main();
