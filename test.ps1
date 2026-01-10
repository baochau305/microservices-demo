# PowerShell Test Script for Microservices Demo

$BaseUrl = "http://localhost:3000"
$ErrorCount = 0

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Microservices Demo - Test Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    Write-Host "Verified Health check passed" -ForegroundColor Green
} catch {
    Write-Host "Health check failed: $_" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# Test 2: Create User
Write-Host "Test 2: Create User" -ForegroundColor Blue
try {
    $userBody = @{
        name = "John Doe"
        email = "john@example.com"
    } | ConvertTo-Json

    $user = Invoke-RestMethod -Uri "$BaseUrl/api/users" -Method Post -Body $userBody -ContentType "application/json"
    Write-Host "Verified User created successfully" -ForegroundColor Green
    $userId = $user.id
    Write-Host "User ID: $userId" -ForegroundColor Yellow
} catch {
    Write-Host "Failed to create user: $_" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# Test 3: Get User
if ($userId) {
    Write-Host "Test 3: Get User" -ForegroundColor Blue
    try {
        $user = Invoke-RestMethod -Uri "$BaseUrl/api/users/$userId" -Method Get
        Write-Host "Verified User retrieved successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to get user: $_" -ForegroundColor Red
        $ErrorCount++
    }
    Write-Host ""
}

# Test 4: Create Product
Write-Host "Test 4: Create Product" -ForegroundColor Blue
try {
    $productBody = @{
        name = "Laptop Dell XPS 15"
        price = 1500.99
    } | ConvertTo-Json

    $product = Invoke-RestMethod -Uri "$BaseUrl/api/products" -Method Post -Body $productBody -ContentType "application/json"
    Write-Host "Verified Product created successfully" -ForegroundColor Green
    $productId = $product.id
    Write-Host "Product ID: $productId" -ForegroundColor Yellow
} catch {
    Write-Host "Failed to create product: $_" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# Test 5: Get Product
if ($productId) {
    Write-Host "Test 5: Get Product" -ForegroundColor Blue
    try {
        $product = Invoke-RestMethod -Uri "$BaseUrl/api/products/$productId" -Method Get
        Write-Host "Verified Product retrieved successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to get product: $_" -ForegroundColor Red
        $ErrorCount++
    }
    Write-Host ""
}

# Test 6: Create Order
if ($userId -and $productId) {
    Write-Host "Test 6: Create Order (Service Orchestration)" -ForegroundColor Blue
    try {
        $orderBody = @{
            userId = $userId
            productId = $productId
            quantity = 2
        } | ConvertTo-Json

        $order = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Post -Body $orderBody -ContentType "application/json"
        Write-Host "Verified Order created successfully" -ForegroundColor Green
        $orderId = $order.id
        Write-Host "Order ID: $orderId" -ForegroundColor Yellow
        
        if ($order.userName -and $order.productName) {
             Write-Host "Verified Order contains aggregated data" -ForegroundColor Green
        }
    } catch {
        Write-Host "Failed to create order: $_" -ForegroundColor Red
        $ErrorCount++
    }
    Write-Host ""
}

# Test 7: Get Order
if ($orderId) {
    Write-Host "Test 7: Get Order" -ForegroundColor Blue
    try {
        $order = Invoke-RestMethod -Uri "$BaseUrl/api/orders/$orderId" -Method Get
        Write-Host "Verified Order retrieved successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to get order: $_" -ForegroundColor Red
        $ErrorCount++
    }
    Write-Host ""
}

Write-Host "==================================" -ForegroundColor Cyan
if ($ErrorCount -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
} else {
    Write-Host "Tests failed with $ErrorCount errors" -ForegroundColor Red
}
Write-Host "==================================" -ForegroundColor Cyan
