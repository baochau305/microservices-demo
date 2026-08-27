const { Kafka } = require("kafkajs");
const config = require("../config");
const logger = require("../logger");
const { getCorrelationId } = require("../context");

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  retry: { initialRetryTime: 100, retries: 8 },
});

const producer = kafka.producer();
let connected = false;

async function connect() {
  await producer.connect();
  connected = true;
  logger.info("Kafka producer connected");
}

async function publishOrderEvent(eventType, orderData) {
  if (!connected) {
    logger.warn({ eventType }, "Kafka producer not connected; skipping event");
    return;
  }
  await producer.send({
    topic: config.kafka.topic,
    messages: [
      {
        key: orderData.id,
        value: JSON.stringify({
          eventType,
          timestamp: new Date().toISOString(),
          data: orderData,
        }),
        headers: {
          "event-type": eventType,
          // Nối trace qua ranh giới bất đồng bộ: analytics-service đọc header
          // này ra và log bằng đúng correlationId của request đã sinh ra event.
          "x-correlation-id": getCorrelationId() || "",
          "order-id": orderData.id,
        },
      },
    ],
  });
  logger.info({ eventType, orderId: orderData.id }, "Kafka event published");
}

async function disconnect() {
  if (connected) {
    await producer.disconnect();
    connected = false;
  }
}

module.exports = { connect, disconnect, publishOrderEvent };
