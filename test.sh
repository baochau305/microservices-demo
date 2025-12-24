#!/bin/bash

# Test script for microservices demo
# Make sure all services are running before executing this script

BASE_URL="http://localhost:3000"

echo "=================================="
echo "Microservices Demo - Test Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
response=$(curl -s -w "\n%{http_code}" $BASE_URL/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "Response: $body"
else
    echo -e "${RED}✗ Health check failed (HTTP $http_code)${NC}"
    exit 1
fi
echo ""

# Test 2: Create User
echo -e "${BLUE}Test 2: Create User${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ User created successfully${NC}"
    echo "Response: $body"
    USER_ID=$(echo "$body" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "User ID: $USER_ID"
else
    echo -e "${RED}✗ Failed to create user (HTTP $http_code)${NC}"
    exit 1
fi
echo ""

# Test 3: Get User
echo -e "${BLUE}Test 3: Get User${NC}"
response=$(curl -s -w "\n%{http_code}" $BASE_URL/api/users/$USER_ID)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ User retrieved successfully${NC}"
    echo "Response: $body"
else
    echo -e "${RED}✗ Failed to get user (HTTP $http_code)${NC}"
    exit 1
fi
echo ""

# Test 4: Create Product
echo -e "${BLUE}Test 4: Create Product${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop Dell XPS 15", "price": 1500.99}')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Product created successfully${NC}"
    echo "Response: $body"
    PRODUCT_ID=$(echo "$body" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Product ID: $PRODUCT_ID"
else
    echo -e "${RED}✗ Failed to create product (HTTP $http_code)${NC}"
    exit 1
fi
echo ""

# Test 5: Get Product
echo -e "${BLUE}Test 5: Get Product${NC}"
response=$(curl -s -w "\n%{http_code}" $BASE_URL/api/products/$PRODUCT_ID)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Product retrieved successfully${NC}"
    echo "Response: $body"
else
    echo -e "${RED}✗ Failed to get product (HTTP $http_code)${NC}"
    exit 1
fi
echo ""

# Test 6: Create Order (Service Orchestration)
echo -e "${BLUE}Test 6: Create Order (Service Orchestration)${NC}"
echo "This will test Order Service calling User + Product services via gRPC"
response=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"productId\": \"$PRODUCT_ID\", \"quantity\": 2}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Order created successfully${NC}"
    echo "Response: $body"
    ORDER_ID=$(echo "$body" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Order ID: $ORDER_ID"
else
    echo -e "${RED}✗ Failed to create order (HTTP $http_code)${NC}"
    exit 1
fi
echo ""

# Test 7: Get Order
echo -e "${BLUE}Test 7: Get Order${NC}"
response=$(curl -s -w "\n%{http_code}" $BASE_URL/api/orders/$ORDER_ID)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Order retrieved successfully${NC}"
    echo "Response: $body"
else
    echo -e "${RED}✗ Failed to get order (HTTP $http_code)${NC}"
    exit 1
fi
echo ""

# Summary
echo "=================================="
echo -e "${GREEN}All tests passed! ✓${NC}"
echo "=================================="
echo ""
echo "Summary:"
echo "  User ID: $USER_ID"
echo "  Product ID: $PRODUCT_ID"
echo "  Order ID: $ORDER_ID"
echo ""
echo "The system is working correctly!"
echo "- API Gateway is routing requests properly"
echo "- User Service (Golang) is responding"
echo "- Product Service (NestJS) is responding"
echo "- Order Service (Node.js) is orchestrating calls via gRPC"
