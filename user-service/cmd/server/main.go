package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"user-service/internal/config"
	"user-service/internal/db"
	"user-service/internal/handler"
	"user-service/internal/logger"
	"user-service/internal/repository"
	"user-service/internal/server"
	"user-service/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	log := logger.New(cfg.LogLevel)
	ctx := context.Background()

	// Kết nối Postgres + migrate schema.
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("failed to connect to postgres", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Error("migration failed", "err", err)
		os.Exit(1)
	}

	// Wiring các layer: repository -> service -> handler -> server.
	repo := repository.NewPostgresUserRepository(pool)
	svc := service.NewUserService(repo)
	h := handler.NewUserHandler(svc, log)

	srv, err := server.New(cfg.GRPCPort, h, log)
	if err != nil {
		log.Error("failed to create server", "err", err)
		os.Exit(1)
	}

	go func() {
		if err := srv.Start(); err != nil {
			log.Error("gRPC server error", "err", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown khi nhận SIGINT/SIGTERM.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	srv.Stop()
	log.Info("user-service stopped gracefully")
}
