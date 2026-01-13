const amqp = require("amqplib");
const nodemailer = require("nodemailer");

// RabbitMQ connection config
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE_NAME = "order_notifications";
const DEAD_LETTER_QUEUE = "order_notifications_dlq";

// Email config (giả lập - trong thực tế dùng SMTP thật)
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "test@example.com",
    pass: process.env.EMAIL_PASS || "password",
  },
});

class NotificationService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.retryCount = new Map(); // Track retry attempts
  }

  async connect() {
    try {
      console.log("Connecting to RabbitMQ...");
      this.connection = await amqp.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Setup Dead Letter Queue
      await this.channel.assertQueue(DEAD_LETTER_QUEUE, {
        durable: true,
      });

      // Setup main queue with DLX (Dead Letter Exchange)
      await this.channel.assertQueue(QUEUE_NAME, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": "",
          "x-dead-letter-routing-key": DEAD_LETTER_QUEUE,
        },
      });

      console.log("✅ Connected to RabbitMQ");
      console.log(`📬 Listening on queue: ${QUEUE_NAME}`);

      // Handle connection errors
      this.connection.on("error", (err) => {
        console.error("RabbitMQ connection error:", err);
        setTimeout(() => this.connect(), 5000);
      });

      this.connection.on("close", () => {
        console.log("RabbitMQ connection closed, reconnecting...");
        setTimeout(() => this.connect(), 5000);
      });

      this.startConsuming();
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error.message);
      console.log("Retrying in 5 seconds...");
      setTimeout(() => this.connect(), 5000);
    }
  }

  async startConsuming() {
    try {
      // Prefetch 1 message at a time for better load distribution
      await this.channel.prefetch(1);

      this.channel.consume(
        QUEUE_NAME,
        async (msg) => {
          if (msg) {
            await this.handleMessage(msg);
          }
        },
        { noAck: false }
      );

      // Monitor Dead Letter Queue
      this.channel.consume(
        DEAD_LETTER_QUEUE,
        async (msg) => {
          if (msg) {
            const content = JSON.parse(msg.content.toString());
            console.error("❌ Message in DLQ:", content);
            // Log to monitoring system (Sentry, CloudWatch, etc.)
            this.channel.ack(msg);
          }
        },
        { noAck: false }
      );
    } catch (error) {
      console.error("Error starting consumer:", error);
    }
  }

  async handleMessage(msg) {
    const MAX_RETRIES = 3;
    const content = JSON.parse(msg.content.toString());
    const messageId = msg.properties.messageId || content.orderId;

    console.log("\n📨 Received notification request:", content);

    // Get retry count
    const retries = this.retryCount.get(messageId) || 0;

    try {
      // Simulate processing
      await this.sendNotification(content);

      // Success - acknowledge the message
      this.channel.ack(msg);
      this.retryCount.delete(messageId);
      console.log("✅ Notification sent successfully");
    } catch (error) {
      console.error("❌ Error processing notification:", error.message);

      if (retries < MAX_RETRIES) {
        // Retry with exponential backoff
        this.retryCount.set(messageId, retries + 1);
        const delay = Math.pow(2, retries) * 1000; // 1s, 2s, 4s

        console.log(
          `🔄 Retry attempt ${retries + 1}/${MAX_RETRIES} in ${delay}ms`
        );

        setTimeout(() => {
          this.channel.nack(msg, false, true); // Requeue
        }, delay);
      } else {
        // Max retries exceeded - send to DLQ
        console.log(`⚠️ Max retries exceeded. Sending to DLQ`);
        this.retryCount.delete(messageId);
        this.channel.nack(msg, false, false); // Don't requeue, goes to DLQ
      }
    }
  }

  async sendNotification(orderData) {
    const { orderId, userName, userEmail, productName, quantity, totalPrice } =
      orderData;

    // Simulate random failures for demo (10% failure rate)
    if (Math.random() < 0.1) {
      throw new Error("Random failure for testing retry mechanism");
    }

    console.log("📧 Sending email notification...");

    // Send email (in production, use real SMTP)
    const mailOptions = {
      from: '"E-Commerce System" <noreply@ecommerce.com>',
      to: userEmail,
      subject: `Order Confirmation - #${orderId}`,
      html: `
        <h2>Order Confirmation</h2>
        <p>Hi ${userName},</p>
        <p>Your order has been successfully placed!</p>
        <hr>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Quantity:</strong> ${quantity}</p>
        <p><strong>Total:</strong> $${totalPrice}</p>
        <hr>
        <p>Thank you for your purchase!</p>
      `,
    };

    try {
      // In development, just log the email
      console.log("Email content:", mailOptions);
      // await transporter.sendMail(mailOptions); // Uncomment for real email

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log(`✅ Email sent to ${userEmail}`);
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

// Start the service
const service = new NotificationService();
service.connect();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await service.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down gracefully...");
  await service.close();
  process.exit(0);
});

console.log("🚀 Notification Service started");
console.log("Waiting for messages...");
