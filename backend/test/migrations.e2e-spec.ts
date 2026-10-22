import 'reflect-metadata';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

import { User } from '../src/users/entities/user.entity.js';
import { Product } from '../src/products/entities/product.entity.js';
import { Order } from '../src/orders/entities/order.entity.js';
import { OrderItem } from '../src/orders/entities/order-item.entity.js';
import { Payment } from '../src/payments/entities/payment.entity.js';
import { PasswordResetToken } from '../src/auth/entities/password-reset-token.entity.js';
import { TYPEORM_MIGRATIONS } from '../src/database/typeorm.config.js';

/**
 * Bảo vệ lược đồ cơ sở dữ liệu:
 *  1. Migration tạo đúng lược đồ mà các entity mô tả (không lệch). Nếu bạn sửa entity mà quên viết migration,
 *     test này thất bại và in ra các câu SQL còn thiếu để đưa vào migration mới.
 *  2. Migration chạy an toàn trên cơ sở dữ liệu cũ từng được tạo bằng `synchronize`.
 *  3. Chạy lại migration nhiều lần không gây lỗi.
 * CẢNH BÁO: schema của database test bị xóa sạch mỗi lần chạy.
 */
describe('Migration TypeORM', () => {
  const entities = [User, Product, Order, OrderItem, Payment, PasswordResetToken];
  const connection = {
    type: 'postgres' as const,
    host: process.env.TEST_DB_HOST ?? 'localhost',
    port: Number(process.env.TEST_DB_PORT ?? 5432),
    username: process.env.TEST_DB_USER ?? 'postgres',
    password: process.env.TEST_DB_PASSWORD ?? 'postgres',
    database: process.env.TEST_DB_NAME ?? 'brewlite_test',
  };
  let ds: DataSource;

  /** Tạo bảng products như Prisma migration (sản phẩm do Prisma quản lý). */
  async function applyPrismaMigrations() {
    const root = join(process.cwd(), 'prisma', 'migrations');
    const folders = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const dir of folders) {
      await ds.query(readFileSync(join(root, dir, 'migration.sql'), 'utf8'));
    }
  }

  const pendingSchemaChanges = async () => (await ds.driver.createSchemaBuilder().log()).upQueries.map((q) => q.query.trim());

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('migration trên cơ sở dữ liệu trống tạo đúng lược đồ của entity (không lệch)', async () => {
    ds = new DataSource({ ...connection, entities, migrations: TYPEORM_MIGRATIONS, dropSchema: true, synchronize: false });
    await ds.initialize();
    await applyPrismaMigrations();
    await ds.runMigrations();

    expect(await pendingSchemaChanges()).toEqual([]);
  });

  it('chạy lại migration nhiều lần không lỗi và không có migration chờ', async () => {
    ds = new DataSource({ ...connection, entities, migrations: TYPEORM_MIGRATIONS, dropSchema: true, synchronize: false });
    await ds.initialize();
    await applyPrismaMigrations();
    await ds.runMigrations();

    expect(await ds.showMigrations()).toBe(false);
    await expect(ds.runMigrations()).resolves.toEqual([]);
  });

  it('chạy an toàn trên cơ sở dữ liệu cũ do synchronize tạo (chỉ bổ sung chỉ mục còn thiếu)', async () => {
    const legacy = new DataSource({ ...connection, entities, dropSchema: true, synchronize: true });
    await legacy.initialize();
    await legacy.query('DROP INDEX IF EXISTS "IDX_30e6836e8539f85bfc47198067"'); // orders(userId, createdAt)
    await legacy.query('DROP INDEX IF EXISTS "IDX_f1d359a55923bb45b057fbdab0"'); // order_items(orderId)
    await legacy.query('INSERT INTO "users" ("name", "email", "passwordHash") VALUES (\'Cũ\', \'old@t.vn\', \'x\')');
    await legacy.destroy();

    ds = new DataSource({ ...connection, entities, migrations: TYPEORM_MIGRATIONS, synchronize: false });
    await ds.initialize();
    await ds.runMigrations();

    expect(await pendingSchemaChanges()).toEqual([]);
    expect(await ds.query('SELECT count(*)::int AS n FROM "users"')).toEqual([{ n: 1 }]); // dữ liệu cũ còn nguyên
  });

  it('báo lỗi rõ ràng khi chưa có bảng products của Prisma', async () => {
    ds = new DataSource({ ...connection, entities, migrations: TYPEORM_MIGRATIONS, dropSchema: true, synchronize: false });
    await ds.initialize();

    await expect(ds.runMigrations()).rejects.toThrow(/products/);
  });
});
