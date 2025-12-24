FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Copy proto files
COPY ../proto ../proto

EXPOSE 50053

CMD ["node", "index.js"]
