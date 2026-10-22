# Kế hoạch Sprint và tiến độ thực tế

> **Lưu ý trung thực:** BrewLite bản cá nhân được làm trước khi nhóm chia việc, nên **không có các buổi họp Scrum thật**. Các Sprint dưới đây được **tái dựng từ lịch sử Git** để đối chiếu với kế hoạch gợi ý của đề bài. Các mốc ngày lấy từ commit và Pull Request thật của repo.

## 1. Kế hoạch gợi ý của đề bài

| Sprint | Mục tiêu (Sprint Goal) | Task |
|---|---|---|
| Sprint 1 | Nền tảng và hiển thị menu | 1, 2, 3, 4 |
| Sprint 2 | Giỏ hàng, đặt đơn, đăng nhập | 5, 6, 7 |
| Sprint 3 | Thanh toán, bàn giao, nghiệp vụ nâng cao | 8, 9, 10 |

## 2. Tiến độ thực tế (theo Git)

| Lần giao | Ngày | Bằng chứng | Nội dung |
|---|---|---|---|
| Giao 1 | 02/10/2026 | commit `feat: complete tasks 1-5 MVP foundation` | Task 1–5: khung dự án, API sản phẩm, trang menu, chi tiết, giỏ hàng |
| Giao 2 | 14/10/2026 | commit `feat: implement BrewLite MVP` | Task 6–10 ở mức MVP: đặt đơn, đăng nhập, thanh toán, xác nhận, lịch sử, state machine |
| Kiểm tra theo PDF | 14/10/2026 | rà soát đối chiếu từng tiêu chí chấp nhận | Phát hiện Task 8, 9, 10 chưa đạt đủ tiêu chí (xem [burndown.md](burndown.md)) |
| Giao 3 | 17/10/2026 | PR #1, #2, #3 | Thanh toán bằng thẻ, hoàn kho khi hủy, khuyến mãi và điểm thưởng, test tích hợp trên Postgres thật, CI, sửa lỗi từ phản hồi của người kiểm thử |
| Giao 4 | 18/10/2026 | PR #4 | Khách hủy đơn và đơn quá hạn tự hủy để trả tồn kho |

## 3. Mẫu Sprint Planning cho nhóm

Dùng khi làm lại cùng nhóm. Điền vào đầu mỗi Sprint:

```text
Sprint số:            Thời gian: từ ... đến ...  (1–2 tuần)
Sprint Goal:          ...
Product Owner:        ...   Scrum Master: ...
Sprint Backlog:
  | Task | Người làm | Story point | Tiêu chí chấp nhận | Trạng thái |
Rủi ro / phụ thuộc:   ...
```

## 4. Mẫu Daily Scrum (15 phút, mỗi người trả lời 3 câu)

1. Hôm qua tôi đã làm gì?
2. Hôm nay tôi sẽ làm gì?
3. Tôi đang vướng gì?

Sau mỗi buổi, cập nhật số story point còn lại vào bảng trong [burndown.md](burndown.md).

## 5. Sprint Review và Retrospective

- Ghi chú Sprint Review (demo, phản hồi): xem [demo-script.md](demo-script.md) và [release-notes.md](release-notes.md).
- Ghi chú Retrospective: xem [retrospective.md](retrospective.md).
