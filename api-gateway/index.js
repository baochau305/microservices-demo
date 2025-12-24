const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(bodyParser.json());

// Load proto files
const USER_PROTO_PATH = path.join(__dirname, "../proto/user.proto");
const PRODUCT_PROTO_PATH = path.join(__dirname, "../proto/product.proto");
const ORDER_PROTO_PATH = path.join(__dirname, "../proto/order.proto");

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

const orderPackageDefinition = protoLoader.loadSync(ORDER_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userProto = grpc.loadPackageDefinition(userPackageDefinition).user;
const productProto = grpc.loadPackageDefinition(
  productPackageDefinition
).product;
const orderProto = grpc.loadPackageDefinition(orderPackageDefinition).order;

// gRPC clients with environment variable support
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "localhost:50051";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "localhost:50052";
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "localhost:50053";

const userClient = new userProto.UserService(
  USER_SERVICE_URL,
  grpc.credentials.createInsecure()
);

const productClient = new productProto.ProductService(
  PRODUCT_SERVICE_URL,
  grpc.credentials.createInsecure()
);

const orderClient = new orderProto.OrderService(
  ORDER_SERVICE_URL,
  grpc.credentials.createInsecure()
);

// ===== USER ROUTES =====
app.post("/api/users", (req, res) => {
  const { name, email } = req.body;

  userClient.CreateUser({ name, email }, (err, response) => {
    if (err) {
      console.error("Error creating user:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

app.get("/api/users/:id", (req, res) => {
  const { id } = req.params;

  userClient.GetUser({ id }, (err, response) => {
    if (err) {
      console.error("Error getting user:", err);
      return res.status(404).json({ error: err.message });
    }
    res.json(response);
  });
});

// ===== PRODUCT ROUTES =====
app.post("/api/products", (req, res) => {
  const { name, price } = req.body;

  productClient.CreateProduct({ name, price }, (err, response) => {
    if (err) {
      console.error("Error creating product:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

app.get("/api/products/:id", (req, res) => {
  const { id } = req.params;

  productClient.GetProduct({ id }, (err, response) => {
    if (err) {
      console.error("Error getting product:", err);
      return res.status(404).json({ error: err.message });
    }
    res.json(response);
  });
});

// ===== ORDER ROUTES =====
app.post("/api/orders", (req, res) => {
  const { userId, productId, quantity } = req.body;

  orderClient.CreateOrder({ userId, productId, quantity }, (err, response) => {
    if (err) {
      console.error("Error creating order:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

app.get("/api/orders/:id", (req, res) => {
  const { id } = req.params;

  orderClient.GetOrder({ id }, (err, response) => {
    if (err) {
      console.error("Error getting order:", err);
      return res.status(404).json({ error: err.message });
    }
    res.json(response);
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "API Gateway is running" });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API Gateway is running on http://localhost:${PORT}`);
  console.log("Available endpoints:");
  console.log("  POST /api/users - Create user");
  console.log("  GET  /api/users/:id - Get user");
  console.log("  POST /api/products - Create product");
  console.log("  GET  /api/products/:id - Get product");
  console.log("  POST /api/orders - Create order");
  console.log("  GET  /api/orders/:id - Get order");
});
