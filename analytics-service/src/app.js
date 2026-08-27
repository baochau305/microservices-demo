const consumer = require("./messaging/consumer");
const migrate = require("./db/migrate");
const pool = require("./db/pool");
const logger = require("./logger");

async function start() {
  await migrate();
  logger.info("Database schema ready");

  await connectWithRetry();
  setupGracefulShutdown();
  logger.info("Analytics Service started");
}

async function connectWithRetry() {
  try {
    await consumer.start();
  } catch (err) {
    logger.error(
      { err: err.message },
      "Failed to start Kafka consumer; retrying in 5s"
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectWithRetry();
  }
}

function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    logger.info({ signal }, "Shutting down gracefully");
    try {
      await consumer.stop();
      await pool.end();
    } catch (err) {
      logger.error({ err: err.message }, "Error during shutdown");
    }
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = { start };
