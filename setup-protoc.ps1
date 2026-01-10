# Script to install protoc and generate Go code for User Service

Write-Host "Installing Protocol Buffer Compiler (protoc)..." -ForegroundColor Cyan

# Check if protoc is already installed
$protocVersion = & protoc --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "protoc is already installed: $protocVersion" -ForegroundColor Green
} else {
    Write-Host "protoc not found. Please install it manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Using Chocolatey (Recommended)" -ForegroundColor Cyan
    Write-Host "  choco install protoc"
    Write-Host ""
    Write-Host "Option 2: Manual Download" -ForegroundColor Cyan
    Write-Host "  1. Download from: https://github.com/protocolbuffers/protobuf/releases"
    Write-Host "  2. Extract and add to PATH"
    Write-Host ""
    Write-Host "Option 3: Using winget" -ForegroundColor Cyan
    Write-Host "  winget install protobuf"
    Write-Host ""
    
    $install = Read-Host "Do you want to install using Chocolatey? (y/n)"
    if ($install -eq "y") {
        choco install protoc -y
    } else {
        Write-Host "Please install protoc manually and run this script again." -ForegroundColor Red
        exit 1
    }
}

# Install Go protoc plugins
Write-Host ""
Write-Host "Installing Go protoc plugins..." -ForegroundColor Cyan

go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

Write-Host ""
Write-Host "Generating Go code from proto files..." -ForegroundColor Cyan

# Generate code
cd user-service
protoc --go_out=. --go_opt=paths=source_relative `
    --go-grpc_out=. --go-grpc_opt=paths=source_relative `
    ../proto/user.proto

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Code generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run the User Service:" -ForegroundColor Cyan
    Write-Host "  cd user-service"
    Write-Host "  go run main.go"
} else {
    Write-Host ""
    Write-Host "✗ Code generation failed!" -ForegroundColor Red
}
