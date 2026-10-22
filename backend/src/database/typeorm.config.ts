import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { InitialSchema1760000000000 } from './migrations/1760000000000-initial-schema.js';

/** Danh sách migration của các bảng do TypeORM quản lý (bảng products do Prisma quản lý). */
export const TYPEORM_MIGRATIONS = [InitialSchema1760000000000];

/**
 * Cấu hình kết nối TypeORM.
 * - Có DB_HOST: dùng các biến DB_* riêng lẻ (Docker Compose, máy phát triển).
 * - Không có DB_HOST: dùng DATABASE_URL (dịch vụ PostgreSQL trên máy chủ thật).
 * - DB_SSL=true: bật SSL (nhiều dịch vụ PostgreSQL trên mạng yêu cầu).
 * Không còn dùng `synchronize`: lược đồ thay đổi qua migration, tự chạy khi khởi động.
 */
export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const host = config.get<string>('DB_HOST');
  const connection = host
    ? {
        host,
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
      }
    : { url: config.getOrThrow<string>('DATABASE_URL') };

  return {
    type: 'postgres',
    ...connection,
    ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    synchronize: false,
    migrations: TYPEORM_MIGRATIONS,
    migrationsRun: true,
  };
}
