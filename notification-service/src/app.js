const NotificationConsumer = require("./messaging/consumer");
const logger = require("./logger");

async function start() {
  const consumer = new NotificationConsumer();
  await connectWithRetry(consumer);
  setupGracefulShutdown(consumer);
  logger.info("Notification Service started");
}

async function connectWithRetry(consumer) {
  try {
    await consumer.start();
  } catch (err) {
    logger.error(
      { err: err.message },
      "Failed to start consumer; retrying in 5s"
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectWithRetry(consumer);
  }
}

function setupGracefulShutdown(consumer) {
  const shutdown = async (signal) => {
    logger.info({ signal }, "Shutting down gracefully");
    try {
      await consumer.stop();
    } catch (err) {
      logger.error({ err: err.message }, "Error during shutdown");
    }
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = { start };
