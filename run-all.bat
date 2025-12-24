@echo off
echo Starting all microservices...
echo.
echo Please open 4 separate terminal windows and run:
echo.
echo Terminal 1 - User Service (Golang):
echo   cd user-service
echo   go run main.go
echo.
echo Terminal 2 - Product Service (NestJS):
echo   cd product-service
echo   npm start
echo.
echo Terminal 3 - Order Service (Node.js):
echo   cd order-service
echo   npm start
echo.
echo Terminal 4 - API Gateway (Node.js):
echo   cd api-gateway
echo   npm start
echo.
echo After all services are running, test with:
echo   curl http://localhost:3000/health
pause
