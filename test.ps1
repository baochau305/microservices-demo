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
    Write-Host "✓ Health check passed" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
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
    Write-Host "✓ User created successfully" -ForegroundColor Green
    Write-Host "Response: $($user | ConvertTo-Json -Compress)" -ForegroundColor Gray
    $userId = $user.id
    Write-Host "User ID: $userId" -ForegroundColor Yellow
} catch {
    Write-Host "✗ Failed to create user: $_" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# Test 3: Get User
Write-Host "Test 3: Get User" -ForegroundColor Blue
try {
    $user = Invoke-RestMethod -Uri "$BaseUrl/api/users/$userId" -Method Get
    Write-Host "✓ User retrieved successfully" -ForegroundColor Green
    Write-Host "Response: $($user | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get user: $_" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# Test 4: Create Product
Write-Host "Test 4: Create Product" -ForegroundColor Blue
try {
    $productBody = @{
        name = "Laptop Dell XPS 15"
        price = 1500.99
    } | ConvertTo-Json

    $product = Invoke-RestMethod -Uri "$BaseUrl/api/products" -Method Post -Body $productBody -ContentType "application/json"
    Write-Host "✓ Product created successfully" -ForegroundColor Green
    Write-Host "Response: $($product | ConvertTo-Json -Compress)" -ForegroundColor Gray
    $productId = $product.id
    Write-Host "Product ID: $productId" -ForegroundColor Yellow
} catch {
    Write-Host "✗ Failed to create product: $_" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# Test 5: Get Product
Write-Host "Test 5: Get Product" -ForegroundColor Blue
try {
    $product = Invoke-RestMethod -Uri "$BaseUrl/api/products/$productId" -Method Get
    Write-Host "✓ Product retrieved successfully" -ForegroundColor Green
    Write-Host "Response: $($product | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get product: $_" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# Test 6: Create Order (Service Orchestration)
Write-Host "Test 6: Create Order (Service Orchestration)" -ForegroundColor Blue
Write-Host "This will test Order Service calling User + Product services via gRPC" -ForegroundColor Gray
try {
    $orderBody = @{
        userId = $userId
        productId = $productId
        quantity = 2
    } | ConvertTo-Json

    $order = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Post -Body $orderBody -ContentType "application/json"
    Write-Host "✓ Order created successfully" -ForegroundColor Green
    Write-Host "Response: $($order | ConvertTo-Json)" -ForegroundColor Gray
    $orderId = $order.id
    Write-Host "Order ID: $orderId" -ForegroundColor Yellow
    
    # Verify order contains aggregated data
    if ($order.userName -and $order.productName -and $order.totalPrice) {
        Write-Host "✓ Order contains aggregated data from User and Product services" -ForegroundColor Green
    } else {
        Write-Host "✗ Order missing aggregated data" -ForegroundColor Red
        $ErrorCount++
    }
} catch {
    Write-Host "✗ Failed to create order: $_" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# Test 7: Get Order
Write-Host "Test 7: Get Order" -ForegroundColor Blue
try {
    $order = Invoke-RestMethod -Uri "$BaseUrl/api/orders/$orderId" -Method Get
    Write-Host "✓ Order retrieved successfully" -ForegroundColor Green
    Write-Host "Response: $($order | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get order: $_" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
if ($ErrorCount -eq 0) {
    Write-Host "All tests passed! ✓" -ForegroundColor Green
} else {
    Write-Host "Tests failed with $ErrorCount error(s)" -ForegroundColor Red
}
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  User ID: $userId" -ForegroundColor White
    Write-Host "  Product ID: $productId" -ForegroundColor White
    Write-Host "  Order ID: $orderId" -ForegroundColor White
    Write-Host ""
    Write-Host "The system is working correctly!" -ForegroundColor Green
    Write-Host "- API Gateway is routing requests properly" -ForegroundColor White
    Write-Host "- User Service (Golang) is responding" -ForegroundColor White
    Write-Host "- Product Service (NestJS) is responding" -ForegroundColor White
    Write-Host "- Order Service (Node.js) is orchestrating calls via gRPC" -ForegroundColor White
}

exit $ErrorCount
