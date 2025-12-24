#!/bin/bash

echo "Installing dependencies for all services..."

echo ""
echo "=== Installing API Gateway dependencies ==="
cd api-gateway
npm install
cd ..

echo ""
echo "=== Installing Product Service dependencies ==="
cd product-service
npm install
cd ..

echo ""
echo "=== Installing Order Service dependencies ==="
cd order-service
npm install
cd ..

echo ""
echo "=== Installing User Service dependencies (Go) ==="
cd user-service
go mod download
cd ..

echo ""
echo "✅ All dependencies installed successfully!"
echo ""
echo "To run the services, execute:"
echo "  ./run-all.sh"
