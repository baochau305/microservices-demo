# 🚀 Quick Start Guide

## 🎯 Fast Track (5 phút với Docker)

### Yêu cầu

- Docker & Docker Compose

### Chạy ngay

```bash
# Start tất cả services (10 containers)
docker-compose up -d

# Đợi 30-60 giây để services khởi động
docker-compose ps

# Test thử
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "price": 1200}'

curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "1", "productId": "1", "quantity": 2}'

# Xem logs
docker-compose logs -f order-service
docker-compose logs -f analytics-service
docker-compose logs -f notification-service
```

### Verify

- API Gateway: http://localhost:3000
- RabbitMQ UI: http://localhost:15672 (guest/guest)
- Check analytics: `docker-compose logs analytics-service`

---

## 🛠️ Local Development (Không dùng Docker)

- **Node.js** v16 trở lên
- **Go** v1.19 trở lên
- **npm** hoặc **yarn**

## Cài đặt nhanh (3 bước)

### 1️⃣ Cài đặt dependencies

**Windows:**

```bash
install.bat
```

**Linux/Mac:**

```bash
chmod +x install.sh
./install.sh
```

### 2️⃣ Chạy services

Mở **4 terminal** riêng biệt và chạy các lệnh sau:

#### Terminal 1 - User Service (Golang)

```bash
cd user-service
go run main.go
```

✅ Chờ thấy: `User Service (Golang) is running on port 50051...`

#### Terminal 2 - Product Service (NestJS)

```bash
cd product-service
npm start
```

✅ Chờ thấy: `Product Service (NestJS) is running on port 50052...`

#### Terminal 3 - Order Service (Node.js)

```bash
cd order-service
npm start
```

✅ Chờ thấy: `Order Service (Node.js) is running on port 50053...`

#### Terminal 4 - API Gateway

```bash
cd api-gateway
npm start
```

✅ Chờ thấy: `API Gateway is running on http://localhost:3000`

### 3️⃣ Test hệ thống

Mở terminal mới và chạy:

```bash
# Kiểm tra health
curl http://localhost:3000/health

# Tạo user
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"name\": \"John Doe\", \"email\": \"john@example.com\"}"

# Tạo product
curl -X POST http://localhost:3000/api/products -H "Content-Type: application/json" -d "{\"name\": \"Laptop\", \"price\": 1000}"

# Tạo order (kết hợp user + product qua gRPC)
curl -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -d "{\"userId\": \"1\", \"productId\": \"1\", \"quantity\": 2}"
```

## 🎯 Test với PowerShell (Windows)

```powershell
# Tạo user
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -ContentType "application/json" -Body '{"name": "John Doe", "email": "john@example.com"}'

# Tạo product
Invoke-RestMethod -Uri "http://localhost:3000/api/products" -Method POST -ContentType "application/json" -Body '{"name": "Laptop", "price": 1000}'

# Tạo order
Invoke-RestMethod -Uri "http://localhost:3000/api/orders" -Method POST -ContentType "application/json" -Body '{"userId": "1", "productId": "1", "quantity": 2}'
```

## 📖 Tài liệu

- **ARCHITECTURE.md** - Kiến trúc chi tiết và giải thích concepts
- **TEST.md** - Các test cases đầy đủ
- **README.md** - Tổng quan dự án

## ❓ Troubleshooting

### Lỗi: "Port already in use"

Đảm bảo các port sau đang available:

- 3000 (API Gateway)
- 50051 (User Service)
- 50052 (Product Service)
- 50053 (Order Service)

### Lỗi: "Cannot find module"

Chạy lại:

```bash
cd <service-name>
npm install
```

### Lỗi: Go module not found

```bash
cd user-service
go mod download
```

## 🎓 Hiểu luồng hoạt động

1. Client gửi HTTP request → API Gateway (port 3000)
2. API Gateway chuyển HTTP → gRPC
3. gRPC call đến service tương ứng (User/Product/Order)
4. Order Service gọi User + Product service qua gRPC
5. Response trả về qua gRPC → API Gateway → HTTP → Client

## 🌟 Next Steps

Sau khi chạy thành công, bạn có thể:

1. Đọc `ARCHITECTURE.md` để hiểu sâu hơn
2. Xem code của từng service
3. Thử modify và thêm features mới
4. Thêm database thay vì in-memory storage
5. Dockerize các services

Chúc bạn học tốt! 🚀
