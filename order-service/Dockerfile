# Build context = repo root (xem docker-compose.yml) để copy được thư mục proto/ dùng chung.
FROM node:20-alpine

WORKDIR /app

COPY order-service/package*.json ./
RUN npm ci --omit=dev

COPY order-service/ ./
COPY proto/ ./proto/

EXPOSE 50053

CMD ["node", "index.js"]
