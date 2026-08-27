const { start } = require("./src/server");
const logger = require("./src/logger");

start().catch((err) => {
  logger.error({ err: err.message }, "Failed to start payment-service");
  process.exit(1);
});
