FROM golang:1.25-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN CGO_ENABLED=0 go build -o /app/bin/server ./cmd/server

# ---- Runtime ----
FROM alpine:latest

RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /app/bin/server .

EXPOSE 50051

CMD ["./server"]
