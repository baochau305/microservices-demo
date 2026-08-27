package service

import (
	"context"
	"strings"

	"user-service/internal/domain"
	"user-service/internal/repository"
)

// UserService chứa business logic của domain User.
type UserService struct {
	repo repository.UserRepository
}

// NewUserService tạo service với repository được inject.
func NewUserService(repo repository.UserRepository) *UserService {
	return &UserService{repo: repo}
}

// CreateUser validate input và tạo user mới.
func (s *UserService) CreateUser(ctx context.Context, name, email string) (*domain.User, error) {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)

	if name == "" {
		return nil, domain.NewValidationError("name is required")
	}
	if email == "" {
		return nil, domain.NewValidationError("email is required")
	}

	return s.repo.Create(ctx, name, email)
}

// GetUser lấy user theo id.
func (s *UserService) GetUser(ctx context.Context, id string) (*domain.User, error) {
	if strings.TrimSpace(id) == "" {
		return nil, domain.NewValidationError("id is required")
	}
	return s.repo.GetByID(ctx, id)
}
