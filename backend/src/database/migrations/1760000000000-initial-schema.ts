import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lược đồ ban đầu của các bảng do TypeORM quản lý: users, orders, order_items, payments, password_reset_tokens.
 * (Bảng `products` do Prisma migration tạo và quản lý.)
 *
 * Các câu lệnh đều "idempotent" (IF NOT EXISTS / bỏ qua nếu ràng buộc đã có) để chạy an toàn trên cơ sở dữ liệu
 * đã được tạo bởi `synchronize` ở các phiên bản trước: chỉ bổ sung những chỉ mục còn thiếu.
 *
 * Khi sửa entity, tạo migration mới. Test `test/migrations.e2e-spec.ts` sẽ báo lỗi và in ra SQL cần thiết
 * nếu entity và migration lệch nhau.
 */
export class InitialSchema1760000000000 implements MigrationInterface {
  name = 'InitialSchema1760000000000';

  private readonly statements = [
    `CREATE TABLE IF NOT EXISTS "users" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "email" character varying(150) NOT NULL, "passwordHash" character varying(255) NOT NULL, "loyaltyPoints" integer NOT NULL DEFAULT '0', "role" character varying(20) NOT NULL DEFAULT 'CUSTOMER', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    `CREATE TABLE IF NOT EXISTS "orders" ("id" SERIAL NOT NULL, "orderCode" character varying(30) NOT NULL, "status" character varying(30) NOT NULL DEFAULT 'PENDING', "total" integer NOT NULL, "paymentMethod" character varying(30), "userId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a97c808a83af1497276bf85e5ba" UNIQUE ("orderCode"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "IDX_d5e3786a82fe691d8bbbb1e256" ON "orders" ("status", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "IDX_30e6836e8539f85bfc47198067" ON "orders" ("userId", "createdAt")`,
    `CREATE TABLE IF NOT EXISTS "order_items" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "productId" integer NOT NULL, "size" character varying(1) NOT NULL, "quantity" integer NOT NULL, "lineTotal" integer NOT NULL, "toppings" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "IDX_f1d359a55923bb45b057fbdab0" ON "order_items" ("orderId")`,
    `CREATE TABLE IF NOT EXISTS "payments" ("id" SERIAL NOT NULL, "idempotencyKey" character varying(100) NOT NULL, "orderId" integer NOT NULL, "method" character varying(30) NOT NULL, "status" character varying(30) NOT NULL, "amount" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_743b9fb1d2a059f2f7860418e4e" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "IDX_af929a5f2a400fdb6913b4967e" ON "payments" ("orderId")`,
    `CREATE TABLE IF NOT EXISTS "password_reset_tokens" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "usedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1143abb8c3fad8b06dd857a8c9c" UNIQUE ("tokenHash"), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "IDX_5a808472a7d5da5d716db1d6d1" ON "password_reset_tokens" ("userId", "usedAt")`,
    `DO $$ BEGIN ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ exists }] = (await queryRunner.query(`SELECT to_regclass('public.products') IS NOT NULL AS "exists"`)) as Array<{ exists: boolean }>;
    if (!exists) {
      throw new Error('Bảng "products" chưa tồn tại. Hãy chạy Prisma migration trước (npm run db:migrate).');
    }
    for (const statement of this.statements) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['payments', 'order_items', 'orders', 'password_reset_tokens', 'users']) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
  }
}
