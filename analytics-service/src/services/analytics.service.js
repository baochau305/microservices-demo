const repository = require("../repositories/analytics.repository");
const logger = require("../logger");

// Xử lý một order event và cập nhật dashboard.
async function handleEvent(event) {
  const { eventType, data } = event;

  switch (eventType) {
    case "ORDER_CREATED":
      await repository.recordOrderCreated(data);
      logger.info({ orderId: data.id }, "Recorded ORDER_CREATED");
      break;
    case "ORDER_FAILED":
      await repository.recordOrderFailed(data);
      logger.info({ orderId: data.id, reason: data.error }, "Recorded ORDER_FAILED");
      break;
    default:
      logger.warn({ eventType }, "Unknown event type; ignored");
      return;
  }

  await logDashboard();
}

async function logDashboard() {
  const summary = await repository.getSummary();
  const total = Number(summary.total_orders);
  const success = Number(summary.successful_orders);
  const successRate = total > 0 ? ((success / total) * 100).toFixed(2) : "0.00";
  const topProducts = await repository.getTopProducts(5);

  logger.info(
    {
      totalOrders: total,
      successfulOrders: success,
      failedOrders: Number(summary.failed_orders),
      successRate: `${successRate}%`,
      totalRevenue: Number(summary.total_revenue),
      topProducts: topProducts.map((p) => ({
        product: p.product_name,
        orders: Number(p.orders),
      })),
    },
    "Analytics dashboard"
  );
}

module.exports = { handleEvent };
