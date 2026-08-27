const createApp = require("./app");
const config = require("./config");
const logger = require("./logger");

function start() {
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, "API Gateway listening");
  });
  setupGracefulShutdown(server);
  return server;
}

function setupGracefulShutdown(server) {
  const shutdown = (signal) => {
    logger.info({ signal }, "Shutting down gracefully");
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = { start };
