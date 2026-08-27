package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool khởi tạo connection pool tới Postgres và kiểm tra kết nối.
func NewPool(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

// Migrate tạo schema cần thiết nếu chưa tồn tại (idempotent).
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	const schema = `
CREATE TABLE IF NOT EXISTS users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`
	_, err := pool.Exec(ctx, schema)
	return err
}
