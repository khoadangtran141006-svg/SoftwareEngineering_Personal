import { Controller, Get, INestApplication, Module, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';

import { AUTH_RATE_LIMIT_PER_MINUTE, AUTH_THROTTLE, RATE_LIMIT_PER_MINUTE, THROTTLER_OPTIONS, applySecurity } from '../src/security/security.js';

@Controller()
class DemoController {
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  login() {
    return { ok: true };
  }

  @Get('products')
  products() {
    return [];
  }
}

@Module({
  imports: [ThrottlerModule.forRoot(THROTTLER_OPTIONS)],
  controllers: [DemoController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class DemoModule {}

describe('Bảo mật HTTP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DemoModule] }).compile();
    app = moduleRef.createNestApplication();
    applySecurity(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('đặt các header bảo mật của helmet', async () => {
    const response = await request(app.getHttpServer()).get('/products').expect(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('giới hạn số lần đăng nhập mỗi phút và trả 429 với thông báo tiếng Việt', async () => {
    for (let i = 0; i < AUTH_RATE_LIMIT_PER_MINUTE; i += 1) {
      await request(app.getHttpServer()).post('/login').expect(201);
    }
    const blocked = await request(app.getHttpServer()).post('/login').expect(429);
    expect(JSON.stringify(blocked.body)).toContain('thao tác quá nhanh');
  });

  it('endpoint thường có ngưỡng cao hơn nhiều so với endpoint xác thực', () => {
    expect(RATE_LIMIT_PER_MINUTE).toBeGreaterThan(AUTH_RATE_LIMIT_PER_MINUTE);
  });
});
