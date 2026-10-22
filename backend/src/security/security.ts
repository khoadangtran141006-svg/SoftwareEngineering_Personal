import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import helmet from 'helmet';

const MINUTE_MS = 60_000;
const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/** Giới hạn chung: số request mỗi phút cho mỗi địa chỉ IP (RATE_LIMIT_PER_MINUTE, mặc định 200). */
export const RATE_LIMIT_PER_MINUTE = positiveInt(process.env.RATE_LIMIT_PER_MINUTE, 200);

/** Giới hạn chặt cho các endpoint xác thực để chống dò mật khẩu (AUTH_RATE_LIMIT_PER_MINUTE, mặc định 10). */
export const AUTH_RATE_LIMIT_PER_MINUTE = positiveInt(process.env.AUTH_RATE_LIMIT_PER_MINUTE, 10);

export const AUTH_THROTTLE = { default: { limit: AUTH_RATE_LIMIT_PER_MINUTE, ttl: MINUTE_MS } };

export const THROTTLER_OPTIONS: ThrottlerModuleOptions = {
  errorMessage: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  throttlers: [{ name: 'default', limit: RATE_LIMIT_PER_MINUTE, ttl: MINUTE_MS }],
};

/**
 * Danh sách địa chỉ giao diện được phép gọi API (CORS). FRONTEND_URL có thể chứa nhiều địa chỉ ngăn cách bằng dấu phẩy,
 * ví dụ "https://brewlite.vercel.app,http://localhost:3000".
 */
export function corsOrigins(value: string | undefined = process.env.FRONTEND_URL): string[] {
  const origins = (value ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return origins.length > 0 ? origins : ['http://localhost:3000'];
}

/**
 * Áp dụng các lớp bảo mật HTTP: header an toàn (helmet) và, khi chạy sau reverse proxy
 * (Render, Nginx...), đặt TRUST_PROXY để lấy đúng địa chỉ IP của người dùng cho việc giới hạn tần suất.
 */
export function applySecurity(app: INestApplication) {
  app.use(helmet());
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const hops = Number(trustProxy);
    (app as NestExpressApplication).set('trust proxy', Number.isInteger(hops) && hops > 0 ? hops : 1);
  }
}
