# Test Script for Microservices Demo

Các lệnh để test hệ thống microservices:

## 1. Kiểm tra API Gateway

```bash
curl http://localhost:3000/health
```

## 2. Tạo User

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Nguyen Van A\", \"email\": \"vana@example.com\"}"
```

Response:

```json
{
  "id": "1",
  "name": "Nguyen Van A",
  "email": "vana@example.com"
}
```

## 3. Lấy thông tin User

```bash
curl http://localhost:3000/api/users/1
```

## 4. Tạo Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Laptop Dell XPS 15\", \"price\": 1500.99}"
```

Response:

```json
{
  "id": "1",
  "name": "Laptop Dell XPS 15",
  "price": 1500.99
}
```

## 5. Lấy thông tin Product

```bash
curl http://localhost:3000/api/products/1
```

## 6. Tạo Order (kết hợp User + Product qua gRPC)

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"1\", \"productId\": \"1\", \"quantity\": 2}"
```

Response:

```json
{
  "id": "1",
  "userId": "1",
  "productId": "1",
  "quantity": 2,
  "totalPrice": 3001.98,
  "userName": "Nguyen Van A",
  "productName": "Laptop Dell XPS 15"
}
```

## 7. Lấy thông tin Order

```bash
curl http://localhost:3000/api/orders/1
```

## Test với PowerShell (Windows)

### Tạo User

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -ContentType "application/json" -Body '{"name": "Nguyen Van A", "email": "vana@example.com"}'
```

### Lấy User

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/users/1" -Method GET
```

### Tạo Product

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/products" -Method POST -ContentType "application/json" -Body '{"name": "Laptop Dell XPS 15", "price": 1500.99}'
```

### Lấy Product

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/products/1" -Method GET
```

### Tạo Order

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/orders" -Method POST -ContentType "application/json" -Body '{"userId": "1", "productId": "1", "quantity": 2}'
```

### Lấy Order

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/orders/1" -Method GET
```

## Giải thích luồng hoạt động

1. **Client** gửi HTTP request đến **API Gateway** (port 3000)
2. **API Gateway** chuyển đổi HTTP request thành gRPC call
3. **API Gateway** gọi đến service tương ứng:
   - User Service (Golang) - port 50051
   - Product Service (NestJS) - port 50052
   - Order Service (Node.js) - port 50053
4. **Order Service** khi tạo order sẽ:
   - Gọi gRPC đến User Service để lấy thông tin user
   - Gọi gRPC đến Product Service để lấy thông tin product
   - Tính toán totalPrice và tạo order
5. Response được trả về qua gRPC và API Gateway chuyển đổi thành HTTP response
