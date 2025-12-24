# 📋 Cheat Sheet - Các lệnh thường dùng

## 🚀 Khởi động hệ thống

### Option 1: Local Development

```bash
# Terminal 1 - User Service
cd user-service
go run main.go

# Terminal 2 - Product Service
cd product-service
npm start

# Terminal 3 - Order Service
cd order-service
npm start

# Terminal 4 - API Gateway
cd api-gateway
npm start
```

### Option 2: Docker

```bash
# Chạy tất cả services
docker-compose up

# Chạy ở background
docker-compose up -d

# Rebuild và chạy
docker-compose up --build

# Xem logs
docker-compose logs -f

# Dừng
docker-compose down
```

## 🧪 Testing

### PowerShell (Recommended cho Windows)

```powershell
# Chạy full test suite
.\test.ps1

# Test từng endpoint
Invoke-RestMethod -Uri "http://localhost:3000/health"
Invoke-RestMethod -Uri "http://localhost:3000/api/users/1"
```

### Command Prompt

```cmd
test.bat
```

### Bash (Git Bash, WSL)

```bash
chmod +x test.sh
./test.sh
```

### Manual cURL Tests

```bash
# Health check
curl http://localhost:3000/health

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"John\",\"email\":\"john@example.com\"}"

# Get user
curl http://localhost:3000/api/users/1

# Create product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Laptop\",\"price\":1500}"

# Get product
curl http://localhost:3000/api/products/1

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"1\",\"productId\":\"1\",\"quantity\":2}"

# Get order
curl http://localhost:3000/api/orders/1
```

## 🐳 Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up

# Stop services
docker-compose stop

# Remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# View logs
docker-compose logs -f [service-name]

# Rebuild specific service
docker-compose up --build user-service

# Execute command in container
docker-compose exec user-service sh

# View running containers
docker-compose ps

# View resource usage
docker stats
```

## 🔍 Debugging

### Check if ports are in use

```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :50051
netstat -ano | findstr :50052
netstat -ano | findstr :50053

# Linux/Mac
lsof -i :3000
lsof -i :50051
lsof -i :50052
lsof -i :50053
```

### View service logs

```bash
# Docker
docker-compose logs -f user-service
docker-compose logs -f product-service
docker-compose logs -f order-service
docker-compose logs -f api-gateway

# Local (check terminal output)
```

### Test individual services

```bash
# Test User Service directly (gRPC - requires grpcurl)
grpcurl -plaintext -d '{"id":"1"}' localhost:50051 user.UserService/GetUser

# Test Product Service directly
grpcurl -plaintext -d '{"id":"1"}' localhost:50052 product.ProductService/GetProduct

# Test Order Service directly
grpcurl -plaintext -d '{"id":"1"}' localhost:50053 order.OrderService/GetOrder
```

## 📦 Package Management

### Install dependencies

```bash
# All services
install.bat  # Windows
./install.sh # Linux/Mac

# Individual services
cd api-gateway && npm install
cd product-service && npm install
cd order-service && npm install
cd user-service && go mod download
```

### Update dependencies

```bash
# Node.js services
npm update

# Go service
go get -u ./...
go mod tidy
```

## 🔧 Development

### Generate protobuf code (if you modify .proto files)

```bash
# For Go (User Service)
cd user-service
protoc --go_out=. --go_opt=paths=source_relative \
  --go-grpc_out=. --go-grpc_opt=paths=source_relative \
  ../proto/user.proto

# For Node.js (API Gateway, Order Service)
# No generation needed - uses @grpc/proto-loader at runtime

# For NestJS (Product Service)
# No generation needed - uses @grpc/proto-loader at runtime
```

### Hot reload during development

```bash
# Product Service (NestJS)
cd product-service
npm run start:dev

# API Gateway / Order Service
npm install -g nodemon
nodemon index.js

# User Service (Go)
go install github.com/cosmtrek/air@latest
air
```

## 📊 Monitoring

### Health checks

```bash
# API Gateway
curl http://localhost:3000/health

# Individual services (if health endpoints added)
curl http://localhost:50051/health
curl http://localhost:50052/health
curl http://localhost:50053/health
```

### Performance testing

```bash
# Install Apache Bench
# Windows: Download from Apache website
# Linux: sudo apt-get install apache2-utils
# Mac: brew install ab

# Test API Gateway
ab -n 1000 -c 10 http://localhost:3000/health

# Test with POST
ab -n 100 -c 10 -p user.json -T application/json \
  http://localhost:3000/api/users
```

## 🛠️ Troubleshooting

### Reset everything

```bash
# Stop all services
docker-compose down -v

# Remove node_modules
rm -rf api-gateway/node_modules
rm -rf product-service/node_modules
rm -rf order-service/node_modules

# Reinstall
install.bat
```

### Clear Go cache

```bash
cd user-service
go clean -cache -modcache -i -r
go mod download
```

### Port conflicts

```bash
# Kill process on port (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Kill process on port (Linux/Mac)
lsof -ti:3000 | xargs kill -9
```

## 📝 Useful Git Commands

```bash
# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "Your message"

# Push
git push origin main

# Pull latest
git pull origin main

# Create branch
git checkout -b feature/your-feature

# View logs
git log --oneline --graph
```

## 🎯 Quick Reference

### Ports

- `3000` - API Gateway (HTTP)
- `50051` - User Service (gRPC)
- `50052` - Product Service (gRPC)
- `50053` - Order Service (gRPC)

### Service URLs (Local)

- API Gateway: `http://localhost:3000`
- User Service: `localhost:50051`
- Product Service: `localhost:50052`
- Order Service: `localhost:50053`

### Service URLs (Docker)

- API Gateway: `http://api-gateway:3000`
- User Service: `user-service:50051`
- Product Service: `product-service:50052`
- Order Service: `order-service:50053`

### Technologies

- **API Gateway**: Node.js + Express
- **User Service**: Golang + gRPC
- **Product Service**: NestJS + gRPC
- **Order Service**: Node.js + gRPC
- **Protocol**: gRPC + Protocol Buffers

### File Structure

```
proto/          - Protocol Buffer definitions
api-gateway/    - API Gateway service
user-service/   - User microservice (Go)
product-service/- Product microservice (NestJS)
order-service/  - Order microservice (Node.js)
```
