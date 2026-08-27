-- Database-per-service: mỗi service sở hữu một database riêng.
-- Script này chạy 1 lần khi Postgres container khởi tạo lần đầu.

CREATE DATABASE userdb;
CREATE DATABASE productdb;
CREATE DATABASE orderdb;
CREATE DATABASE paymentdb;
CREATE DATABASE analyticsdb;
