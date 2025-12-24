# 🤝 Contributing Guide

Cảm ơn bạn quan tâm đến việc cải thiện dự án Microservices Demo!

## 🎯 Mục đích dự án

Dự án này được tạo ra để:

- Demo cách hoạt động của microservices architecture
- Giảng dạy gRPC và Protocol Buffers
- Minh họa API Gateway pattern
- Thực hành polyglot development (Go, TypeScript, JavaScript)

## 🚀 Các cách contribute

### 1. Báo lỗi (Bug Reports)

- Mô tả chi tiết lỗi
- Các bước để reproduce
- Expected vs Actual behavior
- Screenshots nếu có
- Environment (OS, Node version, Go version)

### 2. Đề xuất tính năng (Feature Requests)

- Mô tả tính năng
- Use case
- Tại sao tính năng này hữu ích
- Implementation ideas (optional)

### 3. Cải thiện Documentation

- Sửa typos
- Thêm examples
- Cải thiện explanations
- Thêm diagrams

### 4. Code Contributions

- Bug fixes
- New features
- Performance improvements
- Code refactoring

## 📋 Development Setup

### Prerequisites

- Node.js 16+
- Go 1.19+
- Git
- Docker (optional)

### Setup

```bash
# 1. Fork repository

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/microservices-demo.git
cd microservices-demo

# 3. Install dependencies
install.bat  # Windows
./install.sh # Linux/Mac

# 4. Create branch
git checkout -b feature/your-feature-name

# 5. Make changes

# 6. Test
test.ps1  # hoặc test.bat, test.sh

# 7. Commit
git add .
git commit -m "feat: your feature description"

# 8. Push
git push origin feature/your-feature-name

# 9. Create Pull Request
```

## 📝 Coding Standards

### General

- Viết code rõ ràng, dễ hiểu
- Thêm comments cho logic phức tạp
- Follow existing code style
- Write meaningful commit messages

### JavaScript/Node.js

- Use ES6+ features
- Use const/let instead of var
- Use arrow functions
- Add error handling

### TypeScript/NestJS

- Use proper types
- Follow NestJS conventions
- Use dependency injection
- Add decorators properly

### Go

- Follow Go conventions
- Use gofmt
- Handle errors properly
- Add comments for exported functions

### Protocol Buffers

- Use clear field names
- Add comments
- Follow proto3 syntax
- Version your APIs

## 🧪 Testing

Trước khi submit PR, đảm bảo:

```bash
# 1. All services start without errors
# 2. Run test suite
test.ps1

# 3. Test manually
curl http://localhost:3000/health

# 4. Docker build works
docker-compose build

# 5. Docker run works
docker-compose up
```

## 📦 Commit Message Format

Sử dụng [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(user-service): add email validation

Add email format validation when creating users.
Validates email using regex pattern.

Closes #123

---

fix(api-gateway): handle connection timeout

Add timeout handling for gRPC calls to prevent hanging requests.

---

docs(readme): update installation instructions

Add Windows-specific installation steps.
```

## 🎨 Code Style

### JavaScript/TypeScript

```javascript
// Good
const getUserById = async (id) => {
  try {
    const user = await userService.getUser(id);
    return user;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

// Bad
function getUserById(id) {
  return userService.getUser(id);
}
```

### Go

```go
// Good
func GetUser(id string) (*User, error) {
    user, exists := users[id]
    if !exists {
        return nil, fmt.Errorf("user not found: %s", id)
    }
    return user, nil
}

// Bad
func getUser(id string) *User {
    return users[id]
}
```

## 🔍 Pull Request Process

1. **Update Documentation**

   - Update README.md if needed
   - Update relevant .md files
   - Add examples if applicable

2. **Test Thoroughly**

   - Run all test scripts
   - Test manually
   - Test with Docker

3. **Create PR**

   - Clear title
   - Detailed description
   - Link related issues
   - Add screenshots if UI changes

4. **Review Process**
   - Address review comments
   - Keep PR focused
   - Rebase if needed

## 🌟 Improvement Ideas

### Easy (Good First Issues)

- [ ] Add more test cases
- [ ] Improve error messages
- [ ] Add input validation
- [ ] Fix typos in documentation
- [ ] Add more examples

### Medium

- [ ] Add health check endpoints
- [ ] Implement logging middleware
- [ ] Add request/response logging
- [ ] Create Postman collection
- [ ] Add environment variables validation

### Advanced

- [ ] Add database integration
- [ ] Implement authentication (JWT)
- [ ] Add caching layer (Redis)
- [ ] Implement circuit breaker
- [ ] Add distributed tracing
- [ ] Create Kubernetes manifests
- [ ] Add monitoring (Prometheus)
- [ ] Implement service discovery

## 📚 Resources

### Microservices

- [Microservices.io](https://microservices.io/)
- [Martin Fowler - Microservices](https://martinfowler.com/microservices/)

### gRPC

- [gRPC Official Docs](https://grpc.io/docs/)
- [Protocol Buffers Guide](https://protobuf.dev/)

### Go

- [Effective Go](https://golang.org/doc/effective_go)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)

### Node.js

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### NestJS

- [NestJS Documentation](https://docs.nestjs.com/)

## 🤔 Questions?

- Open an issue for questions
- Check existing issues first
- Be respectful and constructive

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## 🙏 Thank You!

Every contribution, no matter how small, is valuable and appreciated!

---

Happy Contributing! 🚀
