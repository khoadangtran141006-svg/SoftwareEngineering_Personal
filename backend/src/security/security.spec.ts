import { describe, expect, it } from 'vitest';
import { corsOrigins } from './security.js';

describe('corsOrigins', () => {
  it('mặc định là giao diện chạy cục bộ', () => {
    expect(corsOrigins(undefined)).toEqual(['http://localhost:3000']);
    expect(corsOrigins('')).toEqual(['http://localhost:3000']);
  });

  it('nhận nhiều địa chỉ ngăn cách bằng dấu phẩy, bỏ khoảng trắng và dấu / cuối', () => {
    expect(corsOrigins('https://brewlite.vercel.app/, http://localhost:3000')).toEqual([
      'https://brewlite.vercel.app',
      'http://localhost:3000',
    ]);
  });
});
