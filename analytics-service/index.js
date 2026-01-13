const { Kafka } = require("kafkajs");

// Kafka configuration
const kafka = new Kafka({
  clientId: "analytics-service",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const consumer = kafka.consumer({ groupId: "analytics-group" });

// Analytics data storage (in production, use database)
const analytics = {
  totalOrders: 0,
  totalRevenue: 0,
  successfulOrders: 0,
  failedOrders: 0,
  ordersByProduct: new Map(),
  ordersByUser: new Map(),
  revenueByDay: new Map(),
};

class AnalyticsService {
  constructor() {
    this.isRunning = false;
  }

  async connect() {
    try {
      console.log("Connecting to Kafka...");
      await consumer.connect();
      await consumer.subscribe({
        topics: ["order-events"],
        fromBeginning: true,
      });
      console.log("✅ Connected to Kafka");
      console.log("📊 Analytics Service is ready");
      console.log("Listening for order events...\n");

      this.isRunning = true;
      this.startConsuming();

      // Handle errors
      consumer.on("consumer.crash", (event) => {
        console.error("Kafka consumer crashed:", event);
        this.reconnect();
      });
    } catch (error) {
      console.error("Failed to connect to Kafka:", error.message);
      console.log("Retrying in 5 seconds...");
      setTimeout(() => this.connect(), 5000);
    }
  }

  async startConsuming() {
    try {
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleMessage(message);
        },
      });
    } catch (error) {
      console.error("Error in consumer:", error);
      this.reconnect();
    }
  }

  async handleMessage(message) {
    try {
      const event = JSON.parse(message.value.toString());
      const { eventType, timestamp, data } = event;

      console.log(`\n📨 Received event: ${eventType}`);
      console.log(`Timestamp: ${timestamp}`);

      switch (eventType) {
        case "ORDER_CREATED":
          this.handleOrderCreated(data);
          break;
        case "ORDER_FAILED":
          this.handleOrderFailed(data);
          break;
        default:
          console.log(`Unknown event type: ${eventType}`);
      }

      this.printAnalytics();
    } catch (error) {
      console.error("Error processing message:", error.message);
    }
  }

  handleOrderCreated(order) {
    console.log(`✅ Processing successful order: ${order.id}`);

    // Update metrics
    analytics.totalOrders++;
    analytics.successfulOrders++;
    analytics.totalRevenue += order.totalPrice;

    // Track by product
    const productCount = analytics.ordersByProduct.get(order.productName) || 0;
    analytics.ordersByProduct.set(order.productName, productCount + 1);

    // Track by user
    const userCount = analytics.ordersByUser.get(order.userId) || 0;
    analytics.ordersByUser.set(order.userId, userCount + 1);

    // Track revenue by day
    const day = new Date(order.createdAt).toISOString().split("T")[0];
    const dayRevenue = analytics.revenueByDay.get(day) || 0;
    analytics.revenueByDay.set(day, dayRevenue + order.totalPrice);
  }

  handleOrderFailed(data) {
    console.log(`❌ Processing failed order: ${data.id}`);
    console.log(`Reason: ${data.error}`);

    analytics.totalOrders++;
    analytics.failedOrders++;
  }

  printAnalytics() {
    console.log("\n" + "=".repeat(50));
    console.log("📊 ANALYTICS DASHBOARD");
    console.log("=".repeat(50));
    console.log(`Total Orders: ${analytics.totalOrders}`);
    console.log(`Successful Orders: ${analytics.successfulOrders}`);
    console.log(`Failed Orders: ${analytics.failedOrders}`);
    console.log(
      `Success Rate: ${
        analytics.totalOrders > 0
          ? (
              (analytics.successfulOrders / analytics.totalOrders) *
              100
            ).toFixed(2)
          : 0
      }%`
    );
    console.log(`Total Revenue: $${analytics.totalRevenue.toFixed(2)}`);

    if (analytics.ordersByProduct.size > 0) {
      console.log("\n📦 Top Products:");
      const sortedProducts = Array.from(analytics.ordersByProduct.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      sortedProducts.forEach(([product, count], index) => {
        console.log(`  ${index + 1}. ${product}: ${count} orders`);
      });
    }

    if (analytics.ordersByUser.size > 0) {
      console.log("\n👥 Active Users: " + analytics.ordersByUser.size);
    }

    if (analytics.revenueByDay.size > 0) {
      console.log("\n💰 Revenue by Day:");
      Array.from(analytics.revenueByDay.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 7)
        .forEach(([day, revenue]) => {
          console.log(`  ${day}: $${revenue.toFixed(2)}`);
        });
    }

    console.log("=".repeat(50) + "\n");
  }

  async reconnect() {
    if (!this.isRunning) return;
    console.log("Reconnecting to Kafka...");
    await consumer.disconnect();
    setTimeout(() => this.connect(), 5000);
  }

  async shutdown() {
    console.log("\nShutting down gracefully...");
    this.isRunning = false;
    await consumer.disconnect();
    console.log("✅ Analytics Service stopped");
    process.exit(0);
  }
}

// Start service
const service = new AnalyticsService();
service.connect();

// Graceful shutdown
process.on("SIGINT", () => service.shutdown());
process.on("SIGTERM", () => service.shutdown());

console.log("🚀 Analytics Service starting...");
