# Microservices Demo

Hệ thống microservices nâng cao với **Kafka**, **RabbitMQ**, **Saga Pattern**, và **Event-Driven Architecture**.

> 🎯 **New!** Giải quyết các vấn đề thực tế: Distributed transactions, async communication, event streaming, retry logic, và monitoring.

## 📚 Quick Links

- **[QUICKSTART.md](QUICKSTART.md)** - Hướng dẫn chạy nhanh (bắt đầu từ đây!)
- **[ADVANCED_ARCHITECTURE.md](ADVANCED_ARCHITECTURE.md)** - 🔥 **NEW!** Architecture nâng cao với Kafka & RabbitMQ
- **[MESSAGE_QUEUE_GUIDE.md](MESSAGE_QUEUE_GUIDE.md)** - 🔥 **NEW!** Chi tiết về Kafka và RabbitMQ
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Kiến trúc cơ bản
- **[DIAGRAMS.md](DIAGRAMS.md)** - Sơ đồ trực quan
- **[TEST.md](TEST.md)** - Test cases
- **[DOCKER.md](DOCKER.md)** - Docker deployment guide
- **[SUMMARY.md](SUMMARY.md)** - Tổng kết

## 🚀 Quick Start

```bash
# Chạy tất cả services với Docker Compose (build lại image lần đầu)
docker compose up -d --build

# Xem logs
docker compose logs -f

# Test API
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "1", "productId": "1", "quantity": 2}'
```

## 🎯 Vấn Đề Thực Tế Được Giải Quyết

### 1. **Distributed Transactions**

❌ **Problem:** Order cần gọi nhiều service (User, Product, Payment). Nếu payment fail phải rollback.

✅ **Solution:** **SAGA Pattern** - Tự động compensation khi có lỗi

### 2. **Async Communication**

❌ **Problem:** Gửi email không nên block order creation

✅ **Solution:** **RabbitMQ** - Message queue với retry và Dead Letter Queue

### 3. **Event Streaming**

❌ **Problem:** Analytics cần biết mọi order mới

✅ **Solution:** **Kafka** - Event streaming cho real-time analytics

### 4. **Payment Failures**

❌ **Problem:** Payment gateway timeout/unstable

✅ **Solution:** **Retry Logic** - Exponential backoff, tối đa 3 lần

### 5. **Service Decoupling**

❌ **Problem:** Services phụ thuộc lẫn nhau

✅ **Solution:** **Message-Driven** - Services không biết về nhau

## Kiến trúc

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────────┐
│  API Gateway    │ (Node.js) :3000
└────────┬────────┘
         │ gRPC
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ User   │ │Product │ │Payment │ │ Order  │
│Service │ │Service │ │Service │ │Service │◄───┐
│(Golang)│ │(NestJS)│ │(NodeJS)│ │(NodeJS)│    │
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

## Services

### Core Services (gRPC)

### Core Services (gRPC)

1. **API Gateway** (Node.js - Express)

   - Điểm vào duy nhất cho client
   - Chuyển đổi HTTP/REST sang gRPC
   - Port: 3000

2. **User Service** (Golang)

   - Quản lý thông tin người dùng
   - gRPC server
   - Port: 50051

3. **Product Service** (NestJS)

   - Quản lý sản phẩm
   - gRPC server
   - Port: 50052

4. **Payment Service** (Node.js) 🆕

   - Xử lý thanh toán
   - Retry logic với exponential backoff
   - Hỗ trợ refund cho Saga compensation
   - Port: 50054

5. **Order Service** (Node.js)
   - Orchestrate Saga Pattern
   - Publish events vào Kafka
   - Publish notifications vào RabbitMQ
   - Port: 50053

### Event-Driven Services 🆕

6. **Notification Service** (Node.js)

   - Consumer RabbitMQ
   - Gửi email notifications
   - Dead Letter Queue cho failed messages
   - Retry mechanism

7. **Analytics Service** (Node.js)
   - Consumer Kafka events
   - Real-time analytics
   - Revenue tracking
   - Order metrics

### Message Brokers 🆕

8. **Kafka** + **Zookeeper**

   - Event streaming platform
   - Port: 9092

9. **RabbitMQ**
   - Message queue
   - Management UI: http://localhost:15672
   - Port: 5672

## Cài đặt

### Prerequisites

- Docker & Docker Compose (khuyên dùng — kèm sẵn PostgreSQL, Kafka, RabbitMQ)
- Node.js (v18+) — nếu chạy local
- Go (v1.25+) — nếu build user-service local (pgx yêu cầu)
- PostgreSQL 16 — nếu chạy local không qua Docker

### Option 1: Docker Compose (Recommended) 🆕

```bash
# Clone repository
git clone <repo-url>
cd microservices-demo

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Local Development

```bash
# API Gateway
cd api-gateway
npm install

# User Service (Golang)
cd user-service
go mod download

# Product Service (NestJS)
cd product-service
npm install

# Order Service (Node.js)
cd order-service
npm install
```

## Chạy services

Mở 4 terminal riêng biệt và chạy từng service:

```bash
# Terminal 1 - User Service
cd user-service
go run main.go

# Terminal 2 - Product Service
cd product-service
npm run start

# Terminal 3 - Order Service
cd order-service
npm start

# Terminal 4 - API Gateway
cd api-gateway
npm start
```

## API Endpoints

### User Service (qua API Gateway)

- `GET /api/users/:id` - Lấy thông tin user
- `POST /api/users` - Tạo user mới

### Product Service (qua API Gateway)

- `GET /api/products/:id` - Lấy thông tin sản phẩm
- `POST /api/products` - Tạo sản phẩm mới

### Order Service (qua API Gateway)

- `POST /api/orders` - Tạo đơn hàng mới (chạy Saga: User + Product + Payment)
- `GET /api/orders/:id` - Lấy thông tin đơn hàng

### Payment Service (qua API Gateway)

- `GET /api/payments/:id` - Tra cứu thanh toán (payment được tạo bên trong Saga)

> **Lưu ý:** ID hiện là **UUID** (sinh bởi Postgres). Hãy tạo user & product
> trước, lấy `id` trả về rồi mới tạo order. Hệ thống cần PostgreSQL nên dùng
> `docker compose up` hoặc set `DATABASE_URL` khi chạy local.

## Test API

```bash
# Tạo user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Lấy user
curl http://localhost:3000/api/users/1

# Tạo product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "price": 1000}'

# Lấy product
curl http://localhost:3000/api/products/1

# Tạo order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "1", "productId": "1", "quantity": 2}'

# Lấy order
curl http://localhost:3000/api/orders/1
```

## Công nghệ sử dụng

- **gRPC**: Protocol Buffers cho communication giữa services
- **Node.js/Express**: API Gateway
- **Golang**: User Service
- **NestJS**: Product Service
- **Node.js**: Order / Payment / Notification / Analytics Service
- **PostgreSQL**: Lưu trữ (database-per-service), pg + TypeORM
- **Kafka**: Event streaming, pub/sub pattern
- **RabbitMQ**: Message queue, async communication
- **pino / slog**: Structured logging
- **Docker**: Containerization

## Cấu trúc thư mục

Mỗi service được chia layer theo hướng production (chi tiết xem [CLAUDE.md](CLAUDE.md)).

```
microservices-demo/
├── proto/                       # Protocol Buffer definitions (dùng chung)
│   ├── user.proto  product.proto  order.proto  payment.proto
├── infra/postgres/init/         # SQL khởi tạo database-per-service
├── api-gateway/                 # Node/Express — HTTP→gRPC
│   └── src/{config,logger,proto,clients,routes,middlewares,utils}
├── user-service/                # Go (clean architecture)
│   ├── cmd/server/main.go
│   └── internal/{config,logger,db,domain,repository,service,handler,server}
├── product-service/             # NestJS (modular + TypeORM)
│   └── src/{config,database,common,product/{entities,dto}}
├── order-service/               # Node — Saga orchestrator
│   └── src/{config,logger,db,proto,clients,messaging,repositories,sagas,services,handlers}
├── payment-service/             # Node — payment + retry + refund
│   └── src/{config,logger,db,proto,gateway,repositories,services,handlers}
├── notification-service/        # Node — RabbitMQ consumer (DLQ + retry)
│   └── src/{config,logger,messaging,services,handlers}
├── analytics-service/           # Node — Kafka consumer + Postgres
│   └── src/{config,logger,db,messaging,repositories,services}
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```
