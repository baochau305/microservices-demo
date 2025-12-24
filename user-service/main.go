package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"sync"

	pb "user-service/proto"

	"google.golang.org/grpc"
)

type server struct {
	pb.UnimplementedUserServiceServer
	users map[string]*pb.UserResponse
	mu    sync.RWMutex
	nextID int
}

func newServer() *server {
	return &server{
		users: make(map[string]*pb.UserResponse),
		nextID: 1,
	}
}

func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.UserResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.users[req.Id]
	if !exists {
		return nil, fmt.Errorf("user not found: %s", req.Id)
	}

	log.Printf("GetUser called for ID: %s", req.Id)
	return user, nil
}

func (s *server) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.UserResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := fmt.Sprintf("%d", s.nextID)
	s.nextID++

	user := &pb.UserResponse{
		Id:    id,
		Name:  req.Name,
		Email: req.Email,
	}

	s.users[id] = user
	log.Printf("CreateUser called: ID=%s, Name=%s, Email=%s", id, req.Name, req.Email)

	return user, nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterUserServiceServer(s, newServer())

	log.Println("User Service (Golang) is running on port 50051...")
	if err := s.Serve(lis); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}
