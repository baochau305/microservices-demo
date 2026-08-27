const express = require("express");
const correlationId = require("./middlewares/correlation-id");
const requestLogger = require("./middlewares/request-logger");
const errorHandler = require("./middlewares/error-handler");
const healthRoutes = require("./routes/health.routes");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes");

function createApp() {
  const app = express();

  app.use(express.json());
  // correlationId phải đứng trước requestLogger để chính dòng log của request
  // này cũng mang id.
  app.use(correlationId);
  app.use(requestLogger);

  app.use("/health", healthRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);

  // 404 fallback
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error middleware phải đặt cuối cùng.
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
