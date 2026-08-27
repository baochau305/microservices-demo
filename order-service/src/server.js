const grpc = require("@grpc/grpc-js");
const { loadProto } = require("./proto/loader");
const config = require("./config");
const logger = require("./logger");
const migrate = require("./db/migrate");
const pool = require("./db/pool");
const kafkaProducer = require("./messaging/kafka.producer");
const rabbitPublisher = require("./messaging/rabbitmq.publisher");
const handler = require("./handlers/order.handler");
const { withCorrelation } = require("./context/grpc");

async function start() {
  await migrate();
  logger.info("Database schema ready");

  await connectBrokersWithRetry();

  const orderProto = loadProto("order.proto", "order");
  const server = new grpc.Server();

  // withCorrelation: lấy correlationId từ metadata của caller và chạy handler
  // trong ngữ cảnh đó -> mọi log bên trong (saga, repository, client...) tự mang id.
  server.addService(orderProto.OrderService.service, {
    createOrder: withCorrelation(handler.createOrder),
    getOrder: withCorrelation(handler.getOrder),
  });

  const addr = `${config.grpc.host}:${config.grpc.port}`;
  await new Promise((resolve, reject) => {
    server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err) =>
      err ? reject(err) : resolve()
    );
  });

  logger.info({ addr }, "Order Service gRPC server listening");
  logger.info(
    "Features: Saga orchestration, Kafka events, RabbitMQ notifications, auto compensation"
  );
  setupGracefulShutdown(server);
}

async function connectBrokersWithRetry() {
  try {
    await kafkaProducer.connect();
    await rabbitPublisher.connect();
  } catch (err) {
    logger.error(
      { err: err.message },
      "Failed to connect to message brokers; retrying in 5s"
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectBrokersWithRetry();
  }
}

function setupGracefulShutdown(server) {
  const shutdown = (signal) => {
    logger.info({ signal }, "Shutting down gracefully");
    server.tryShutdown(async () => {
      try {
        await kafkaProducer.disconnect();
        await rabbitPublisher.disconnect();
        await pool.end();
      } catch (err) {
        logger.error({ err: err.message }, "Error during shutdown");
      }
      logger.info("Shutdown complete");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = { start };
