const grpc = require("@grpc/grpc-js");
const { loadProto } = require("./proto/loader");
const config = require("./config");
const logger = require("./logger");
const migrate = require("./db/migrate");
const pool = require("./db/pool");
const handler = require("./handlers/payment.handler");
const { withCorrelation } = require("./context/grpc");

async function start() {
  await migrate();
  logger.info("Database schema ready");

  const paymentProto = loadProto("payment.proto", "payment");
  const server = new grpc.Server();

  // withCorrelation: chạy handler trong ngữ cảnh correlationId của caller.
  server.addService(paymentProto.PaymentService.service, {
    processPayment: withCorrelation(handler.processPayment),
    getPayment: withCorrelation(handler.getPayment),
    refundPayment: withCorrelation(handler.refundPayment),
    refundByOrderId: withCorrelation(handler.refundByOrderId),
  });

  const addr = `${config.grpc.host}:${config.grpc.port}`;
  await new Promise((resolve, reject) => {
    server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  logger.info({ addr }, "Payment Service gRPC server listening");
  setupGracefulShutdown(server);
}

function setupGracefulShutdown(server) {
  const shutdown = (signal) => {
    logger.info({ signal }, "Shutting down gracefully");
    server.tryShutdown(async () => {
      await pool.end();
      logger.info("Shutdown complete");
      process.exit(0);
    });
    // Buộc thoát nếu shutdown quá lâu.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = { start };
