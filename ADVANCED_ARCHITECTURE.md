# Advanced Microservices Architecture

Hệ thống microservices nâng cao với Kafka, RabbitMQ, Saga Pattern và Event-Driven Architecture.

## 🎯 Vấn Đề Thực Tế Được Giải Quyết

### 1. **Distributed Transactions (SAGA Pattern)**

**Vấn đề:** Khi tạo order cần gọi nhiều service (User, Product, Payment), nếu payment fail thì phải rollback.

**Giải pháp:** Sử dụng Saga Orchestration Pattern trong Order Service:

- Quản lý transaction qua nhiều bước
- Tự động compensation (refund) khi có lỗi
- Đảm bảo data consistency

**Code:** [order-service/index.js](order-service/index.js) - hàm `executeSaga()` và `compensateSaga()`

### 2. **Async Communication (RabbitMQ)**

**Vấn đề:** Gửi notification không nên block order creation. Nếu email service chậm/lỗi, không ảnh hưởng order.

**Giải pháp:**

- Order Service publish message vào RabbitMQ queue
- Notification Service consume message bất đồng bộ
- Dead Letter Queue (DLQ) cho failed messages
- Retry mechanism với exponential backoff

**Code:** [notification-service/index.js](notification-service/index.js)

### 3. **Event Streaming (Kafka)**

**Vấn đề:** Nhiều service cần biết khi có order mới (analytics, inventory, shipping, etc.)

**Giải pháp:**

- Order Service publish events vào Kafka topic `order-events`
- Các service khác subscribe và xử lý độc lập
- Event sourcing cho audit trail
- Real-time analytics

**Code:** [analytics-service/index.js](analytics-service/index.js)

### 4. **Payment Retry Logic**

**Vấn đề:** Payment gateway có thể timeout hoặc network unstable.

**Giải pháp:**

- Retry tối đa 3 lần với exponential backoff
- Circuit breaker pattern (có thể mở rộng)
- Timeout handling

**Code:** [payment-service/index.js](payment-service/index.js) - hàm `processPayment()`

### 5. **Service Decoupling**

**Vấn đề:** Services phụ thuộc lẫn nhau, khó scale và maintain.

**Giải pháp:**

- Message-driven architecture
- Services không biết về nhau
- Dễ thêm service mới
- Horizontal scaling

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────────┐
│  API Gateway    │ :3000
└────────┬────────┘
         │ gRPC
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ User   │ │Product │ │Payment │ │ Order  │
│Service │ │Service │ │Service │ │Service │◄───┐
│:50051  │ │:50052  │ │:50054  │ │:50053  │    │
└────────┘ └────────┘ └────────┘ └───┬────┘    │
                                      │         │
                     ┌────────────────┴─────┐   │
                     │                      │   │
                     ▼                      ▼   │
                ┌─────────┐          ┌──────────┴──┐
                │  Kafka  │          │  RabbitMQ   │
                │  :9092  │          │   :5672     │
                └────┬────┘          └──────┬──────┘
                     │                      │
                     ▼                      ▼
              ┌─────────────┐      ┌──────────────┐
              │ Analytics   │      │Notification  │
              │  Service    │      │  Service     │
              └─────────────┘      └──────────────┘
```

## 📦 Services

### Core Services

1. **API Gateway** (Node.js) - Port 3000

   - HTTP/REST endpoint
   - Route requests to services
   - Authentication (future)

2. **User Service** (Golang) - Port 50051

   - User management
   - gRPC server

3. **Product Service** (NestJS) - Port 50052

   - Product catalog
   - gRPC server

4. **Payment Service** (Node.js) - Port 50054

   - Payment processing
   - Retry logic
   - Refund support

5. **Order Service** (Node.js) - Port 50053
   - Saga orchestration
   - Kafka producer
   - RabbitMQ publisher

### Event-Driven Services

6. **Notification Service** (Node.js)

   - RabbitMQ consumer
   - Email notifications
   - Dead Letter Queue
   - Retry mechanism

7. **Analytics Service** (Node.js)
   - Kafka consumer
   - Real-time metrics
   - Order analytics
   - Revenue tracking

### Message Brokers

8. **Kafka** - Port 9092

   - Event streaming
   - Pub/Sub pattern
   - Event sourcing

9. **Zookeeper** - Port 2181

   - Kafka coordination

10. **RabbitMQ** - Port 5672, 15672 (Management UI)
    - Message queue
    - Dead Letter Queue
    - Async communication

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local dev)
- Go 1.19+ (for local dev)

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Clean up volumes
docker-compose down -v
```

### Access Services

- **API Gateway:** http://localhost:3000
- **RabbitMQ Management UI:** http://localhost:15672 (guest/guest)
- **Kafka:** localhost:9092

## 🧪 Testing

### 1. Create User

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

### 2. Create Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "price": 1200}'
```

### 3. Create Order (Triggers Saga, Kafka, RabbitMQ)

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "1", "productId": "1", "quantity": 2}'
```

**Điều gì xảy ra:**

1. Order Service bắt đầu Saga
2. Lấy thông tin User và Product
3. Process Payment (có thể fail và retry)
4. Tạo Order
5. Publish event vào Kafka → Analytics Service nhận
6. Publish message vào RabbitMQ → Notification Service gửi email
7. Nếu bất kỳ bước nào fail → Saga compensation (refund payment)

### 4. Check Analytics

```bash
# View analytics service logs
docker-compose logs analytics-service
```

### 5. Check Notification Queue

```bash
# Access RabbitMQ UI
open http://localhost:15672
# Login: guest/guest
# Navigate to Queues → order_notifications
```

## 🎓 Key Concepts Demonstrated

### 1. Saga Pattern

**File:** [order-service/index.js](order-service/index.js)

```javascript
async function executeSaga(orderId, userId, productId, quantity) {
  // Step 1: Get User
  // Step 2: Get Product
  // Step 3: Process Payment (save compensation action)
  // Step 4: Create Order
  // Step 5: Publish Events
  // If any step fails → compensateSaga()
}
```

### 2. Kafka Event Publishing

```javascript
await producer.send({
  topic: "order-events",
  messages: [
    {
      key: orderData.id,
      value: JSON.stringify({
        eventType: "ORDER_CREATED",
        data: orderData,
      }),
    },
  ],
});
```

### 3. RabbitMQ with DLQ

```javascript
// Setup queue with Dead Letter Exchange
await channel.assertQueue(QUEUE_NAME, {
  durable: true,
  arguments: {
    "x-dead-letter-exchange": "",
    "x-dead-letter-routing-key": DEAD_LETTER_QUEUE,
  },
});
```

### 4. Retry with Exponential Backoff

```javascript
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    await processPayment();
    return success;
  } catch (error) {
    const backoff = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
    await sleep(backoff);
  }
}
```

## 📊 Monitoring

### RabbitMQ Management UI

- URL: http://localhost:15672
- Username: guest
- Password: guest

**Features:**

- View queues and messages
- Monitor message rates
- Check dead letter queue
- Connection management

### Analytics Dashboard

View real-time analytics in logs:

```bash
docker-compose logs -f analytics-service
```

**Metrics:**

- Total orders
- Success rate
- Total revenue
- Top products
- Revenue by day

## 🔧 Configuration

### Environment Variables

**Order Service:**

```env
USER_SERVICE_URL=user-service:50051
PRODUCT_SERVICE_URL=product-service:50052
PAYMENT_SERVICE_URL=payment-service:50054
KAFKA_BROKERS=kafka:9092
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

**Notification Service:**

```env
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-password
```

**Analytics Service:**

```env
KAFKA_BROKERS=kafka:9092
```

## 🛠️ Development

### Run Individual Service Locally

```bash
# 1. Start message brokers
docker-compose up zookeeper kafka rabbitmq -d

# 2. Install dependencies
cd order-service
npm install

# 3. Set environment variables
export KAFKA_BROKERS=localhost:9092
export RABBITMQ_URL=amqp://localhost:5672

# 4. Run service
npm start
```

### Add New Event Consumer

1. Create new service directory
2. Add Kafka consumer:

```javascript
const consumer = kafka.consumer({ groupId: "my-group" });
await consumer.subscribe({ topic: "order-events" });
await consumer.run({
  eachMessage: async ({ message }) => {
    // Process event
  },
});
```

3. Add to docker-compose.yml

## 🔐 Production Considerations

### Security

- [ ] Add authentication to API Gateway
- [ ] Use SSL/TLS for Kafka and RabbitMQ
- [ ] Secure gRPC with certificates
- [ ] Environment secrets management

### Scalability

- [ ] Kafka partitioning for parallel processing
- [ ] RabbitMQ clustering
- [ ] Horizontal pod autoscaling (Kubernetes)
- [ ] Circuit breaker pattern

### Reliability

- [ ] Health checks for all services
- [ ] Graceful shutdown
- [ ] Request timeout configuration
- [ ] Message acknowledgment strategies

### Observability

- [ ] Distributed tracing (Jaeger/Zipkin)
- [ ] Centralized logging (ELK stack)
- [ ] Metrics collection (Prometheus)
- [ ] Alerting (Grafana)

## 📚 Technologies Used

- **gRPC**: Inter-service communication
- **Kafka**: Event streaming, pub/sub
- **RabbitMQ**: Message queue, async tasks
- **Node.js/Express**: API Gateway, Services
- **NestJS**: Product Service
- **Golang**: User Service
- **Docker**: Containerization
- **Docker Compose**: Orchestration

## 🎯 Real-World Use Cases

### E-Commerce Platform

- Order processing with payment
- Inventory management
- Email notifications
- Analytics and reporting

### Food Delivery

- Order creation
- Restaurant notification
- Driver assignment (can add)
- Real-time tracking (can add)

### Banking System

- Transaction processing
- Fraud detection (can add)
- Notifications
- Audit logging

## 📝 Next Steps

1. **Add Database**: PostgreSQL/MongoDB
2. **Add Caching**: Redis
3. **Add Authentication**: JWT, OAuth2
4. **Add API Documentation**: Swagger/OpenAPI
5. **Add Testing**: Unit, Integration, E2E
6. **Add CI/CD**: GitHub Actions, Jenkins
7. **Add Service Mesh**: Istio (for Kubernetes)
8. **Add Monitoring**: Prometheus + Grafana

## 🤝 Contributing

Feel free to extend this demo with:

- New services (Shipping, Inventory, etc.)
- Additional patterns (Circuit Breaker, Rate Limiting)
- Database integration
- Authentication/Authorization
- Testing suites

## 📄 License

MIT License - feel free to use for learning and demo purposes!
