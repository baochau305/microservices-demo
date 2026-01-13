const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { Kafka } = require("kafkajs");
const amqp = require("amqplib");

// Load proto files
const ORDER_PROTO_PATH = path.join(__dirname, "../proto/order.proto");
const USER_PROTO_PATH = path.join(__dirname, "../proto/user.proto");
const PRODUCT_PROTO_PATH = path.join(__dirname, "../proto/product.proto");
const PAYMENT_PROTO_PATH = path.join(__dirname, "../proto/payment.proto");

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

const paymentPackageDefinition = protoLoader.loadSync(PAYMENT_PROTO_PATH, {
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
const paymentProto = grpc.loadPackageDefinition(
  paymentPackageDefinition
).payment;

// gRPC clients to other services with environment variable support
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "localhost:50051";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "localhost:50052";
const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "localhost:50054";

const userClient = new userProto.UserService(
  USER_SERVICE_URL,
  grpc.credentials.createInsecure()
);

const productClient = new productProto.ProductService(
  PRODUCT_SERVICE_URL,
  grpc.credentials.createInsecure()
);

const paymentClient = new paymentProto.PaymentService(
  PAYMENT_SERVICE_URL,
  grpc.credentials.createInsecure()
);

// Kafka setup
const kafka = new Kafka({
  clientId: "order-service",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "order-service-group" });

// RabbitMQ setup
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const NOTIFICATION_QUEUE = "order_notifications";
let rabbitChannel = null;

// In-memory storage
const orders = new Map();
let nextId = 1;

// Saga orchestration state
const sagaStates = new Map();

// ===== Kafka & RabbitMQ Connection =====
async function connectMessageBrokers() {
  try {
    // Connect to Kafka
    console.log("Connecting to Kafka...");
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: "order-events", fromBeginning: false });
    console.log("✅ Connected to Kafka");

    // Connect to RabbitMQ
    console.log("Connecting to RabbitMQ...");
    const rabbitConnection = await amqp.connect(RABBITMQ_URL);
    rabbitChannel = await rabbitConnection.createChannel();
    await rabbitChannel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
    console.log("✅ Connected to RabbitMQ");

    // Handle errors
    consumer.on("consumer.crash", (event) => {
      console.error("Kafka consumer crashed:", event);
    });

    rabbitConnection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err);
    });
  } catch (error) {
    console.error("Failed to connect to message brokers:", error.message);
    console.log("Retrying in 5 seconds...");
    setTimeout(connectMessageBrokers, 5000);
  }
}

// ===== Kafka Event Publishing =====
async function publishOrderEvent(eventType, orderData) {
  try {
    await producer.send({
      topic: "order-events",
      messages: [
        {
          key: orderData.id,
          value: JSON.stringify({
            eventType,
            timestamp: new Date().toISOString(),
            data: orderData,
          }),
          headers: {
            "event-type": eventType,
            "correlation-id": orderData.id,
          },
        },
      ],
    });
    console.log(`📤 Kafka event published: ${eventType}`);
  } catch (error) {
    console.error("Failed to publish Kafka event:", error.message);
  }
}

// ===== RabbitMQ Notification Publishing =====
async function publishNotification(orderData) {
  try {
    if (!rabbitChannel) {
      console.warn("RabbitMQ channel not available");
      return;
    }

    const message = {
      orderId: orderData.id,
      userName: orderData.userName,
      userEmail: orderData.userEmail || "customer@example.com",
      productName: orderData.productName,
      quantity: orderData.quantity,
      totalPrice: orderData.totalPrice,
      timestamp: new Date().toISOString(),
    };

    rabbitChannel.sendToQueue(
      NOTIFICATION_QUEUE,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        messageId: orderData.id,
      }
    );

    console.log("📨 Notification queued to RabbitMQ");
  } catch (error) {
    console.error("Failed to publish notification:", error.message);
  }
}

// ===== SAGA ORCHESTRATION =====
async function executeSaga(orderId, userId, productId, quantity) {
  const sagaId = orderId;
  const saga = {
    id: sagaId,
    status: "STARTED",
    steps: [],
    compensations: [],
  };
  sagaStates.set(sagaId, saga);

  try {
    console.log("\n🔄 Starting Saga for order:", orderId);

    // Step 1: Get User Info
    console.log("📍 Saga Step 1: Get User Info");
    const user = await new Promise((resolve, reject) => {
      userClient.GetUser({ id: userId }, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
    saga.steps.push({ step: "GET_USER", status: "SUCCESS", data: user });
    console.log("✅ User retrieved:", user.email);

    // Step 2: Get Product Info
    console.log("📍 Saga Step 2: Get Product Info");
    const product = await new Promise((resolve, reject) => {
      productClient.GetProduct({ id: productId }, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
    saga.steps.push({ step: "GET_PRODUCT", status: "SUCCESS", data: product });
    console.log("✅ Product retrieved:", product.name);

    // Step 3: Process Payment
    console.log("📍 Saga Step 3: Process Payment");
    const totalPrice = product.price * quantity;
    const paymentResponse = await new Promise((resolve, reject) => {
      paymentClient.ProcessPayment(
        {
          orderId,
          userId,
          amount: totalPrice,
          method: "CREDIT_CARD",
        },
        (err, response) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });

    if (paymentResponse.status !== "SUCCESS") {
      throw new Error(`Payment failed: ${paymentResponse.message}`);
    }

    saga.steps.push({
      step: "PROCESS_PAYMENT",
      status: "SUCCESS",
      data: paymentResponse,
    });
    saga.compensations.push({
      action: "REFUND_PAYMENT",
      paymentId: paymentResponse.id,
    });
    console.log("✅ Payment processed:", paymentResponse.transactionId);

    // Step 4: Create Order
    console.log("📍 Saga Step 4: Create Order");
    const order = {
      id: orderId,
      userId,
      productId,
      quantity,
      totalPrice,
      userName: user.name || "Customer",
      userEmail: user.email,
      productName: product.name,
      paymentId: paymentResponse.id,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
    };

    orders.set(orderId, order);
    saga.steps.push({ step: "CREATE_ORDER", status: "SUCCESS", data: order });
    console.log("✅ Order created:", orderId);

    // Step 5: Publish Events
    console.log("📍 Saga Step 5: Publish Events");
    await publishOrderEvent("ORDER_CREATED", order);
    await publishNotification(order);
    saga.steps.push({ step: "PUBLISH_EVENTS", status: "SUCCESS" });

    saga.status = "COMPLETED";
    console.log("✅ Saga completed successfully\n");

    return order;
  } catch (error) {
    console.error("❌ Saga failed:", error.message);
    saga.status = "FAILED";
    saga.error = error.message;

    // Execute compensation (rollback)
    await compensateSaga(saga);

    throw error;
  }
}

// ===== SAGA COMPENSATION (Rollback) =====
async function compensateSaga(saga) {
  console.log("\n⚠️ Executing Saga Compensation (Rollback)");

  // Execute compensations in reverse order
  for (let i = saga.compensations.length - 1; i >= 0; i--) {
    const compensation = saga.compensations[i];

    try {
      if (compensation.action === "REFUND_PAYMENT") {
        console.log("💸 Refunding payment:", compensation.paymentId);
        await new Promise((resolve, reject) => {
          paymentClient.RefundPayment(
            { paymentId: compensation.paymentId },
            (err, response) => {
              if (err) reject(err);
              else resolve(response);
            }
          );
        });
        console.log("✅ Payment refunded");
      }
    } catch (error) {
      console.error("Failed to execute compensation:", error.message);
    }
  }

  // Publish compensation event
  await publishOrderEvent("ORDER_FAILED", {
    id: saga.id,
    error: saga.error,
  });

  console.log("✅ Compensation completed\n");
}

// ===== ORDER SERVICE IMPLEMENTATION =====
async function createOrder(call, callback) {
  const { userId, productId, quantity } = call.request;
  const orderId = String(nextId++);

  console.log("\n📦 CreateOrder called:", {
    orderId,
    userId,
    productId,
    quantity,
  });

  try {
    const order = await executeSaga(orderId, userId, productId, quantity);
    callback(null, order);
  } catch (error) {
    console.error("Order creation failed:", error.message);
    callback({
      code: grpc.status.INTERNAL,
      message: `Failed to create order: ${error.message}`,
    });
  }
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

// ===== START SERVER =====
async function main() {
  // Connect to message brokers first
  await connectMessageBrokers();

  // Start gRPC server
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
      console.log("📦 Order Service is running on port 50053...");
      console.log("Features:");
      console.log("  ✅ Saga Pattern for distributed transactions");
      console.log("  ✅ Kafka for event streaming");
      console.log("  ✅ RabbitMQ for async notifications");
      console.log("  ✅ Automatic compensation on failure\n");
    }
  );
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await producer.disconnect();
  await consumer.disconnect();
  if (rabbitChannel) await rabbitChannel.close();
  process.exit(0);
});

main().catch(console.error);
