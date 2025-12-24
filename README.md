# Microservices Demo

Hệ thống microservices đơn giản để demo cách hoạt động của microservices, API Gateway, và gRPC.

## 📚 Quick Links

- **[QUICKSTART.md](QUICKSTART.md)** - Hướng dẫn chạy nhanh (bắt đầu từ đây!)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Kiến trúc chi tiết và giải thích concepts
- **[DIAGRAMS.md](DIAGRAMS.md)** - Sơ đồ trực quan và flow charts
- **[TEST.md](TEST.md)** - Test cases và examples
- **[DOCKER.md](DOCKER.md)** - Docker deployment guide
- **[SUMMARY.md](SUMMARY.md)** - Tổng kết và next steps

## 🚀 Quick Start

```bash
# 1. Cài đặt dependencies
install.bat  # Windows

# 2. Chạy test (sau khi start tất cả services)
test.ps1     # PowerShell
test.bat     # Command Prompt
```

## Kiến trúc

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────────┐
│  API Gateway    │ (Node.js)
│  Port: 3000     │
└────────┬────────┘
         │ gRPC
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│ User   │ │Product │ │ Order  │
│Service │ │Service │ │Service │
│(Golang)│ │(NestJS)│ │(NodeJS)│
│Port:   │ │Port:   │ │Port:   │
│50051   │ │50052   │ │50053   │
└────────┘ └────────┘ └────────┘
```

## Services

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

4. **Order Service** (Node.js)
   - Quản lý đơn hàng
   - Gọi đến User và Product service qua gRPC
   - Port: 50053

## Cài đặt

### Prerequisites

- Node.js (v16+)
- Go (v1.19+)
- npm hoặc yarn

### Cài đặt dependencies

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

- `POST /api/orders` - Tạo đơn hàng mới (kết hợp User + Product)
- `GET /api/orders/:id` - Lấy thông tin đơn hàng

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
- **Node.js**: Order Service

## Cấu trúc thư mục

```
microservices-demo/
├── proto/                  # Protocol Buffer definitions
│   ├── user.proto
│   ├── product.proto
│   └── order.proto
├── api-gateway/           # API Gateway (Node.js)
├── user-service/          # User Service (Golang)
├── product-service/       # Product Service (NestJS)
└── order-service/         # Order Service (Node.js)
```
