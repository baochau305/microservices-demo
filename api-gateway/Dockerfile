# Build context = repo root (xem docker-compose.yml) để copy được thư mục proto/ dùng chung.
FROM node:20-alpine

WORKDIR /app

COPY api-gateway/package*.json ./
RUN npm ci --omit=dev

COPY api-gateway/ ./
COPY proto/ ./proto/

EXPOSE 3000

CMD ["node", "index.js"]
