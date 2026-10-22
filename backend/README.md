# BrewLite – Backend

API NestJS của BrewLite (REST, JWT, PostgreSQL). Hướng dẫn chạy, biến môi trường, API và kiểm thử nằm ở [README gốc](../README.md); thiết kế chi tiết ở [docs/architecture.md](../docs/architecture.md).

Lệnh thường dùng (chạy trong thư mục `backend`):

```bash
npm ci
npm run db:migrate && npm run db:seed   # bảng products (Prisma)
npm run start:dev                       # tự chạy migration TypeORM khi khởi động
npm test                                # unit
npm run test:e2e                        # e2e + integration (cần PostgreSQL, xem docs/testing.md)
npm run lint
```
