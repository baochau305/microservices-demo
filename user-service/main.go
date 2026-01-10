package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"path/filepath"
	"sync"

	"github.com/jhump/protoreflect/desc/protoparse"
	"github.com/jhump/protoreflect/dynamic"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type UserService struct {
	users  map[string]*User
	mu     sync.RWMutex
	nextID int
}

type User struct {
	ID    string
	Email string
}

func newUserService() *UserService {
	return &UserService{
		users:  make(map[string]*User),
		nextID: 1,
	}
}

func (s *UserService) GetUser(ctx context.Context, req *dynamic.Message) (*dynamic.Message, error) {
	id := req.GetFieldByName("id").(string)

	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.users[id]
	if !exists {
		return nil, status.Errorf(codes.NotFound, "user not found: %s", id)
	}

	log.Printf("GetUser called for ID: %s", id)

	resp := dynamic.NewMessage(req.GetMessageDescriptor().GetFile().FindMessage("user.UserResponse"))
	resp.SetFieldByName("id", user.ID)
	// resp.SetFieldByName("name", user.Name)
	resp.SetFieldByName("email", user.Email)

	return resp, nil
}

func (s *UserService) CreateUser(ctx context.Context, req *dynamic.Message) (*dynamic.Message, error) {
	name := req.GetFieldByName("name").(string)
	email := req.GetFieldByName("email").(string)

	s.mu.Lock()
	defer s.mu.Unlock()

	id := fmt.Sprintf("%d", s.nextID)
	s.nextID++

	user := &User{
		ID: id,
		// Name:  name,
		Email: email,
	}

	s.users[id] = user
	log.Printf("CreateUser called: ID=%s, Name=%s, Email=%s", id, name, email)

	resp := dynamic.NewMessage(req.GetMessageDescriptor().GetFile().FindMessage("user.UserResponse"))
	resp.SetFieldByName("id", user.ID)
	// resp.SetFieldByName("name", user.Name)
	resp.SetFieldByName("email", user.Email)

	return resp, nil
}

func main() {
	// Parse proto file
	wd, _ := os.Getwd()
	protoPath := filepath.Join(filepath.Dir(wd), "proto")
	log.Printf("Looking for proto in: %s", protoPath)

	parser := protoparse.Parser{
		ImportPaths: []string{protoPath},
	}

	fds, err := parser.ParseFiles("user.proto")
	if err != nil {
		log.Fatalf("Failed to parse user.proto: %v", err)
	}

	userServiceDesc := fds[0].FindService("user.UserService")
	if userServiceDesc == nil {
		log.Fatal("Could not find UserService definition")
	}

	service := newUserService()

	// Generic handler
	handler := func(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
		methodName, ok := grpc.Method(ctx)
		if !ok {
			return nil, status.Error(codes.Internal, "method name not found")
		}

		// Extract just the method name from /user.UserService/MethodName
		_, method := filepath.Split(methodName)

		methodDesc := userServiceDesc.FindMethodByName(method)
		if methodDesc == nil {
			return nil, status.Errorf(codes.Unimplemented, "method %s not found", method)
		}

		in := dynamic.NewMessage(methodDesc.GetInputType())
		if err := dec(in); err != nil {
			return nil, err
		}

		if method == "GetUser" {
			return service.GetUser(ctx, in)
		} else if method == "CreateUser" {
			return service.CreateUser(ctx, in)
		}

		return nil, status.Errorf(codes.Unimplemented, "method %s not implemented", method)
	}

	// Define ServiceDesc manually
	sd := &grpc.ServiceDesc{
		ServiceName: "user.UserService",
		HandlerType: (*interface{})(nil), // Use generic interface to avoid reflect panic
		Methods: []grpc.MethodDesc{
			{MethodName: "GetUser", Handler: handler},
			{MethodName: "CreateUser", Handler: handler},
		},
		Metadata: "user.proto",
	}

	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	s := grpc.NewServer()
	s.RegisterService(sd, service)

	log.Println("User Service (Golang) is running on port 50051 (Dynamic)...")
	if err := s.Serve(lis); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}

// Dummy Unimplemented to satisfy compiler if needed, though we use dynamic
type UnimplementedUserServiceServer struct{}
