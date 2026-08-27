package server

import (
	"log/slog"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"user-service/internal/correlation"
	"user-service/internal/handler"
	pb "user-service/proto"
)

// Server bọc gRPC server cùng listener và logger.
type Server struct {
	grpc *grpc.Server
	lis  net.Listener
	log  *slog.Logger
}

// New tạo gRPC server, đăng ký UserService, health check và reflection.
func New(port string, h *handler.UserHandler, log *slog.Logger) (*Server, error) {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return nil, err
	}

	// Interceptor đưa correlation ID từ metadata của caller vào context, để
	// logger tự gắn vào mọi log record phía dưới.
	s := grpc.NewServer(grpc.UnaryInterceptor(correlation.UnaryServerInterceptor()))
	pb.RegisterUserServiceServer(s, h)

	// gRPC health checking protocol (cho readiness/liveness probe).
	hs := health.NewServer()
	hs.SetServingStatus("user.UserService", healthpb.HealthCheckResponse_SERVING)
	healthpb.RegisterHealthServer(s, hs)

	// Reflection giúp debug bằng grpcurl.
	reflection.Register(s)

	return &Server{grpc: s, lis: lis, log: log}, nil
}

// Start chạy gRPC server (blocking).
func (s *Server) Start() error {
	s.log.Info("user-service gRPC server listening", "addr", s.lis.Addr().String())
	return s.grpc.Serve(s.lis)
}

// Stop dừng server theo kiểu graceful.
func (s *Server) Stop() {
	s.log.Info("shutting down gRPC server")
	s.grpc.GracefulStop()
}
