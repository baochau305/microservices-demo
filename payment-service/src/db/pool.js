const { Pool } = require("pg");
const config = require("../config");
const logger = require("../logger");

// Connection pool dùng chung cho toàn service.
const pool = new Pool({ connectionString: config.databaseUrl });

pool.on("error", (err) => {
  logger.error({ err: err.message }, "Unexpected Postgres pool error");
});

module.exports = pool;
