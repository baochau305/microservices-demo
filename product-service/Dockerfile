# Build context = repo root (xem docker-compose.yml) để copy được thư mục proto/ dùng chung.
FROM node:20-alpine AS builder

WORKDIR /app

COPY product-service/package*.json ./
RUN npm ci

COPY product-service/ ./
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine

WORKDIR /app

COPY product-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY proto/ ./proto/

EXPOSE 50052

CMD ["node", "dist/main"]
