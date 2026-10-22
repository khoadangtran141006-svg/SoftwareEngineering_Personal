# Kịch bản demo (Sprint Review / bàn giao)

Thời lượng gợi ý: 10–12 phút. Mỗi bước có kết quả mong đợi để tự kiểm tra trước buổi demo.

## 0. Chuẩn bị

```bash
cp .env.example .env     # đặt DB_PASSWORD, JWT_SECRET; thêm STAFF_EMAIL, STAFF_PASSWORD để dùng tài khoản barista
docker compose up --build
```

Mở `http://localhost:3000`. Backend ở `http://localhost:3001`.

**Dữ liệu thử**

| Mục | Giá trị | Kết quả |
|---|---|---|
| Mã khuyến mãi | `BREW10` | Giảm 10% tạm tính |
| Thẻ thành công | `4242424242424242` | PAID |
| Thẻ bị từ chối | `4000000000000002` | PAYMENT_FAILED |
| OTP ví thành công | `123456` | PAID |
| OTP ví sai | `000000` hoặc mã khác | PAYMENT_FAILED |
| Số điện thoại ví | `0912345678` (10 số, đầu 03/05/07/08/09) | Hợp lệ |

## 1. Luồng chính (happy path)

1. Mở Menu → thấy lưới 5 món có ảnh, tên, giá.
2. Chọn một món → chọn size (S/M/L) và topping → giá thay đổi theo lựa chọn.
3. Thêm vào giỏ → badge giỏ hàng tăng; vào giỏ sửa số lượng, xóa, thấy tổng tiền.
4. Đăng ký tài khoản mới rồi đăng nhập.
5. Thanh toán: nhập `BREW10` → bấm **Áp dụng** → thấy dòng giảm giá.
6. Chọn **Thẻ ngân hàng**, nhập `4242424242424242` → xác nhận.
7. Màn hình xác nhận hiển thị mã đơn và trạng thái **PAID**.
8. Trang Profile hiển thị điểm thưởng (1 điểm cho mỗi 10.000đ sau giảm).
9. Lịch sử đơn hiển thị đơn vừa đặt với phương thức "Thẻ ngân hàng".

## 2. Các trường hợp lỗi và biên

| Thao tác | Kết quả mong đợi |
|---|---|
| Đăng ký `abc@gmail.co` | Báo "Ý bạn là abc@gmail.com?" |
| Nhập số thẻ 1 hoặc 15 chữ số | Báo lỗi 16–19 chữ số, không thanh toán |
| Gõ quá 19 chữ số | Ô không nhận thêm |
| Thẻ `4000000000000002` | Thanh toán bị từ chối, đơn PAYMENT_FAILED, giỏ hàng còn nguyên |
| Ví → MoMo → số điện thoại → OTP `000000` | Bị từ chối, giỏ còn nguyên |
| Ví → OTP `123456` | PAID |
| Món còn 18, thêm nhiều lần | Tổng số lượng không vượt 18; nút `+` bị khóa |
| Mã khuyến mãi sai | Báo lỗi, không trừ kho |

## 3. Hủy đơn và hoàn kho

1. Tạo một đơn **thanh toán thất bại** (thẻ `4000000000000002`).
2. Vào Lịch sử đơn → bấm **Hủy đơn** → trạng thái thành "Đã hủy".
3. Mở lại trang chi tiết món: số lượng còn lại tăng trở lại.
4. Đơn **đã thanh toán** không có nút Hủy.
5. (Tùy chọn) đặt `ORDER_EXPIRY_MINUTES=1` trong `.env`, chạy lại, tạo đơn chưa thanh toán rồi chờ khoảng 2 phút: đơn tự hủy và hoàn kho.

## 4. Vai barista (STAFF) qua API

Thay email và mật khẩu bằng `STAFF_EMAIL`, `STAFF_PASSWORD` trong `.env`:

```powershell
$body = @{ email = "staff@brewlite.local"; password = "mat-khau-cua-ban" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3001/auth/login -ContentType "application/json" -Body $body
$h = @{ Authorization = "Bearer $($login.accessToken)" }
Invoke-RestMethod -Method Patch -Uri http://localhost:3001/orders/1/status -Headers $h -ContentType "application/json" -Body '{"status":"PREPARING"}'
```

Lần lượt `PREPARING` → `READY` → `COMPLETED` (đơn phải đang PAID). Thử nhảy sai (ví dụ PAID → COMPLETED) sẽ nhận lỗi 400. Trang lịch sử của khách hiển thị trạng thái mới sau khi tải lại.

## 5. Đo thời gian phản hồi (yêu cầu < 500 ms)

```powershell
1..3 | ForEach-Object { (Measure-Command { Invoke-RestMethod http://localhost:3001/products | Out-Null }).TotalMilliseconds }
```

Ghi kết quả vào bảng trong [testing.md](testing.md).

## 6. Sprint Retrospective và phản hồi

Trình bày [retrospective.md](retrospective.md), sau đó ghi nhận phản hồi của "khách hàng" vào [product-backlog.md](product-backlog.md) (mục 6).
