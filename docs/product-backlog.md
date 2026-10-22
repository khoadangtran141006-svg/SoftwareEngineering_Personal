# Product Backlog

> Tài liệu này theo mục 2 và mục 8 của đề bài. Mỗi user story có tiêu chí chấp nhận (Acceptance Criteria – AC) và được đối chiếu với kiểm thử trong [testing.md](testing.md).

## 1. Product Vision

> *"BrewLite giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy."*

## 2. Các bên liên quan

| Bên liên quan | Mong đợi |
|---|---|
| Khách hàng | Đặt đồ uống, chọn size/topping, thanh toán không tiền mặt, theo dõi và hủy đơn chưa thanh toán |
| Nhân viên quầy (barista) | Tiếp nhận đơn, cập nhật trạng thái pha chế |
| Quản lý / Product Owner | Xác định yêu cầu, ưu tiên backlog, nghiệm thu |
| Giảng viên nghiệm thu | Đánh giá quy trình, sản phẩm, tiêu chí chấp nhận |
| Nhóm phát triển | Phân tích, thiết kế, lập trình, kiểm thử, bàn giao |
| Đơn vị thanh toán | Được mô phỏng bằng Mock Payment Gateway (Ví / Thẻ / QR) |

## 3. Definition of Done (DoD)

Một hạng mục được coi là xong khi thỏa **tất cả**:

- [x] Code chạy được, build không lỗi (CI chạy `npm test`, `npm run test:e2e`, `npm run build` cho backend và `npm run build` cho frontend).
- [x] Có commit rõ ràng trên Git và đi qua Pull Request.
- [x] API có validate đầu vào (`class-validator`); giao diện xử lý trạng thái loading và lỗi.
- [x] Có hướng dẫn chạy trong [README](../README.md).
- [x] Các tiêu chí chấp nhận quan trọng có kiểm thử tự động (xem [testing.md](testing.md)).

## 4. Backlog tổng quan

| ID | User story | Ưu tiên | Task (PDF) | Trạng thái |
|---|---|---|---|---|
| US-00 | Khởi tạo dự án, cấu trúc, README, `.env.example` | Cao | 1 | Hoàn thành |
| US-01 | Xem menu đồ uống | Cao | 2, 3 | Hoàn thành |
| US-02 | Xem chi tiết, chọn size và topping | Cao | 4 | Hoàn thành |
| US-03 | Quản lý giỏ hàng | Cao | 5 | Hoàn thành |
| US-04 | Đăng ký, đăng nhập | Cao | 7 | Hoàn thành |
| US-05 | Thanh toán không tiền mặt | Cao | 6, 8 | Hoàn thành |
| US-06 | Xem xác nhận đơn và lịch sử đơn | Cao | 9 | Hoàn thành |
| US-07 | Hủy đơn chưa thanh toán, đơn quá hạn tự hủy | Trung bình | 10 | Hoàn thành |
| US-08 | Barista cập nhật trạng thái đơn | Trung bình | 10 | Hoàn thành (qua API) |
| US-09 | Mã khuyến mãi và điểm thưởng | Trung bình | 10 | Hoàn thành |
| US-10 | Không bán quá tồn kho khi đặt đồng thời | Cao | 10 | Hoàn thành |

## 5. User story và tiêu chí chấp nhận

### US-01 – Xem menu
*Là khách hàng, tôi muốn xem danh sách đồ uống kèm hình, tên, giá để chọn món nhanh.*
- AC1: `GET /products` trả về id, tên, giá, ảnh, tồn kho (5 món mẫu).
- AC2: Trang Menu hiển thị lưới sản phẩm; có trạng thái loading, lỗi và "không tìm thấy món phù hợp".

### US-02 – Chi tiết và tùy chọn
*Là khách hàng, tôi muốn chọn size và topping để tùy chỉnh đồ uống.*
- AC1: Size S/M/L với phụ thu 0 / 5.000đ / 10.000đ; topping Trân châu (5.000đ), Kem cheese (8.000đ), Espresso (10.000đ).
- AC2: Giá hiển thị thay đổi theo lựa chọn; backend tính lại giá, không tin giá từ frontend.
- AC3: Số lượng chọn không vượt tồn kho còn lại (tính chung mọi size/topping của sản phẩm, trừ phần đã có trong giỏ).

### US-03 – Giỏ hàng
*Là khách hàng, tôi muốn thêm, sửa, xóa món trong giỏ và thấy tổng tiền.*
- AC1: Thêm, tăng, giảm, xóa món; tổng tiền và badge số lượng tự cập nhật; giỏ được lưu khi tải lại trang.
- AC2: Nút `+` bị khóa khi chạm tồn kho; khi mở giỏ, số lượng được đồng bộ với tồn kho mới nhất.

### US-04 – Đăng ký và đăng nhập
*Là khách hàng, tôi muốn có tài khoản để đặt và theo dõi đơn.*
- AC1: Mật khẩu được băm bằng bcrypt; đăng nhập trả JWT; các route đặt đơn yêu cầu token.
- AC2: Email phải đúng định dạng; tên miền phổ biến bị gõ sai (ví dụ `gmail.co`) bị từ chối kèm gợi ý sửa.
- AC3: Có luồng quên mật khẩu; token đặt lại được băm, dùng một lần, hết hạn sau 15 phút.

### US-05 – Thanh toán không tiền mặt
*Là khách hàng, tôi muốn thanh toán bằng ví điện tử hoặc thẻ để không cần tiền mặt.*
- AC1: Khi giỏ có ít nhất 1 món, nút "Thanh toán" hiển thị tổng tiền.
- AC2: **Thẻ ngân hàng** cần 16–19 chữ số (backend kiểm tra lại). **Ví điện tử**: chọn MoMo / ZaloPay / ShopeePay, nhập số điện thoại di động Việt Nam 10 số và xác nhận bằng OTP 6 số. **QR Code** dùng mã mô phỏng.
- AC3: Thành công thì đơn chuyển PAID và hiển thị mã đơn cùng màn hình xác nhận.
- AC4: Thanh toán lỗi thì đơn là PAYMENT_FAILED, giỏ hàng được giữ nguyên và có thể thử lại.
- AC5: Gửi lại cùng `Idempotency-Key` chỉ tạo một giao dịch và không trừ tiền hai lần, kể cả khi gửi đồng thời.

### US-06 – Xác nhận và lịch sử đơn
*Là khách hàng, tôi muốn xem mã đơn, trạng thái và lịch sử đơn của mình.*
- AC1: Màn hình xác nhận hiển thị mã đơn và trạng thái.
- AC2: `GET /orders/me` chỉ trả đơn của chính người dùng, mới nhất trước.

### US-07 – Hủy đơn và đơn quá hạn
*Là khách hàng, tôi muốn hủy đơn chưa thanh toán để hàng được trả lại kho.*
- AC1: Khách hủy được đơn của mình khi PENDING hoặc PAYMENT_FAILED; không hủy được đơn của người khác hay đơn đã PAID.
- AC2: Hủy đơn hoàn lại tồn kho đúng một lần.
- AC3: Đơn chưa thanh toán sau 15 phút (cấu hình `ORDER_EXPIRY_MINUTES`) tự hủy và hoàn kho; đơn mới và đơn đã thanh toán không bị ảnh hưởng.
- AC4: Hủy và thanh toán diễn ra cùng lúc luôn cho kết quả nhất quán.

### US-08 – Cập nhật trạng thái đơn
*Là barista, tôi muốn cập nhật trạng thái pha chế.*
- AC1: Chỉ STAFF được gọi `PATCH /orders/:id/status`.
- AC2: Luồng hợp lệ PAID → PREPARING → READY → COMPLETED; chuyển trạng thái sai bị từ chối (HTTP 400).

### US-09 – Khuyến mãi và điểm thưởng
*Là khách hàng, tôi muốn dùng mã giảm giá và tích điểm.*
- AC1: Mã `BREW10` giảm 10% tạm tính; mã sai bị từ chối và không trừ kho.
- AC2: Điểm thưởng = 1 điểm cho mỗi 10.000đ của số tiền sau giảm, chỉ cộng khi đơn PAID và chỉ cộng một lần.

### US-10 – Tồn kho khi đặt đồng thời
*Là chủ cửa hàng, tôi không muốn bán quá số lượng còn lại.*
- AC1: 10 đơn cùng lúc khi kho còn 5 thì đúng 5 đơn thành công, kho về 0, không âm.
- AC2: Đơn thất bại giữa chừng không làm mất tồn kho (rollback).

## 6. Backlog cho phiên bản sau (v1.1+)

| Ý tưởng | Lý do |
|---|---|
| Giao diện cho barista (danh sách đơn, đổi trạng thái) | Hiện chỉ thao tác qua API |
| Xác minh email khi đăng ký | Chỉ chặn được lỗi gõ sai tên miền, chưa biết email có thật |
| Luồng hoàn tiền khi nhân viên hủy đơn đã PAID | Hiện chỉ đổi trạng thái và hoàn kho |
| Thống nhất một ORM và dùng migration cho toàn bộ bảng | Hiện trộn TypeORM (`synchronize`) và Prisma |
| Giới hạn tần suất và `helmet` cho API | Tăng bảo mật |
| Tích hợp cổng thanh toán thật (sandbox) | Thay Mock Payment Gateway |
| Cập nhật trạng thái đơn theo thời gian thực | Khách thấy PREPARING/READY không cần tải lại |
| Kiểm thử tự động cho frontend | Hiện frontend kiểm thử thủ công |
