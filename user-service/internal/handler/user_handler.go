package handler

import (
	"context"
	"errors"
	"log/slog"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"user-service/internal/domain"
	"user-service/internal/service"
	pb "user-service/proto"
)

// UserHandler là lớp transport (gRPC) — chỉ chuyển đổi request/response,
// mọi business logic nằm ở service.
type UserHandler struct {
	pb.UnimplementedUserServiceServer
	svc *service.UserService
	log *slog.Logger
}

// NewUserHandler tạo gRPC handler.
func NewUserHandler(svc *service.UserService, log *slog.Logger) *UserHandler {
	return &UserHandler{svc: svc, log: log}
}

func (h *UserHandler) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.UserResponse, error) {
	h.log.InfoContext(ctx, "GetUser called", "id", req.GetId())

	u, err := h.svc.GetUser(ctx, req.GetId())
	if err != nil {
		h.log.WarnContext(ctx, "GetUser failed", "id", req.GetId(), "err", err)
		return nil, toGRPCError(err)
	}

	return &pb.UserResponse{Id: u.ID, Name: u.Name, Email: u.Email}, nil
}

func (h *UserHandler) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.UserResponse, error) {
	h.log.InfoContext(ctx, "CreateUser called", "email", req.GetEmail())

	u, err := h.svc.CreateUser(ctx, req.GetName(), req.GetEmail())
	if err != nil {
		h.log.WarnContext(ctx, "CreateUser failed", "err", err)
		return nil, toGRPCError(err)
	}

	return &pb.UserResponse{Id: u.ID, Name: u.Name, Email: u.Email}, nil
}

// toGRPCError map lỗi domain sang gRPC status code phù hợp.
func toGRPCError(err error) error {
	var ve *domain.ValidationError
	switch {
	case errors.Is(err, domain.ErrUserNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.As(err, &ve):
		return status.Error(codes.InvalidArgument, err.Error())
	default:
		return status.Error(codes.Internal, "internal error")
	}
}
