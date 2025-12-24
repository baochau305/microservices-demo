# Kiến trúc Microservices - Hướng dẫn chi tiết

## 📋 Tổng quan

Đây là hệ thống microservices demo đơn giản để hiểu cách hoạt động của:

- **Microservices Architecture**: Chia nhỏ ứng dụng thành các service độc lập
- **API Gateway Pattern**: Điểm vào duy nhất cho client
- **gRPC**: Protocol hiệu năng cao cho communication giữa services
- **Protocol Buffers**: Format serialization nhỏ gọn và nhanh

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT                            │
│              (Browser, Mobile App, etc.)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/REST (JSON)
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY                           │
│                   (Node.js/Express)                      │
│                     Port: 3000                           │
│                                                          │
│  Chức năng:                                              │
│  - Nhận HTTP requests từ client                          │
│  - Chuyển đổi HTTP → gRPC                                │
│  - Route requests đến đúng service                       │
│  - Chuyển đổi gRPC response → HTTP/JSON                  │
└────────┬──────────────┬──────────────┬──────────────────┘
         │              │              │
         │ gRPC         │ gRPC         │ gRPC
         │              │              │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │  USER   │    │ PRODUCT │    │  ORDER  │
    │ SERVICE │    │ SERVICE │    │ SERVICE │
    │(Golang) │    │(NestJS) │    │(Node.js)│
    │Port:    │    │Port:    │    │Port:    │
    │50051    │    │50052    │    │50053    │
    └─────────┘    └─────────┘    └────┬────┘
                                        │
                                        │ gRPC calls
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                        ▼                               ▼
                   User Service                    Product Service
                   (Get user info)                 (Get product info)
```

## 🔧 Các Service

### 1. API Gateway (Node.js + Express)

**Vai trò**: Điểm vào duy nhất cho tất cả client requests

**Công nghệ**:

- Node.js
- Express (HTTP server)
- @grpc/grpc-js (gRPC client)

**Chức năng**:

- Expose REST API cho client
- Chuyển đổi HTTP requests thành gRPC calls
- Load balancing (trong production)
- Authentication/Authorization (có thể thêm)
- Rate limiting (có thể thêm)

**Endpoints**:

```
POST   /api/users          → UserService.CreateUser
GET    /api/users/:id      → UserService.GetUser
POST   /api/products       → ProductService.CreateProduct
GET    /api/products/:id   → ProductService.GetProduct
POST   /api/orders         → OrderService.CreateOrder
GET    /api/orders/:id     → OrderService.GetOrder
```

### 2. User Service (Golang)

**Vai trò**: Quản lý thông tin người dùng

**Công nghệ**:

- Go 1.21
- google.golang.org/grpc
- Protocol Buffers

**Chức năng**:

- Tạo user mới
- Lấy thông tin user
- Lưu trữ in-memory (Map)

**gRPC Methods**:

```protobuf
service UserService {
  rpc GetUser (GetUserRequest) returns (UserResponse);
  rpc CreateUser (CreateUserRequest) returns (UserResponse);
}
```

**Tại sao dùng Golang?**

- Performance cao
- Concurrency tốt với goroutines
- Phù hợp cho microservices

### 3. Product Service (NestJS)

**Vai trò**: Quản lý sản phẩm

**Công nghệ**:

- NestJS (TypeScript framework)
- @nestjs/microservices
- gRPC

**Chức năng**:

- Tạo product mới
- Lấy thông tin product
- Lưu trữ in-memory (Map)

**gRPC Methods**:

```protobuf
service ProductService {
  rpc GetProduct (GetProductRequest) returns (ProductResponse);
  rpc CreateProduct (CreateProductRequest) returns (ProductResponse);
}
```

**Tại sao dùng NestJS?**

- Framework enterprise-grade
- TypeScript support
- Dependency Injection built-in
- Dễ scale và maintain

### 4. Order Service (Node.js)

**Vai trò**: Quản lý đơn hàng, orchestrate calls đến User và Product service

**Công nghệ**:

- Node.js
- @grpc/grpc-js (cả server và client)

**Chức năng**:

- Tạo order mới
  - Gọi User Service để verify user
  - Gọi Product Service để lấy giá
  - Tính total price
  - Lưu order
- Lấy thông tin order

**gRPC Methods**:

```protobuf
service OrderService {
  rpc CreateOrder (CreateOrderRequest) returns (OrderResponse);
  rpc GetOrder (GetOrderRequest) returns (OrderResponse);
}
```

**Service Orchestration**:

```
CreateOrder flow:
1. Nhận request (userId, productId, quantity)
2. gRPC call → User Service (GetUser)
3. gRPC call → Product Service (GetProduct)
4. Tính totalPrice = product.price * quantity
5. Lưu order với thông tin đầy đủ
6. Return order response
```

## 📡 gRPC và Protocol Buffers

### Tại sao dùng gRPC?

1. **Performance**: Binary protocol, nhanh hơn JSON/REST
2. **Type Safety**: Strongly typed với Protocol Buffers
3. **Code Generation**: Auto-generate client/server code
4. **Streaming**: Support bi-directional streaming
5. **Multi-language**: Support nhiều ngôn ngữ

### Protocol Buffers

```protobuf
syntax = "proto3";

message UserResponse {
  string id = 1;      // Field number cho serialization
  string name = 2;
  string email = 3;
}
```

**Ưu điểm**:

- Compact: Nhỏ hơn JSON 3-10 lần
- Fast: Parse nhanh hơn JSON
- Schema: Có schema rõ ràng
- Backward compatible: Dễ dàng thêm fields mới

## 🔄 Luồng hoạt động

### Ví dụ: Tạo Order

```
1. Client gửi HTTP POST request:
   POST http://localhost:3000/api/orders
   Body: {
     "userId": "1",
     "productId": "1",
     "quantity": 2
   }

2. API Gateway nhận request:
   - Parse JSON body
   - Tạo gRPC request
   - Call OrderService.CreateOrder(userId, productId, quantity)

3. Order Service xử lý:
   a. Call UserService.GetUser(id="1") qua gRPC
      → Response: { id: "1", name: "John", email: "john@example.com" }

   b. Call ProductService.GetProduct(id="1") qua gRPC
      → Response: { id: "1", name: "Laptop", price: 1000 }

   c. Tính toán:
      totalPrice = 1000 * 2 = 2000

   d. Tạo order:
      order = {
        id: "1",
        userId: "1",
        productId: "1",
        quantity: 2,
        totalPrice: 2000,
        userName: "John",
        productName: "Laptop"
      }

   e. Lưu vào memory

   f. Return order qua gRPC

4. API Gateway nhận gRPC response:
   - Convert gRPC message → JSON
   - Return HTTP response

5. Client nhận response:
   {
     "id": "1",
     "userId": "1",
     "productId": "1",
     "quantity": 2,
     "totalPrice": 2000,
     "userName": "John",
     "productName": "Laptop"
   }
```

## 🎯 Lợi ích của Microservices

### 1. **Independence** (Độc lập)

- Mỗi service có thể deploy riêng
- Có thể dùng tech stack khác nhau
- Team có thể làm việc độc lập

### 2. **Scalability** (Khả năng mở rộng)

- Scale từng service riêng biệt
- Product Service có nhiều traffic → chỉ scale Product Service

### 3. **Resilience** (Khả năng phục hồi)

- Một service down không làm crash toàn bộ hệ thống
- Có thể implement circuit breaker, retry logic

### 4. **Technology Diversity**

- User Service: Golang (performance)
- Product Service: NestJS (enterprise features)
- Order Service: Node.js (simple, fast development)

## 🚀 Cách chạy

### Bước 1: Cài đặt dependencies

```bash
# Windows
install.bat

# Linux/Mac
chmod +x install.sh
./install.sh
```

### Bước 2: Chạy services (mở 4 terminal riêng)

**Terminal 1 - User Service**:

```bash
cd user-service
go run main.go
```

**Terminal 2 - Product Service**:

```bash
cd product-service
npm start
```

**Terminal 3 - Order Service**:

```bash
cd order-service
npm start
```

**Terminal 4 - API Gateway**:

```bash
cd api-gateway
npm start
```

### Bước 3: Test

Xem file `TEST.md` để biết các lệnh test.

## 📚 Học thêm

### Concepts cần hiểu:

1. **Microservices vs Monolith**
2. **Service Discovery** (trong production cần Consul, Eureka)
3. **API Gateway Pattern**
4. **gRPC vs REST**
5. **Protocol Buffers**
6. **Service Mesh** (Istio, Linkerd)
7. **Circuit Breaker Pattern**
8. **Distributed Tracing** (Jaeger, Zipkin)

### Improvements có thể thêm:

- [ ] Database thay vì in-memory storage
- [ ] Docker containers
- [ ] Kubernetes orchestration
- [ ] Service discovery (Consul)
- [ ] Health checks
- [ ] Monitoring (Prometheus, Grafana)
- [ ] Logging (ELK stack)
- [ ] Authentication/Authorization (JWT)
- [ ] Rate limiting
- [ ] Circuit breaker (Hystrix)
- [ ] Message queue (RabbitMQ, Kafka)

## 🎓 Kết luận

Hệ thống này demo các concepts cơ bản:
✅ Microservices architecture
✅ API Gateway pattern
✅ gRPC communication
✅ Protocol Buffers
✅ Multi-language services (Go, Node.js, NestJS)
✅ Service orchestration (Order Service gọi User + Product)

Đây là foundation tốt để hiểu microservices. Trong production, cần thêm nhiều components khác như service discovery, monitoring, logging, etc.
