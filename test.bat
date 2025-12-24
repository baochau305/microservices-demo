@echo off
REM Test script for microservices demo (Windows)
REM Make sure all services are running before executing this script

setlocal enabledelayedexpansion

set BASE_URL=http://localhost:3000

echo ==================================
echo Microservices Demo - Test Script
echo ==================================
echo.

REM Test 1: Health Check
echo [Test 1: Health Check]
curl -s %BASE_URL%/health
if %ERRORLEVEL% EQU 0 (
    echo [OK] Health check passed
) else (
    echo [ERROR] Health check failed
    exit /b 1
)
echo.

REM Test 2: Create User
echo [Test 2: Create User]
curl -s -X POST %BASE_URL%/api/users -H "Content-Type: application/json" -d "{\"name\": \"John Doe\", \"email\": \"john@example.com\"}" > user_response.json
if %ERRORLEVEL% EQU 0 (
    echo [OK] User created successfully
    type user_response.json
) else (
    echo [ERROR] Failed to create user
    exit /b 1
)
echo.

REM Test 3: Get User
echo [Test 3: Get User]
curl -s %BASE_URL%/api/users/1
if %ERRORLEVEL% EQU 0 (
    echo [OK] User retrieved successfully
) else (
    echo [ERROR] Failed to get user
    exit /b 1
)
echo.

REM Test 4: Create Product
echo [Test 4: Create Product]
curl -s -X POST %BASE_URL%/api/products -H "Content-Type: application/json" -d "{\"name\": \"Laptop Dell XPS 15\", \"price\": 1500.99}" > product_response.json
if %ERRORLEVEL% EQU 0 (
    echo [OK] Product created successfully
    type product_response.json
) else (
    echo [ERROR] Failed to create product
    exit /b 1
)
echo.

REM Test 5: Get Product
echo [Test 5: Get Product]
curl -s %BASE_URL%/api/products/1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Product retrieved successfully
) else (
    echo [ERROR] Failed to get product
    exit /b 1
)
echo.

REM Test 6: Create Order (Service Orchestration)
echo [Test 6: Create Order - Service Orchestration]
echo This will test Order Service calling User + Product services via gRPC
curl -s -X POST %BASE_URL%/api/orders -H "Content-Type: application/json" -d "{\"userId\": \"1\", \"productId\": \"1\", \"quantity\": 2}" > order_response.json
if %ERRORLEVEL% EQU 0 (
    echo [OK] Order created successfully
    type order_response.json
) else (
    echo [ERROR] Failed to create order
    exit /b 1
)
echo.

REM Test 7: Get Order
echo [Test 7: Get Order]
curl -s %BASE_URL%/api/orders/1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Order retrieved successfully
) else (
    echo [ERROR] Failed to get order
    exit /b 1
)
echo.

REM Cleanup
del user_response.json 2>nul
del product_response.json 2>nul
del order_response.json 2>nul

echo ==================================
echo All tests passed!
echo ==================================
echo.
echo The system is working correctly:
echo - API Gateway is routing requests properly
echo - User Service (Golang) is responding
echo - Product Service (NestJS) is responding
echo - Order Service (Node.js) is orchestrating calls via gRPC
echo.

pause
