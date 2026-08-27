# Build context = repo root (xem docker-compose.yml) để copy được thư mục proto/ dùng chung.
FROM node:20-alpine

WORKDIR /app

COPY payment-service/package*.json ./
RUN npm ci --omit=dev

COPY payment-service/ ./
COPY proto/ ./proto/

EXPOSE 50054

CMD ["node", "index.js"]
