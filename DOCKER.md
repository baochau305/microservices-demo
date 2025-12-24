# 🐳 Docker Deployment Guide

## Chạy với Docker Compose (Recommended)

### Bước 1: Build và chạy tất cả services

```bash
docker-compose up --build
```

Lệnh này sẽ:

- Build Docker images cho tất cả services
- Tạo network để các services giao tiếp
- Chạy tất cả services cùng lúc

### Bước 2: Kiểm tra services đang chạy

```bash
docker-compose ps
```

Bạn sẽ thấy:

```
NAME                IMAGE                           STATUS
api-gateway         microservices-demo-api-gateway  Up
user-service        microservices-demo-user-service Up
product-service     microservices-demo-product-service Up
order-service       microservices-demo-order-service Up
```

### Bước 3: Test API

```bash
# Health check
curl http://localhost:3000/health

# Tạo user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Tạo product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "price": 1000}'

# Tạo order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "1", "productId": "1", "quantity": 2}'
```

### Xem logs

```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs của một service cụ thể
docker-compose logs -f user-service
docker-compose logs -f product-service
docker-compose logs -f order-service
docker-compose logs -f api-gateway
```

### Dừng services

```bash
# Dừng nhưng giữ containers
docker-compose stop

# Dừng và xóa containers
docker-compose down

# Dừng, xóa containers và volumes
docker-compose down -v
```

## Chạy từng service riêng lẻ

### User Service (Golang)

```bash
# Build image
docker build -t user-service ./user-service

# Run container
docker run -p 50051:50051 user-service
```

### Product Service (NestJS)

```bash
# Build image
docker build -t product-service ./product-service

# Run container
docker run -p 50052:50052 product-service
```

### Order Service (Node.js)

```bash
# Build image
docker build -t order-service ./order-service

# Run container với environment variables
docker run -p 50053:50053 \
  -e USER_SERVICE_URL=host.docker.internal:50051 \
  -e PRODUCT_SERVICE_URL=host.docker.internal:50052 \
  order-service
```

### API Gateway

```bash
# Build image
docker build -t api-gateway ./api-gateway

# Run container với environment variables
docker run -p 3000:3000 \
  -e USER_SERVICE_URL=host.docker.internal:50051 \
  -e PRODUCT_SERVICE_URL=host.docker.internal:50052 \
  -e ORDER_SERVICE_URL=host.docker.internal:50053 \
  api-gateway
```

## Troubleshooting

### Port conflicts

Nếu gặp lỗi port đã được sử dụng:

```bash
# Kiểm tra port đang được sử dụng
netstat -ano | findstr :3000
netstat -ano | findstr :50051

# Dừng container đang chạy
docker-compose down
```

### Rebuild sau khi thay đổi code

```bash
# Rebuild tất cả
docker-compose up --build

# Rebuild một service cụ thể
docker-compose up --build user-service
```

### Xóa tất cả images và containers

```bash
# Dừng tất cả containers
docker-compose down

# Xóa images
docker rmi microservices-demo-user-service
docker rmi microservices-demo-product-service
docker rmi microservices-demo-order-service
docker rmi microservices-demo-api-gateway

# Hoặc xóa tất cả unused images
docker image prune -a
```

## Environment Variables

Các biến môi trường có thể config:

### API Gateway

- `USER_SERVICE_URL` - URL của User Service (default: localhost:50051)
- `PRODUCT_SERVICE_URL` - URL của Product Service (default: localhost:50052)
- `ORDER_SERVICE_URL` - URL của Order Service (default: localhost:50053)

### Order Service

- `USER_SERVICE_URL` - URL của User Service (default: localhost:50051)
- `PRODUCT_SERVICE_URL` - URL của Product Service (default: localhost:50052)

## Docker Network

Docker Compose tự động tạo network `microservices-network` để các services giao tiếp với nhau:

```
microservices-network (bridge)
├── user-service (user-service:50051)
├── product-service (product-service:50052)
├── order-service (order-service:50053)
└── api-gateway (api-gateway:3000)
```

Trong Docker network, services có thể gọi nhau bằng tên container:

- `user-service:50051`
- `product-service:50052`
- `order-service:50053`

## Production Considerations

Để deploy production, cần thêm:

1. **Health Checks** trong docker-compose.yml
2. **Resource Limits** (CPU, Memory)
3. **Restart Policies**
4. **Logging Drivers**
5. **Secrets Management**
6. **Multi-stage builds** (đã có)
7. **Non-root users** trong containers

Example production docker-compose.yml snippet:

```yaml
services:
  user-service:
    build: ./user-service
    restart: always
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
    healthcheck:
      test: ["CMD", "grpc-health-probe", "-addr=:50051"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Monitoring

Để monitor containers:

```bash
# Xem resource usage
docker stats

# Inspect container
docker inspect user-service

# Exec vào container
docker exec -it user-service sh
```
