const { start } = require("./src/app");
const logger = require("./src/logger");

start().catch((err) => {
  logger.error({ err: err.message }, "Failed to start analytics-service");
  process.exit(1);
});
