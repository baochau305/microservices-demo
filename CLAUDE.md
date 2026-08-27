# CLAUDE.md

Hướng dẫn cho Claude Code (claude.ai/code) khi làm việc trong repo này.

## Tổng quan

Hệ thống microservices demo kiểu e-commerce: tạo `order` sẽ điều phối qua nhiều
service bằng **Saga Pattern**, dùng **gRPC** cho giao tiếp đồng bộ, **Kafka** cho
event streaming, **RabbitMQ** cho async notification, và **PostgreSQL**
(database-per-service) để lưu trữ.

Đây là dự án học tập/demo nhưng được tổ chức theo hướng production: mỗi service
chia layer rõ ràng (transport → service → repository), có config tập trung,
structured logging, error handling và graceful shutdown.

## Kiến trúc & luồng

```
Client ──HTTP──> API Gateway (3000) ──gRPC──> user (50051, Go)
                                      ──gRPC──> product (50052, NestJS)
                                      ──gRPC──> order (50053, Node)
                                      ──gRPC──> payment (50054, Node)

order-service chạy Saga khi CreateOrder:
  1. GetUser (user-service)
  2. GetProduct (product-service)
  3. ProcessPayment (payment-service, retry + exponential backoff)
  4. Lưu order (Postgres: orderdb)
  5. Publish ORDER_CREATED -> Kafka "order-events" -> analytics-service (analyticsdb)
     Publish notification  -> RabbitMQ "order_notifications" -> notification-service
  Lỗi bất kỳ bước nào -> compensation (refund payment) + publish ORDER_FAILED
```

| Service | Ngôn ngữ | Port | DB | Vai trò |
|---|---|---|---|---|
| api-gateway | Node/Express | 3000 | – | HTTP→gRPC, validate, map lỗi gRPC→HTTP |
| user-service | Go | 50051 | userdb | Quản lý user |
| product-service | NestJS | 50052 | productdb | Catalog sản phẩm (TypeORM) |
| order-service | Node | 50053 | orderdb | Saga orchestrator + Kafka/RabbitMQ producer |
| payment-service | Node | 50054 | paymentdb | Thanh toán (giả lập) + retry + refund |
| notification-service | Node | – | – | Consumer RabbitMQ, email, DLQ + retry |
| analytics-service | Node | – | analyticsdb | Consumer Kafka, lưu metrics |

Hạ tầng: PostgreSQL (5432), Kafka (9092) + Zookeeper (2181), RabbitMQ (5672, UI 15672).

## Lệnh thường dùng

```bash
# Chạy toàn bộ bằng Docker (khuyên dùng)
docker compose up -d --build
docker compose logs -f order-service
docker compose down            # thêm -v để xoá data Postgres/RabbitMQ

# Build/verify từng loại service khi sửa code
cd user-service && go build ./...
cd product-service && npm install && npm run build
cd <node-service> && npm install && node --check src/server.js   # hoặc src/app.js
```

Test nhanh end-to-end (cần tạo user + product trước vì ID là UUID):

```bash
curl -X POST localhost:3000/api/users    -H 'Content-Type: application/json' -d '{"name":"John","email":"john@example.com"}'
curl -X POST localhost:3000/api/products -H 'Content-Type: application/json' -d '{"name":"Laptop","price":1200}'
# lấy id trả về rồi:
curl -X POST localhost:3000/api/orders   -H 'Content-Type: application/json' -d '{"userId":"<UID>","productId":"<PID>","quantity":2}'
```

## Cấu trúc & quy ước

**Node service** (api-gateway, order, payment, notification, analytics) theo layered:

```
<service>/
├── index.js                 # entrypoint mỏng: gọi src/server.js | src/app.js
└── src/
    ├── config/index.js      # đọc + validate biến môi trường (KHÔNG đọc process.env nơi khác)
    ├── logger/index.js      # pino, structured JSON
    ├── db/{pool,migrate}.js  # pg Pool + CREATE TABLE IF NOT EXISTS (service có DB)
    ├── proto/loader.js      # load .proto từ config.protoDir
    ├── clients/*.client.js  # gRPC client tới service khác (đã promisify)
    ├── messaging/           # kafka.producer / rabbitmq.publisher / consumer
    ├── repositories/        # toàn bộ SQL nằm ở đây
    ├── services/            # business logic
    ├── sagas/               # orchestration (chỉ order-service)
    ├── handlers/            # gRPC handlers (transport, map lỗi → grpc.status)
    └── routes/ middlewares/ utils/   # chỉ api-gateway (Express)
```

order-service có thêm `src/domain/` (hằng số nghiệp vụ, vd `ORDER_STATUS`) và
`src/clients/deadline.js` (helper tạo deadline cho gRPC).

**user-service (Go)** theo clean architecture:
`cmd/server/main.go` (wiring) → `internal/{config,logger,db,domain,repository,service,handler,server}`.
Proto generated nằm ở `user-service/proto/user.pb.go` (package `proto`). Không có
`protoc` trong môi trường — đừng cố regenerate; sửa proto thì cập nhật code thủ công.

**product-service (NestJS)** theo module:
`src/{config,database,common}` + `src/product/{entities,dto,*.controller,*.service,*.module}`.

### Quy ước quan trọng
- **Proto dùng chung** đặt ở `proto/` (root). Node/NestJS load lúc runtime qua
  `config.protoDir` (mặc định resolve về `proto/`; Docker set `PROTO_DIR=/app/proto`).
  Go compile proto vào binary.
- **Docker build context của api-gateway, order, product, payment là REPO ROOT**
  (xem `docker-compose.yml`) để copy được `proto/`. Dockerfile của chúng copy theo
  đường dẫn có tiền tố `<service>/...`. Đừng đổi về context thư mục con (sẽ vỡ proto).
- **ID là UUID** (`gen_random_uuid()` trong Postgres; order tạo UUID app-side bằng
  `crypto.randomUUID()` để dùng làm correlation id cho payment).
- **Error mapping**: handler/service ném lỗi có gắn status/code; gateway map gRPC
  status → HTTP qua `src/utils/grpc-error.js`.
- **Logging**: dùng `logger` (pino/slog), không dùng `console.log`.
- **Correlation ID** đi xuyên toàn hệ thống qua header `x-correlation-id`.
  api-gateway sinh ra (hoặc nhận từ client), rồi truyền tiếp qua **gRPC metadata**,
  **Kafka header** và **AMQP `correlationId` property**. Mỗi service khôi phục nó
  vào ngữ cảnh và logger tự gắn vào **mọi** dòng log — không truyền tay:
  - Node: `src/context/` (AsyncLocalStorage) + `mixin` của pino;
    server gRPC bọc handler bằng `withCorrelation`, client gọi `correlationMetadata()`.
  - Go: `internal/correlation` + `grpc.UnaryInterceptor`; logger là `contextHandler`
    bọc slog → **phải dùng `InfoContext`/`WarnContext`**, `Info()` thường sẽ mất ID.
  - NestJS: `src/common/correlation/` + `APP_INTERCEPTOR`. Nhớ subscribe Observable
    *bên trong* `runWithCorrelationId`, vì `next.handle()` trả về ngay còn handler
    chỉ chạy lúc subscribe — làm sai là mất ngữ cảnh.

  Tra một order: `docker compose logs | grep <correlation-id>`.
- **Config**: thêm biến mới vào `src/config` (Node) / `internal/config` (Go) /
  `src/config/configuration.ts` (NestJS) và `.env.example`, không rải `process.env`.
- **Migrations**: hiện dùng `CREATE TABLE IF NOT EXISTS` lúc startup và TypeORM
  `synchronize: true` (chỉ hợp demo). Production nên thay bằng migration tool.
- **Topology broker do hạ tầng sở hữu**, không phải app:
  - RabbitMQ: queue/DLQ khai báo một lần trong `infra/rabbitmq/init-topology.sh`
    (service `rabbitmq-init`). App chỉ được `checkQueue`, **tuyệt đối không
    `assertQueue`** — hai service assertQueue cùng tên với arguments khác nhau sẽ
    nhận 406 PRECONDITION_FAILED và kẹt retry vĩnh viễn.
  - Kafka: topic tạo trong `infra/kafka/init-topics.sh` (service `kafka-init`).
    `KAFKA_AUTO_CREATE_TOPICS_ENABLE=false` nên gõ sai tên topic sẽ báo lỗi ngay.

  Cả hai broker đều có DLQ, và **retry là việc của hạ tầng, không phải của app**:
  - RabbitMQ: `order_notifications` → lỗi thì đẩy sang `order_notifications_retry`
    (có `x-message-ttl`), hết TTL broker tự dead-letter về queue chính; quá số lần
    thì `nack(requeue=false)` → `order_notifications_dlq`. Số lần retry đọc từ
    header `x-death`, **không** giữ state trong RAM. Tuyệt đối không quay lại
    `setTimeout` + `nack(requeue=true)`: message requeue về đầu queue và với
    prefetch=1 nó chặn cả queue (head-of-line blocking).
  - Kafka: retry tại chỗ vài lần rồi publish sang topic `order-events-dlq`.
    Không được `catch` rồi chỉ log — offset vẫn commit nên message biến mất.
    Cũng không được ném lỗi ra ngoài — kafkajs retry mãi và một poison message
    sẽ chặn đứng cả partition.
  - Không service nào được tự ack DLQ: message phải nằm lại đó để soi.

  Thêm queue/topic mới thì sửa script tương ứng, và cho service dùng nó
  `depends_on: <init>: service_completed_successfully`.
- **Docker build phải có `.dockerignore`.** Có 4 file: root (dùng chung cho
  api-gateway, order, payment, product vì chúng build từ repo root) và một file
  riêng cho analytics, notification, user-service. Thiếu nó thì `node_modules`
  của host (297MB, có cả devDeps và native binary của host OS) bị copy đè lên
  đúng thứ `npm ci` vừa cài. Dùng `npm ci` chứ không `npm install` — lockfile
  phải quyết định phiên bản.
- **Mọi gRPC call đi ra phải có deadline** (`config.grpcTimeouts`). Không có
  deadline thì service treo sẽ làm saga đứng mãi và compensation không bao giờ
  chạy. Ngân sách phải lồng nhau từ ngoài vào trong: gateway `createOrder` (45s)
  > saga > `payment` (15s) > `default` (5s).

### Quy tắc viết Saga (order-service)
Xem `src/sagas/create-order.saga.js`. Ba quy tắc, phá cái nào cũng sinh lỗi tiền bạc:

1. **Đăng ký compensation TRƯỚC khi thực hiện thao tác.** Đăng ký sau thì một call
   bị `DEADLINE_EXCEEDED` (server đã làm xong, client không nhận được kết quả) sẽ
   để lại thay đổi mồ côi mà không compensation nào biết tới.
2. **Compensation phải idempotent và "blind-safe"** — gọi lại nhiều lần, hoặc gọi
   khi thao tác thực ra chưa xảy ra, đều phải an toàn. Vì vậy dùng
   `RefundByOrderId` (theo correlation id) chứ không phải `RefundPayment(paymentId)`:
   khi timeout, saga không hề biết `paymentId`.
3. **Publish event nằm NGOÀI ranh giới rollback.** Tới bước đó tiền đã trừ và
   order đã lưu hợp lệ; refund + huỷ đơn chỉ vì publish lỗi thì còn tệ hơn. Lỗi
   publish được log ở mức error (dual-write problem — lời giải là Outbox pattern).

**Semantic lock ở payment-service**: compensation có thể chạy khi charge *vẫn đang
bay*. Nên `RefundByOrderId` ghi ý định vào bảng `refund_intents` trước, rồi mới
refund; `ProcessPayment` kiểm tra bảng đó lúc commit và tự ghi `REFUNDED` thay vì
`SUCCESS` nếu đã có ý định. Cả hai chạy trong transaction giữ
`pg_advisory_xact_lock(orderId)` để tránh write-skew.

## Lưu ý
- Storage là Postgres → cần `docker compose up` (có Postgres) hoặc set `DATABASE_URL`
  khi chạy local. Tạo order yêu cầu user/product tồn tại trước.
- **Thêm database mới cho service mới** thì phải `docker compose down -v`:
  `infra/postgres/init/01-create-databases.sql` chỉ chạy khi volume `postgres_data`
  còn rỗng, nếu không service mới sẽ crash loop vì không tìm thấy DB.
- Hạ tầng (postgres, zookeeper, kafka, rabbitmq) dùng `restart: unless-stopped`;
  các service app dùng `restart: on-failure`; hai container init dùng
  `restart: "no"`. Kafka **cần** restart policy: nếu nó khởi động lại nhanh hơn
  thời gian Zookeeper hết hạn session của broker cũ, nó chết với
  `NodeExistsException` và chỉ lên được ở lần thử sau.
- payment-service giả lập tỉ lệ lỗi (`PAYMENT_FAILURE_RATE`, mặc định 0.2) để demo
  retry + Saga compensation; notification-service giả lập lỗi email để demo DLQ.
- Các file `.md` khác (`ARCHITECTURE.md`, `ADVANCED_ARCHITECTURE.md`,
  `MESSAGE_QUEUE_GUIDE.md`, `DIAGRAMS.md`) mô tả khái niệm chi tiết hơn.
