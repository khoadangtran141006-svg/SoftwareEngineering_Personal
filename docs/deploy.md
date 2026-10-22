# Triển khai bản demo trực tuyến

Mục tiêu: có một đường dẫn chạy được để đưa vào CV. Đây là **hướng dẫn chung**: tên nút và menu khác nhau giữa các nền tảng, hãy đối chiếu với tài liệu của nhà cung cấp bạn chọn.

> **Lưu ý trước khi chọn nền tảng**
> - Gói miễn phí, giới hạn và giá **thay đổi theo thời gian**: kiểm tra trang giá hiện hành, đừng nhập thẻ thanh toán nếu bạn chưa hiểu mình sẽ bị tính phí khi nào.
> - Dịch vụ miễn phí thường **"ngủ" khi không có truy cập**, nên lần mở đầu tiên có thể chậm hàng chục giây; cơ sở dữ liệu miễn phí có thể bị **xóa hoặc hết hạn** sau một thời gian.
> - Thanh toán trong BrewLite là **mô phỏng** (footer đã ghi rõ). Đừng nhập thông tin thẻ hoặc mật khẩu thật vào bản demo.

## 1. Mô hình triển khai

| Thành phần | Chạy ở đâu | Ghi chú |
|---|---|---|
| PostgreSQL | Dịch vụ PostgreSQL của nền tảng chạy backend, hoặc nhà cung cấp riêng | Cần chuỗi kết nối `DATABASE_URL` |
| Backend (NestJS) | Dịch vụ chạy Docker (dùng `backend/Dockerfile`) | Thư mục gốc dịch vụ: `backend` |
| Frontend (Next.js) | Nền tảng hỗ trợ Next.js, hoặc Docker (dùng `frontend/Dockerfile`) | Thư mục gốc dịch vụ: `frontend` |

Backend khi khởi động tự chạy `prisma migrate deploy`, nạp 5 sản phẩm mẫu (không ghi đè dữ liệu đã có), rồi TypeORM tự chạy migration cho các bảng còn lại.

## 2. Bước 1 – Tạo PostgreSQL

Tạo một cơ sở dữ liệu PostgreSQL 16 và lấy chuỗi kết nối dạng `postgresql://user:password@host:5432/dbname`. Nếu nhà cung cấp đưa hai chuỗi (nội bộ và bên ngoài), dùng chuỗi **nội bộ** khi backend nằm cùng nền tảng.

## 3. Bước 2 – Triển khai backend

Tạo dịch vụ web từ repo GitHub, chọn chạy bằng **Docker**, thư mục gốc `backend`, rồi đặt biến môi trường:

| Biến | Giá trị | Ghi chú |
|---|---|---|
| `NODE_ENV` | `production` | Ở production, API quên mật khẩu bắt buộc có SMTP |
| `DATABASE_URL` | chuỗi kết nối ở Bước 1 | |
| `DB_SSL` | `true` nếu nhà cung cấp yêu cầu SSL | Nhiều dịch vụ bên ngoài yêu cầu; kết nối nội bộ thường không cần |
| `JWT_SECRET` | chuỗi ngẫu nhiên dài | Tạo bằng PowerShell: `[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")` |
| `FRONTEND_URL` | địa chỉ giao diện (điền ở Bước 4) | Có thể nhiều địa chỉ, ngăn cách bằng dấu phẩy |
| `TRUST_PROXY` | `1` | Để giới hạn tần suất dùng đúng IP phía sau proxy |
| `ORDER_EXPIRY_MINUTES` | `15` | Tùy chọn |
| `STAFF_EMAIL`, `STAFF_PASSWORD` | tùy chọn | Tạo tài khoản barista; dùng mật khẩu mạnh hoặc để trống |

Cổng (`PORT`) thường do nền tảng tự đặt; backend đọc biến này. Kiểm tra: mở `https://<địa-chỉ-backend>/products` phải thấy 5 món.

## 4. Bước 3 – Triển khai frontend

Tạo dự án từ cùng repo, thư mục gốc `frontend`, rồi đặt biến:

| Biến | Giá trị |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<địa-chỉ-backend>` (không có dấu `/` cuối) |

> Biến `NEXT_PUBLIC_*` được **nhúng lúc build**, nên đổi giá trị thì phải build lại.

## 5. Bước 4 – Nối hai phía

Quay lại backend, đặt `FRONTEND_URL` bằng địa chỉ giao diện vừa có (ví dụ `https://brewlite.example.app`), triển khai lại backend. Nếu trình duyệt báo lỗi CORS, thường là `FRONTEND_URL` sai hoặc thừa dấu `/`.

## 6. Bước 5 – Kiểm tra sau triển khai

1. Đăng ký, đăng nhập, thêm món, thanh toán bằng thẻ `4242424242424242`.
2. Đăng nhập tài khoản STAFF, mở `/staff`, chuyển trạng thái đơn.
3. Đo thời gian phản hồi (chạy lại sau khi dịch vụ đã "tỉnh", lần đầu có thể chậm do khởi động nguội):
   ```bash
   node scripts/measure-latency.mjs --url https://<địa-chỉ-backend> --runs 15 --markdown
   ```
   Ghi kết quả và ngày đo vào [testing.md](testing.md). Thời gian đo qua Internet gồm cả độ trễ mạng nên có thể cao hơn khi đo trên máy.
4. Dán đường dẫn demo vào README (mục "Demo trực tuyến") và vào CV.

## 7. Khắc phục sự cố

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| Backend khởi động lỗi `ECONNREFUSED`/SSL | `DATABASE_URL` sai hoặc cần `DB_SSL=true` |
| Báo `Bảng "products" chưa tồn tại` | Prisma migration chưa chạy: kiểm tra log lệnh `prisma migrate deploy` |
| Giao diện không tải được dữ liệu, lỗi CORS | `FRONTEND_URL` không khớp địa chỉ giao diện |
| Giao diện gọi `localhost:3001` | `NEXT_PUBLIC_API_URL` chưa đặt trước khi build |
| Nhiều người dùng cùng bị lỗi 429 | Chưa đặt `TRUST_PROXY=1` nên mọi người bị tính chung một IP của proxy |
| Quên mật khẩu báo lỗi ở production | Chưa cấu hình `SMTP_*` (hành vi có chủ đích) |
| Lần mở đầu rất chậm | Dịch vụ miễn phí đang "ngủ" |

## 8. Dọn dẹp

Khi không còn dùng, xóa dịch vụ và cơ sở dữ liệu để tránh bị tính phí, và gỡ đường dẫn demo khỏi CV nếu đã tắt.
