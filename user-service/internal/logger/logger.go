package logger

import (
	"context"
	"log/slog"
	"os"

	"user-service/internal/correlation"
)

// contextHandler tự thêm correlationId vào mọi log record, lấy từ context.
//
// Tương đương `mixin` của pino bên các service Node: không phải truyền tay
// correlation ID qua từng lời gọi log, và không thể quên.
// Điều kiện: phải dùng các hàm nhận context (InfoContext, WarnContext...).
type contextHandler struct {
	slog.Handler
}

func (h contextHandler) Handle(ctx context.Context, r slog.Record) error {
	if id := correlation.FromContext(ctx); id != "" {
		r.AddAttrs(slog.String("correlationId", id))
	}
	return h.Handler.Handle(ctx, r)
}

// WithAttrs/WithGroup phải trả về contextHandler, nếu chỉ dựa vào embedding thì
// logger.With(...) sẽ trả về handler bên trong và mất luôn phần bọc này.
func (h contextHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return contextHandler{h.Handler.WithAttrs(attrs)}
}

func (h contextHandler) WithGroup(name string) slog.Handler {
	return contextHandler{h.Handler.WithGroup(name)}
}

// New tạo structured logger (JSON) dựa trên log level cấu hình.
func New(level string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	base := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})
	return slog.New(contextHandler{base}).With("service", "user-service")
}
