# Sprint Retrospective

> **Bản nháp dựa trên sự kiện thật của dự án** (lịch sử Git, Pull Request, lỗi được phát hiện). Hãy đọc lại và sửa bằng lời của bạn trước khi dùng; riêng phần "Bài học cho dự án nhóm" nên chỉnh theo trải nghiệm riêng của bạn.

**Phạm vi:** toàn bộ quá trình làm BrewLite bản cá nhân (23/09 – 18/10/2026).

## 1. Điều làm tốt

- **Kiểm thử trên PostgreSQL thật** cho các nghiệp vụ khó (idempotency, đặt đồng thời, hủy và hoàn kho). Test mock thì xanh, nhưng chỉ test thật mới bắt được các lỗi chạy song song.
- **Làm việc qua branch và Pull Request** từ PR #1 trở đi, có CI chạy test và build cho cả backend lẫn frontend.
- **Có người kiểm thử độc lập** (bạn của tác giả) và video quay màn hình, giúp tìm ra lỗi mà tự test không thấy.
- **Đối chiếu từng tiêu chí chấp nhận của đề** thay vì chỉ "chạy được", nên phát hiện sớm các phần chưa đạt.
- **Giao từng phần nhỏ** (mỗi lần một nhóm thay đổi có kiểm thử) thay vì một lần thật lớn.

## 2. Điều chưa tốt và cách xử lý

| Vấn đề | Cách phát hiện | Hậu quả | Xử lý |
|---|---|---|---|
| Toàn bộ Task 6–10 nằm trong một commit lớn (87 file) | Xem lịch sử Git | Khó review, khó truy vết | Từ PR #1 làm theo branch nhỏ, mô tả commit rõ |
| Task 8, 9, 10 chưa đủ tiêu chí (thiếu thẻ, test chỉ dùng mock, khuyến mãi chưa có giao diện) | Rà soát đối chiếu PDF ngày 14/10 | Có thể mất điểm khi nghiệm thu | PR #1, #2 bổ sung đầy đủ |
| Hai request thanh toán cùng `Idempotency-Key` có thể bị từ chối hoặc gọi cổng thanh toán hai lần | CI chạy đỏ ở lần `push` nhưng xanh ở lần `pull_request` (lỗi phụ thuộc thời điểm) | Với cổng thật có nguy cơ trừ tiền hai lần | Kiểm tra lại key dưới khóa dòng đơn; thêm test mô phỏng cổng chậm (PR #3) |
| Email `gmail.co` đăng ký được | Phản hồi của người kiểm thử | Tài khoản gõ nhầm, không đăng nhập lại được | Chặn lỗi gõ sai tên miền phổ biến, có gợi ý (PR #3) |
| Số thẻ nhập 1 hoặc 30 chữ số vẫn thanh toán được | Phản hồi của người kiểm thử | Dữ liệu sai lọt qua | Bắt buộc 16–19 chữ số ở cả frontend và backend (PR #3) |
| Ô nhập số thẻ làm con trỏ nhảy, xóa nhầm chữ số | Video của người kiểm thử | Người dùng không nhập đúng số muốn nhập | Để ô nhập chỉ chứa chữ số, hiển thị bản chia nhóm 4 ở dòng riêng (PR #3) |
| Giỏ hàng cho thêm vượt số lượng còn lại | Phản hồi của người kiểm thử | Đặt hàng sẽ bị từ chối ở bước cuối | Giỏ biết tồn kho, khóa nút `+`, đồng bộ khi mở giỏ (PR #3) |
| Ví điện tử chỉ là ô nhập tài khoản | Phản hồi của người kiểm thử | Không giống trải nghiệm thực tế | Chọn ví, số điện thoại và xác nhận OTP (PR #3) |
| Đơn chưa thanh toán giữ kho mãi nếu khách bỏ ngang | Rà soát nghiệp vụ lần cuối | Hàng "biến mất" khỏi kho | Khách hủy được đơn, đơn quá hạn tự hủy và hoàn kho (PR #4) |
| Test đơn quá hạn đỏ trên máy cá nhân, xanh trên máy khác | Chạy test trên Docker Desktop (Windows) | Có thể hủy nhầm đơn mới nếu đồng hồ lệch | Tính mốc quá hạn bằng đồng hồ của database |

## 3. Điều muốn cải thiện tiếp (Action items)

| Hành động | Mục tiêu |
|---|---|
| Thêm giao diện cho barista | Demo được luồng PREPARING → READY → COMPLETED mà không cần gọi API tay |
| Thống nhất một ORM và dùng migration cho mọi bảng | Giảm nợ kỹ thuật |
| Thêm giới hạn tần suất và `helmet` | Tăng bảo mật |
| Thêm kiểm thử tự động cho frontend | Giữ các lỗi giao diện đã sửa không quay lại |
| Ghi số liệu burndown hằng ngày từ đầu Sprint | Có số liệu thật thay vì tái dựng |

## 4. Phản hồi của "khách hàng" (người kiểm thử)

1. Email `.co` đăng ký được → đã chặn.
2. Số thẻ phải 16–19 chữ số → đã sửa.
3. Ví điện tử nên giống Shopee/TikTok Shop → đã thêm chọn ví, số điện thoại, OTP.
4. Số lượng vượt tồn kho trong giỏ → đã sửa.
5. Ô nhập số thẻ bị nhảy con trỏ (qua video) → đã sửa.

## 5. Bài học cho dự án nhóm

- Chia nhỏ commit và Pull Request ngay từ đầu; đừng để một người làm một lượt cả backend rồi mới chia sẻ.
- Chốt sớm hợp đồng giữa frontend và backend (DTO, mã lỗi) và schema cơ sở dữ liệu dùng chung.
- Viết test cho các tiêu chí chấp nhận khó (đồng thời, idempotency) trên cơ sở dữ liệu thật càng sớm càng tốt.
- Để người khác thử sản phẩm trước buổi nghiệm thu; họ tìm ra lỗi mà tác giả không thấy.
- Chạy CI trên cả sự kiện `push` lẫn `pull_request`; lỗi phụ thuộc thời điểm có thể chỉ hiện ở một bên.
