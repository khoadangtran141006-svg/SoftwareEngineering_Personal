# Chiến lược kiểm thử

## 1. Các tầng kiểm thử

| Tầng | Công cụ | Chạy ở đâu | Mục đích |
|---|---|---|---|
| Unit | Vitest | `backend/src/**/*.spec.ts` | Logic thuần: state machine, khuyến mãi, DTO, mock payment, service với phụ thuộc giả |
| E2E tầng HTTP | Vitest + Supertest | `backend/test/*.e2e-spec.ts` | Controller, validation, guard; service được giả lập |
| Integration trên **PostgreSQL thật** | Vitest + TypeORM | `backend/test/business.e2e-spec.ts` | Nghiệp vụ Task 10: đồng thời, idempotency, hoàn kho, hết hạn |
| Frontend | Build + `tsc` + kiểm thử thủ công | CI và kịch bản [demo](demo-script.md) | Chưa có test tự động cho giao diện (xem backlog) |

## 2. Chạy kiểm thử

```bash
# Backend
cd backend
npm test                 # unit
npm run test:e2e         # e2e + integration (cần PostgreSQL, xem bên dưới)
npm run build

# Frontend
cd frontend
npm run build
```

Integration test dùng database riêng `brewlite_test` và **xóa sạch schema của database đó mỗi lần chạy**. Cấu hình bằng `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `TEST_DB_NAME`. Ví dụ với Docker:

```bash
docker run --name brewlite-test-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=brewlite_test -p 5433:5432 -d postgres:16
TEST_DB_PORT=5433 TEST_DB_PASSWORD=postgres JWT_SECRET=test-secret npm run test:e2e
```

CI (`.github/workflows/ci.yml`) chạy toàn bộ các bước trên với PostgreSQL service ở mỗi `push` và `pull_request`.

## 3. Ma trận truy vết: tiêu chí chấp nhận → kiểm thử

| User story / AC | Kiểm thử |
|---|---|
| US-01 Menu (AC1) | `products.e2e-spec` (hợp đồng `GET /products`), `products.service.spec`, `products.controller.spec` |
| US-02 AC2 (giá theo size/topping, tính ở server) | **Chưa có test tự động riêng cho bảng giá size/topping**; kiểm tra thủ công theo [demo-script.md](demo-script.md). `orders.e2e-spec` kiểm tra tạo đơn có size và topping ở tầng HTTP |
| US-03 Giỏ hàng, US-02 AC3 | Kiểm thử thủ công theo [demo-script.md](demo-script.md); logic giới hạn tồn kho đã được thử bằng script riêng khi phát triển (chưa có test tự động) |
| US-04 Đăng ký/đăng nhập | `auth.service.spec` (đăng ký không trả `passwordHash`, từ chối email trùng, cấp JWT hợp lệ, từ chối sai thông tin, token đặt lại mật khẩu không lưu dạng rõ và hết hạn), `register.dto.spec` (email hợp lệ, gõ sai tên miền, sai định dạng), `auth.e2e-spec` (từ chối `gmail.co`, validate đầu vào, JWT từ login) |
| US-05 Thanh toán AC2 | `create-payment.dto.spec` (thẻ 16–19 số, ví, QR), `payments.e2e-spec` (HTTP 400 với thẻ 1 và 30 chữ số, ví thiếu OTP), `mock-payment.service.spec` |
| US-05 AC3, AC4 | `business.e2e-spec` ("ví điện tử: đúng OTP thì PAID, sai OTP thì PAYMENT_FAILED"; "thanh toán lỗi → PAYMENT_FAILED… thử lại với key mới thì thành công") |
| US-05 AC5 Idempotency | `business.e2e-spec` (gửi lần lượt 2 lần, gửi đồng thời 5 request, hai key khác nhau, dùng lại key cho đơn khác); `payments.service.spec` |
| US-06 Lịch sử đơn | `orders.e2e-spec` (`GET /orders/me` và validate thân yêu cầu tạo đơn); `business.e2e-spec` cho trạng thái đơn sau thanh toán |
| US-07 Hủy và hết hạn | `business.e2e-spec` (nhóm "Hủy đơn và đơn quá hạn": hủy hoàn kho, không hủy đơn người khác, không hủy đơn PAID, hủy cùng lúc thanh toán, dọn đơn quá hạn, lệch đồng hồ) |
| US-08 State machine | `order-state.service.spec`, `business.e2e-spec` (chặn chuyển sai, đi hết luồng) |
| US-09 Khuyến mãi, điểm | `promotions.service.spec`, `business.e2e-spec` (BREW10, mã sai không trừ kho, điểm theo số tiền sau giảm) |
| US-10 Tồn kho đồng thời | `inventory.service.spec` (cập nhật có điều kiện nguyên tử, từ chối khi hết hàng), `business.e2e-spec` (10 đơn cùng lúc khi kho còn 5; rollback khi thất bại) |

Ba tiêu chí chấm của Task 10 trong đề (mục 9):

- **(a) chặn chuyển trạng thái sai** → `order-state.service.spec` và `business.e2e-spec`.
- **(b) hai lần cùng Idempotency-Key chỉ tạo một đơn** → các test idempotency trong `business.e2e-spec`; cổng thanh toán được xác nhận chỉ gọi đúng một lần khi gửi đồng thời.
- **(c) đặt đồng thời không vượt tồn kho** → test "10 đơn cùng lúc khi kho còn 5" trong `business.e2e-spec`.

## 4. Yêu cầu phi chức năng

| Yêu cầu (mục 4.2 của đề) | Cách kiểm tra |
|---|---|
| API phản hồi dưới 500 ms với dữ liệu mẫu | Chưa có số liệu đo trong repo. Cách đo: xem mục "Đo thời gian phản hồi" trong [demo-script.md](demo-script.md) và ghi kết quả vào mục dưới |
| Mật khẩu băm, JWT, validate đầu vào | `auth.service.spec`, các DTO spec, `auth.e2e-spec` |
| Chạy trên các trình duyệt web | Kiểm thử thủ công (ghi trình duyệt đã thử ở dưới) |

**Kết quả đo thủ công (điền sau khi đo):**

| Endpoint | Lần 1 | Lần 2 | Lần 3 | Trình duyệt / máy |
|---|---|---|---|---|
| `GET /products` | | | | |
| `POST /orders` | | | | |
