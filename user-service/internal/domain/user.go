package domain

import "errors"

// ErrUserNotFound được trả về khi không tìm thấy user theo id.
var ErrUserNotFound = errors.New("user not found")

// User là entity nghiệp vụ của domain User.
type User struct {
	ID    string
	Name  string
	Email string
}

// ValidationError đại diện cho lỗi input không hợp lệ (map sang gRPC InvalidArgument).
type ValidationError struct {
	Msg string
}

func (e *ValidationError) Error() string { return e.Msg }

// NewValidationError tạo một ValidationError với message cho trước.
func NewValidationError(msg string) error {
	return &ValidationError{Msg: msg}
}
