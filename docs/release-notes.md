# Release notes

## v1.0.0

BrewLite: ứng dụng đặt đồ uống không dùng tiền mặt (NestJS + Next.js + PostgreSQL), đáp ứng 10 Task của đề.

### Tính năng
- Menu, chi tiết sản phẩm, chọn size và topping, giỏ hàng có giới hạn theo tồn kho.
- Đăng ký, đăng nhập JWT, quên mật khẩu; chặn email gõ sai tên miền phổ biến.
- Thanh toán không tiền mặt: Ví điện tử (MoMo, ZaloPay, ShopeePay, xác nhận bằng OTP), Thẻ ngân hàng (16–19 chữ số), QR Code.
- Thanh toán idempotent (`Idempotency-Key`), kể cả khi gửi đồng thời.
- Máy trạng thái đơn hàng; trang quầy pha chế `/staff` cho barista (và API); khách thấy trạng thái tự cập nhật.
- Bảo mật: `helmet`, giới hạn tần suất, migration cho cơ sở dữ liệu.
- Không bán quá tồn kho khi đặt đồng thời; hủy đơn và đơn quá hạn tự hoàn kho.
- Mã khuyến mãi `BREW10` và điểm thưởng.
- Docker Compose chạy 3 dịch vụ; CI GitHub Actions; kiểm thử tích hợp trên PostgreSQL thật.

### Hạn chế đã biết
- Cổng thanh toán là mô phỏng, không trừ tiền thật.
- Dùng hai ORM (TypeORM cho tài khoản/đơn/thanh toán, Prisma cho sản phẩm); cả hai đều có migration.
- Trạng thái đơn cập nhật bằng cách làm mới định kỳ (10–15 giây), chưa có thông báo thời gian thực.
- Chưa có kiểm thử tự động cho frontend.
- Email chỉ được chặn lỗi gõ sai tên miền phổ biến, chưa xác minh email thật.
- Khi chưa cấu hình SMTP ở môi trường phát triển, API quên mật khẩu trả token trong phản hồi; ở production hệ thống từ chối nếu thiếu SMTP.

### Backlog phiên bản sau
Xem [product-backlog.md](product-backlog.md), mục 6.
