#!/bin/sh
# ============================================================================
# Khai báo topology RabbitMQ MỘT LẦN, ở tầng hạ tầng.
#
# Trước đây order-service (publisher) và notification-service (consumer) cùng
# assertQueue "order_notifications" nhưng arguments khác nhau: consumer có
# x-dead-letter-exchange, publisher thì không. Theo AMQP, declare lại một queue
# đã tồn tại với arguments khác sẽ trả 406 PRECONDITION_FAILED và đóng channel
# -> service khởi động sau sẽ kẹt retry vĩnh viễn.
#
# Giờ chỉ script này khai báo; hai service kia chỉ checkQueue nên không thể lệch.
#
# ---------------------------------------------------------------------------
# Luồng retry (RabbitMQ tự lo phần delay, app không dùng setTimeout):
#
#   order_notifications ──xử lý lỗi──> order_notifications_retry
#          ^                                    │ (nằm đủ TTL rồi hết hạn)
#          └────────── dead-letter ─────────────┘
#
#   quá số lần retry ──nack(requeue=false)──> order_notifications_dlq
#
# Vì sao không requeue thẳng vào queue chính: message requeue quay lại ĐẦU queue
# và với prefetch=1 nó chặn toàn bộ queue trong lúc chờ backoff (head-of-line
# blocking). Đẩy sang retry queue thì consumer rảnh ngay để xử lý message khác.
# ============================================================================
set -e

RMQ="rabbitmqadmin -H ${RABBITMQ_HOST:-rabbitmq} -u ${RABBITMQ_USER:-guest} -p ${RABBITMQ_PASS:-guest}"

MAIN_QUEUE=order_notifications
RETRY_QUEUE=order_notifications_retry
DLQ=order_notifications_dlq
RETRY_DELAY_MS="${RETRY_DELAY_MS:-5000}"

echo "Declaring queue: $DLQ (terminal — message nằm lại đây để soi, không ai tự ack)"
$RMQ declare queue name="$DLQ" durable=true

# TTL cố định, không phải exponential backoff. Muốn backoff tăng dần thì cần
# nhiều retry queue theo từng mức delay (1s/5s/30s), vì per-message TTL trong
# CÙNG một queue lại đẻ ra head-of-line blocking đúng như cái ta vừa bỏ đi:
# message hết hạn theo thứ tự trong queue, cái TTL dài đứng đầu chặn cái sau.
echo "Declaring queue: $RETRY_QUEUE (ttl=${RETRY_DELAY_MS}ms, hết hạn -> $MAIN_QUEUE)"
$RMQ declare queue name="$RETRY_QUEUE" durable=true \
  "arguments={\"x-message-ttl\":$RETRY_DELAY_MS,\"x-dead-letter-exchange\":\"\",\"x-dead-letter-routing-key\":\"$MAIN_QUEUE\"}"

echo "Declaring queue: $MAIN_QUEUE (dead-letter -> $DLQ)"
if ! $RMQ declare queue name="$MAIN_QUEUE" durable=true \
  "arguments={\"x-dead-letter-exchange\":\"\",\"x-dead-letter-routing-key\":\"$DLQ\"}"; then
  cat <<EOF

------------------------------------------------------------------------
Không declare được queue "$MAIN_QUEUE".

Nguyên nhân thường gặp: volume rabbitmq_data còn queue cũ từ phiên bản trước,
được khai báo với arguments khác -> AMQP trả 406 PRECONDITION_FAILED.

Cách xử lý (chọn một):
  1. Xoá sạch volume rồi chạy lại:
       docker compose down -v && docker compose up -d --build
  2. Chỉ xoá riêng queue cũ (mất message đang tồn trong queue):
       docker compose exec rabbitmq \\
         rabbitmqadmin -u guest -p guest delete queue name=$MAIN_QUEUE
------------------------------------------------------------------------
EOF
  exit 1
fi

echo "RabbitMQ topology ready"
