// Package correlation truyền correlation ID qua context và gRPC metadata.
//
// Mục đích: `docker compose logs | grep <id>` ra được toàn bộ đường đi của một
// order qua cả 6 service. Bên Node dùng AsyncLocalStorage; Go thì đã có sẵn
// context.Context nên chỉ cần gắn vào đó.
package correlation

import (
	"context"
	"crypto/rand"
	"fmt"

	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

// Header dùng chung với các service Node (xem src/context/index.js).
const Header = "x-correlation-id"

type ctxKey struct{}

// WithID gắn correlation ID vào context.
func WithID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxKey{}, id)
}

// FromContext lấy correlation ID, trả về "" nếu không có.
func FromContext(ctx context.Context) string {
	id, _ := ctx.Value(ctxKey{}).(string)
	return id
}

// NewID sinh UUIDv4. Tự viết để khỏi thêm dependency chỉ vì một hàm.
func NewID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "unknown"
	}
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant RFC 4122
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// UnaryServerInterceptor đọc correlation ID từ metadata của caller và đưa vào
// context, để mọi log phía dưới (dùng *Context) tự mang đúng ID.
//
// Không có metadata (vd gọi thẳng bằng grpcurl) thì sinh ID mới, để request nào
// cũng truy vết được.
func UnaryServerInterceptor() grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req any,
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (any, error) {
		id := ""
		if md, ok := metadata.FromIncomingContext(ctx); ok {
			if values := md.Get(Header); len(values) > 0 {
				id = values[0]
			}
		}
		if id == "" {
			id = NewID()
		}
		return handler(WithID(ctx, id), req)
	}
}
