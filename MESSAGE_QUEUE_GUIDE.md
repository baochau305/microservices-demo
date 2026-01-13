# Message Queue và Event Streaming Guide

Hướng dẫn chi tiết về Kafka và RabbitMQ trong hệ thống.

## 📋 Table of Contents

- [Kafka vs RabbitMQ](#kafka-vs-rabbitmq)
- [Kafka Setup](#kafka-setup)
- [RabbitMQ Setup](#rabbitmq-setup)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Kafka vs RabbitMQ

### Khi nào dùng Kafka?

✅ **Event Streaming**

- Analytics, metrics collection
- Event sourcing, audit logs
- Real-time data pipelines
- Multiple consumers cần replay events

**Ví dụ trong project:**

- `order-events` topic cho analytics
- Event history cho audit trail
- Real-time dashboard updates

### Khi nào dùng RabbitMQ?

✅ **Message Queue**

- Task queue (send email, process files)
- Request-reply pattern
- Priority queues
- Reliable message delivery với retry

**Ví dụ trong project:**

- `order_notifications` queue cho gửi email
- Dead Letter Queue cho failed messages
- Background job processing

### So sánh

| Feature               | Kafka                    | RabbitMQ               |
| --------------------- | ------------------------ | ---------------------- |
| **Pattern**           | Pub/Sub, Event Streaming | Message Queue, Pub/Sub |
| **Message Retention** | Configurable (days)      | Until consumed         |
| **Message Replay**    | ✅ Yes                   | ❌ No                  |
| **Ordering**          | Per partition            | Per queue              |
| **Performance**       | Very High                | High                   |
| **Use Case**          | Event log, Analytics     | Task queue, RPC        |

## Kafka Setup

### Architecture

```
Producer → Topic (Partitions) → Consumer Groups
                ↓
         [order-events]
         Partition 0: msgs [1,2,3,4]
         Partition 1: msgs [5,6,7,8]
                ↓
         Consumer Group A: [Consumer 1, Consumer 2]
         Consumer Group B: [Consumer 3]
```

### Creating Kafka Producer (Order Service)

```javascript
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "order-service",
  brokers: ["kafka:9092"],
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer = kafka.producer();
await producer.connect();

// Publish event
await producer.send({
  topic: "order-events",
  messages: [
    {
      key: orderId, // Used for partitioning
      value: JSON.stringify({
        eventType: "ORDER_CREATED",
        timestamp: new Date().toISOString(),
        data: orderData,
      }),
      headers: {
        "event-type": "ORDER_CREATED",
        "correlation-id": orderId,
      },
    },
  ],
});
```

### Creating Kafka Consumer (Analytics Service)

```javascript
const consumer = kafka.consumer({ groupId: "analytics-group" });

await consumer.connect();
await consumer.subscribe({
  topics: ["order-events"],
  fromBeginning: true, // Replay all events
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());
    console.log("Received:", event.eventType);

    // Process event
    await processEvent(event);

    // Message is auto-committed
  },
});
```

### Kafka Topics & Partitions

**Create topic with multiple partitions:**

```bash
docker exec -it kafka kafka-topics \
  --create \
  --topic order-events \
  --partitions 3 \
  --replication-factor 1 \
  --bootstrap-server localhost:9092
```

**List topics:**

```bash
docker exec -it kafka kafka-topics \
  --list \
  --bootstrap-server localhost:9092
```

**Describe topic:**

```bash
docker exec -it kafka kafka-topics \
  --describe \
  --topic order-events \
  --bootstrap-server localhost:9092
```

**View messages:**

```bash
docker exec -it kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic order-events \
  --from-beginning
```

### Consumer Groups

**Key Concept:** Multiple consumers in same group = parallel processing

```
Topic: order-events (3 partitions)
  Partition 0 → Consumer A (Group 1)
  Partition 1 → Consumer B (Group 1)
  Partition 2 → Consumer C (Group 1)

Each message consumed by ONE consumer in group
```

**Check consumer groups:**

```bash
docker exec -it kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --list
```

**Check lag:**

```bash
docker exec -it kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group analytics-group \
  --describe
```

## RabbitMQ Setup

### Architecture

```
Producer → Exchange → Queue → Consumer
                ↓
         [order_notifications]
              Queue
         [msg1, msg2, msg3]
              ↓
         Dead Letter Queue
         [failed msgs]
```

### Creating RabbitMQ Producer (Order Service)

```javascript
const amqp = require("amqplib");

const connection = await amqp.connect("amqp://localhost:5672");
const channel = await connection.createChannel();

// Setup queue with DLQ
await channel.assertQueue("order_notifications", {
  durable: true, // Survive broker restart
  arguments: {
    "x-dead-letter-exchange": "",
    "x-dead-letter-routing-key": "order_notifications_dlq",
    "x-message-ttl": 86400000, // 24 hours
  },
});

// Publish message
channel.sendToQueue(
  "order_notifications",
  Buffer.from(JSON.stringify(message)),
  {
    persistent: true, // Write to disk
    messageId: orderId,
    timestamp: Date.now(),
  }
);
```

### Creating RabbitMQ Consumer (Notification Service)

```javascript
// Prefetch 1 message at a time
await channel.prefetch(1);

channel.consume(
  "order_notifications",
  async (msg) => {
    if (msg) {
      const data = JSON.parse(msg.content.toString());

      try {
        await sendNotification(data);

        // Success - acknowledge
        channel.ack(msg);
      } catch (error) {
        console.error("Failed:", error);

        // Retry or send to DLQ
        if (retries < MAX_RETRIES) {
          // Requeue with delay
          setTimeout(() => {
            channel.nack(msg, false, true); // Requeue
          }, 1000);
        } else {
          // Send to DLQ
          channel.nack(msg, false, false); // Don't requeue
        }
      }
    }
  },
  { noAck: false } // Manual acknowledgment
);
```

### Dead Letter Queue (DLQ)

**Setup DLQ:**

```javascript
// Create DLQ
await channel.assertQueue("order_notifications_dlq", {
  durable: true,
});

// Main queue with DLX
await channel.assertQueue("order_notifications", {
  durable: true,
  arguments: {
    "x-dead-letter-exchange": "",
    "x-dead-letter-routing-key": "order_notifications_dlq",
  },
});

// Monitor DLQ
channel.consume("order_notifications_dlq", async (msg) => {
  console.error("Message in DLQ:", JSON.parse(msg.content.toString()));

  // Log to Sentry, CloudWatch, etc.
  await logError(msg);

  channel.ack(msg);
});
```

### RabbitMQ Management

**Access Management UI:**

```
http://localhost:15672
Username: guest
Password: guest
```

**Key Features:**

- View queues and message counts
- Message rates (publish/deliver)
- Purge queues
- Manual message publishing
- Consumer management

**CLI Commands:**

```bash
# List queues
docker exec rabbitmq rabbitmqctl list_queues

# List exchanges
docker exec rabbitmq rabbitmqctl list_exchanges

# Purge queue
docker exec rabbitmq rabbitmqctl purge_queue order_notifications
```

## Common Patterns

### 1. Retry with Exponential Backoff

```javascript
async function processWithRetry(message, maxRetries = 3) {
  const messageId = message.properties.messageId;
  const retries = retryCount.get(messageId) || 0;

  try {
    await processMessage(message);
    channel.ack(message);
    retryCount.delete(messageId);
  } catch (error) {
    if (retries < maxRetries) {
      retryCount.set(messageId, retries + 1);
      const delay = Math.pow(2, retries) * 1000; // 1s, 2s, 4s

      console.log(`Retry ${retries + 1}/${maxRetries} in ${delay}ms`);
      setTimeout(() => {
        channel.nack(message, false, true); // Requeue
      }, delay);
    } else {
      console.log("Max retries exceeded, sending to DLQ");
      channel.nack(message, false, false); // To DLQ
      retryCount.delete(messageId);
    }
  }
}
```

### 2. Event Sourcing with Kafka

```javascript
// Store all state changes as events
const events = [
  { type: "ORDER_CREATED", data: {...} },
  { type: "PAYMENT_PROCESSED", data: {...} },
  { type: "ORDER_SHIPPED", data: {...} },
];

// Rebuild state from events
function rebuildOrderState(orderId) {
  const orderEvents = events.filter(e => e.orderId === orderId);

  let state = { status: "PENDING" };
  for (const event of orderEvents) {
    state = applyEvent(state, event);
  }

  return state;
}
```

### 3. CQRS (Command Query Responsibility Segregation)

```javascript
// Write Side: Commands → Events → Kafka
async function createOrder(command) {
  // Validate & execute
  const order = await executeCommand(command);

  // Publish event
  await publishEvent({
    type: "ORDER_CREATED",
    data: order,
  });
}

// Read Side: Events → Read Model
consumer.run({
  eachMessage: async ({ message }) => {
    const event = JSON.parse(message.value);

    // Update read model (MongoDB, Elasticsearch, etc.)
    await updateReadModel(event);
  },
});
```

### 4. Fan-out Pattern

```javascript
// One producer, multiple consumers
// Order Service publishes event
await producer.send({
  topic: "order-events",
  messages: [{ value: JSON.stringify(event) }],
});

// Multiple services consume (different consumer groups)
// - Analytics Service (analytics-group)
// - Inventory Service (inventory-group)
// - Shipping Service (shipping-group)
// Each receives ALL events independently
```

## Troubleshooting

### Kafka Issues

**Problem: Consumer lag increasing**

```bash
# Check lag
docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group analytics-group \
  --describe

# Solution: Add more consumers or increase partitions
```

**Problem: Messages not appearing**

```bash
# Check if topic exists
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Verify producer is connected
docker logs order-service | grep Kafka

# Check consumer is subscribed
docker logs analytics-service | grep subscribe
```

**Problem: Kafka broker not starting**

```bash
# Check Zookeeper is running
docker ps | grep zookeeper

# Check logs
docker logs kafka

# Restart with clean state
docker-compose down -v
docker-compose up kafka
```

### RabbitMQ Issues

**Problem: Messages stuck in queue**

```bash
# Check queue status
docker exec rabbitmq rabbitmqctl list_queues name messages consumers

# Check consumer is running
docker logs notification-service

# Purge queue if needed
docker exec rabbitmq rabbitmqctl purge_queue order_notifications
```

**Problem: Messages going to DLQ**

```bash
# View DLQ messages in Management UI
open http://localhost:15672

# Check consumer logs for errors
docker logs notification-service

# Get message from DLQ to inspect
# Use Management UI → Queues → order_notifications_dlq → Get Messages
```

**Problem: Connection refused**

```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Check port is exposed
docker port rabbitmq

# Verify connection string
echo $RABBITMQ_URL
```

### Performance Tuning

**Kafka:**

```javascript
// Increase batch size
const producer = kafka.producer({
  compression: CompressionTypes.GZIP,
  batch: {
    size: 16384, // bytes
    maxMessages: 100,
  },
});

// Parallel consumption
const consumer = kafka.consumer({
  groupId: "my-group",
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576,
});
```

**RabbitMQ:**

```javascript
// Prefetch multiple messages
await channel.prefetch(10); // Process 10 at a time

// Use multiple channels
const channels = await Promise.all([
  connection.createChannel(),
  connection.createChannel(),
  connection.createChannel(),
]);
```

## Monitoring

### Key Metrics to Watch

**Kafka:**

- Consumer lag
- Message throughput (msgs/sec)
- Partition distribution
- Disk usage

**RabbitMQ:**

- Queue depth
- Message rate (publish/deliver)
- Consumer count
- Memory usage
- Unacked messages

### Health Checks

```javascript
// Kafka health check
async function checkKafkaHealth() {
  try {
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    await admin.disconnect();
    return topics.length > 0;
  } catch (error) {
    return false;
  }
}

// RabbitMQ health check
async function checkRabbitMQHealth() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    await connection.close();
    return true;
  } catch (error) {
    return false;
  }
}
```

## Best Practices

### Kafka

✅ Use message keys for ordering within partition
✅ Set appropriate retention policy
✅ Monitor consumer lag
✅ Use schema registry (Avro) for large systems
✅ Implement idempotent consumers
✅ Use transactions for exactly-once semantics

### RabbitMQ

✅ Always use manual acknowledgment
✅ Implement Dead Letter Queue
✅ Set message TTL
✅ Use prefetch for flow control
✅ Persist important messages
✅ Monitor queue depth
✅ Implement circuit breaker for consumers

## Further Reading

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [SAGA Pattern](https://microservices.io/patterns/data/saga.html)
