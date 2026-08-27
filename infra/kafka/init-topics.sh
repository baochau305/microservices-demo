#!/bin/bash
# ============================================================================
# Tạo topic Kafka tường minh, thay cho auto-create.
#
# Với auto-create, topic sinh ra ngầm lúc producer gửi message đầu tiên và luôn
# chỉ có 1 partition. Tệ hơn: analytics-service subscribe TRƯỚC thời điểm đó nên
# log đầy UNKNOWN_TOPIC_OR_PARTITION rồi mới tự khỏi — nhìn y như lỗi thật.
#
# 3 partition để thấy được cơ chế phân partition. Thứ tự event của MỘT order vẫn
# được đảm bảo, vì producer dùng key = orderId nên mọi event cùng order luôn rơi
# vào cùng một partition (Kafka chỉ đảm bảo thứ tự trong phạm vi partition).
# ============================================================================
set -e

BOOTSTRAP="${KAFKA_BOOTSTRAP:-kafka:9092}"

kafka-topics --bootstrap-server "$BOOTSTRAP" \
  --create --if-not-exists \
  --topic order-events \
  --partitions 3 \
  --replication-factor 1

# DLQ phía Kafka. Trước đây analytics-service `catch` rồi chỉ log: offset vẫn
# được commit nên message hỏng biến mất không dấu vết. RabbitMQ thì có DLQ đầy
# đủ — sự bất đối xứng đó dễ khiến người đọc tưởng Kafka "không cần" DLQ.
kafka-topics --bootstrap-server "$BOOTSTRAP" \
  --create --if-not-exists \
  --topic order-events-dlq \
  --partitions 1 \
  --replication-factor 1

echo "Kafka topics ready:"
kafka-topics --bootstrap-server "$BOOTSTRAP" --list
