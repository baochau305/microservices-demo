package config

import (
	"fmt"
	"os"
)

// Config chứa toàn bộ cấu hình runtime của user-service, load từ biến môi trường.
type Config struct {
	GRPCPort    string
	DatabaseURL string
	LogLevel    string
}

// Load đọc config từ env và validate các giá trị bắt buộc.
func Load() (*Config, error) {
	cfg := &Config{
		GRPCPort:    getEnv("GRPC_PORT", "50051"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/userdb"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
