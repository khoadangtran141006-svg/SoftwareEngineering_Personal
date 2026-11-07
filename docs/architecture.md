# Kiến trúc và thiết kế

## 1. Tổng quan thành phần

```mermaid
flowchart LR
  U["Khách hàng / Barista<br/>Trình duyệt"] -->|HTTP| FE["Next.js 16<br/>React, TailwindCSS, Zustand<br/>cổng 3000"]
  FE -->|"REST/JSON + JWT"| BE["NestJS REST API<br/>cổng 3001"]
  BE -->|"TypeORM: users, orders, payments"| DB[("PostgreSQL 16")]
  BE -->|"Prisma: products"| DB
  BE -->|charge| GW["Mock Payment Gateway<br/>Ví / Thẻ / QR"]
  EXP["OrderExpiryService<br/>chạy mỗi 60 giây"] -->|"hủy đơn quá hạn, hoàn kho"| DB
  BE --- EXP
```

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js (React, TypeScript), TailwindCSS, Zustand (giỏ hàng, lịch sử đơn) |
| Backend | NestJS (TypeScript), REST, class-validator, JWT (Passport), bcrypt |
| CSDL | PostgreSQL 16; TypeORM cho tài khoản/đơn/thanh toán, Prisma (migration + seed) cho sản phẩm |
| Thanh toán | Mock Payment Service mô phỏng Ví (OTP) / Thẻ / QR |
| DevOps | Docker Compose (3 dịch vụ), GitHub Actions CI |

## 2. Mô hình dữ liệu

`Order.total` là số tiền **sau giảm giá**; mã giảm giá chỉ ảnh hưởng đến `total` chứ không lưu thành cột riêng.

```mermaid
erDiagram
  USERS ||--o{ ORDERS : dat
  ORDERS ||--|{ ORDER_ITEMS : gom
  PRODUCTS ||--o{ ORDER_ITEMS : duoc_ban_trong
  ORDERS ||--o{ PAYMENTS : thanh_toan

  USERS {
    int id PK
    string name
    string email UK
    string passwordHash
    int loyaltyPoints
    string role "CUSTOMER hoac STAFF"
    datetime createdAt
  }
  PRODUCTS {
    int id PK
    string name
    string category
    int price
    string imageUrl
    int stock
  }
  ORDERS {
    int id PK
    string orderCode UK
    string status
    int total
    string paymentMethod
    int userId FK
    datetime createdAt
  }
  ORDER_ITEMS {
    int id PK
    int orderId FK
    int productId FK
    string size
    int quantity
    int lineTotal
    string_array toppings
  }
  PAYMENTS {
    int id PK
    string idempotencyKey UK
    int orderId FK
    string method
    string status "SUCCEEDED hoac FAILED"
    int amount
    datetime createdAt
  }
```

## 3. Máy trạng thái đơn hàng

Mọi chuyển trạng thái đi qua `OrderStateService.assertTransition`; chuyển không có mũi tên sẽ bị từ chối (HTTP 400). COMPLETED và CANCELLED là trạng thái kết thúc.

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> PAID: thanh toán thành công
  PENDING --> PAYMENT_FAILED: thanh toán lỗi
  PENDING --> CANCELLED: khách hủy hoặc quá hạn
  PAYMENT_FAILED --> PENDING: thử lại
  PAYMENT_FAILED --> CANCELLED: khách hủy hoặc quá hạn
  PAID --> PREPARING: barista nhận đơn
  PAID --> CANCELLED: nhân viên hủy
  PREPARING --> READY: pha xong
  READY --> COMPLETED: giao khách
  COMPLETED --> [*]
  CANCELLED --> [*]
```

## 4. Thanh toán idempotent

```mermaid
sequenceDiagram
  autonumber
  participant FE as Frontend
  participant API as POST /payments
  participant DB as PostgreSQL
  participant GW as Mock Gateway
  FE->>API: orderId, method, header Idempotency-Key
  API->>DB: tìm giao dịch theo key
  alt đã có giao dịch với key này
    API-->>FE: trả lại giao dịch cũ, không trừ tiền lần nữa
  else chưa có
    API->>DB: BEGIN, khóa dòng đơn (FOR UPDATE)
    API->>DB: kiểm tra lại key dưới khóa
    API->>GW: charge
    GW-->>API: thành công hoặc bị từ chối
    API->>DB: cập nhật đơn, cộng điểm thưởng, lưu Payment
    API->>DB: COMMIT
    API-->>FE: kết quả giao dịch
  end
```

## 5. Quyết định thiết kế quan trọng

### 5.1 Chống bán quá tồn kho
Đề yêu cầu **transaction + optimistic locking**. Trong transaction tạo đơn, backend đọc `stock` và `version` hiện tại của sản phẩm, sau đó cập nhật có điều kiện:

```sql
UPDATE products SET stock = stock - :quantity, version = version + 1 WHERE id = :id AND version = :version AND stock >= :quantity
```

Nếu `affected = 0` do version đã thay đổi, backend đọc lại dữ liệu và thử lại tối đa 5 lần, có backoff ngắn giữa các lần thử. Nếu tồn kho không đủ hoặc đã hết lượt thử, backend từ chối đơn với thông báo hết hàng. Khi `release()` hoàn kho, thao tác cũng tăng `version` để giữ version nhất quán. Đây là kiểm soát đồng thời lạc quan đúng yêu cầu transaction + optimistic locking của đề. Bằng chứng gồm unit test cho reserve thành công, retry khi xung đột và hết kho tại `backend/src/inventory/inventory.service.spec.ts`, cùng test "10 đơn cùng lúc khi kho còn 5" trong `backend/test/business.e2e-spec.ts`.

### 5.2 Khóa đơn khi thanh toán và hủy
Thanh toán, hủy đơn và dọn đơn quá hạn đều khóa dòng đơn (`FOR UPDATE`) rồi **kiểm tra lại trạng thái dưới khóa**. Nhờ đó hai request song song cùng key, hai key khác nhau cho cùng một đơn, hoặc "hủy cùng lúc thanh toán" đều cho kết quả nhất quán.

### 5.3 Giữ chỗ tồn kho và đơn quá hạn
Tồn kho bị trừ lúc tạo đơn. Đơn chưa thanh toán được hoàn kho khi khách hủy hoặc sau `ORDER_EXPIRY_MINUTES` (mặc định 15). Mốc quá hạn được tính bằng **đồng hồ của cơ sở dữ liệu**, cùng nguồn với `createdAt`, để lệch giờ giữa máy chạy ứng dụng và Docker không làm hủy nhầm.

### 5.4 Tính tiền ở server
Backend tự tính giá theo sản phẩm, size, topping và mã giảm giá; không tin giá do frontend gửi.

### 5.5 Hai ORM và migration
TypeORM quản lý tài khoản, đơn, thanh toán; Prisma quản lý bảng sản phẩm (migration và seed). **Cả hai đều dùng migration**: backend không còn `synchronize`. Migration TypeORM (`backend/src/database/migrations`) viết theo kiểu idempotent nên chạy an toàn trên cơ sở dữ liệu cũ từng được tạo bằng `synchronize`, và test `migrations.e2e-spec.ts` đảm bảo entity và migration không lệch nhau. Việc dùng hai ORM là nợ kỹ thuật đã ghi trong [product-backlog.md](product-backlog.md).

### 5.6 Bảo mật
- Mật khẩu băm bcrypt; JWT ký bằng `JWT_SECRET`; `ValidationPipe` bật `whitelist` và `forbidNonWhitelisted`.
- `helmet` đặt header bảo mật; `@nestjs/throttler` giới hạn tần suất theo IP (200 request/phút, và 10 request/phút cho các endpoint xác thực để chống dò mật khẩu).
- Chỉ STAFF được xem danh sách quầy và đổi trạng thái đơn; ở production quên mật khẩu bắt buộc cấu hình SMTP.
- Chỉ mục cơ sở dữ liệu cho các truy vấn thường dùng: `orders(userId, createdAt)`, `orders(status, createdAt)`, `order_items(orderId)`, `payments(orderId)`.

## 6. Luồng nghiệp vụ: từ chọn sản phẩm đến thanh toán

```mermaid
flowchart TD
  A["Mở app"] --> B["Xem menu"]
  B --> C["Chọn sản phẩm: size, topping"]
  C --> D["Thêm vào giỏ hàng"]
  D --> E["Xem giỏ và tổng tiền"]
  E --> F["Đăng nhập nếu chưa"]
  F --> G["Thanh toán không tiền mặt: Ví / Thẻ / QR"]
  G --> H["Đơn ở trạng thái PAID"]
  H --> I["Xác nhận đơn: mã đơn"]
  I --> J["Nhận đồ uống"]

  E --> K["Thêm sản phẩm khác"]
  K --> B

  G --> L["Thanh toán lỗi"]
  L --> M["Đơn ở trạng thái PAYMENT_FAILED"]
  M -->|Thử lại| G
  M -->|Hủy đơn| N["Đơn ở trạng thái CANCELLED"]
```

Nếu thanh toán thất bại, đơn chuyển sang `PAYMENT_FAILED`; khách có thể thử thanh toán lại hoặc hủy đơn. Khi hủy đơn chưa thanh toán, hệ thống chuyển đơn sang `CANCELLED` và hoàn lại số lượng đã giữ trong kho.
