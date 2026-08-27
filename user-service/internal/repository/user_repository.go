package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"user-service/internal/domain"
)

// UserRepository định nghĩa hợp đồng truy cập dữ liệu user.
// Tách interface giúp dễ thay đổi storage và viết test (mock).
type UserRepository interface {
	Create(ctx context.Context, name, email string) (*domain.User, error)
	GetByID(ctx context.Context, id string) (*domain.User, error)
}

// PostgresUserRepository là implementation dùng Postgres.
type PostgresUserRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresUserRepository tạo repository từ connection pool.
func NewPostgresUserRepository(pool *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{pool: pool}
}

func (r *PostgresUserRepository) Create(ctx context.Context, name, email string) (*domain.User, error) {
	const q = `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id::text, name, email`
	u := &domain.User{}
	if err := r.pool.QueryRow(ctx, q, name, email).Scan(&u.ID, &u.Name, &u.Email); err != nil {
		return nil, err
	}
	return u, nil
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	// So sánh dạng text để tránh lỗi parse khi id không đúng định dạng UUID.
	const q = `SELECT id::text, name, email FROM users WHERE id::text = $1`
	u := &domain.User{}
	err := r.pool.QueryRow(ctx, q, id).Scan(&u.ID, &u.Name, &u.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return u, nil
}
