import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { User } from '../src/users/entities/user.entity.js';
import { Product } from '../src/products/entities/product.entity.js';
import { Order } from '../src/orders/entities/order.entity.js';
import { OrderItem } from '../src/orders/entities/order-item.entity.js';
import { Payment } from '../src/payments/entities/payment.entity.js';
import { PasswordResetToken } from '../src/auth/entities/password-reset-token.entity.js';
import { InventoryService } from '../src/inventory/inventory.service.js';
import { PromotionsService } from '../src/promotions/promotions.service.js';
import { OrderStateService } from '../src/orders/order-state.service.js';
import { OrdersService } from '../src/orders/orders.service.js';
import { PaymentsService } from '../src/payments/payments.service.js';
import { MockPaymentService } from '../src/payments/mock-payment.service.js';

/**
 * Kiểm tra yêu cầu phi chức năng "thời gian phản hồi < 500 ms với dữ liệu mẫu" ở tầng nghiệp vụ + PostgreSQL thật.
 * Dữ liệu: 5 sản phẩm, một khách có 120 đơn (mỗi đơn 2 dòng hàng). Đo p95 qua 20 lần.
 * Ngưỡng 500 ms rất rộng so với thời gian thực tế nên không làm test dễ hỏng trên máy chậm.
 * Đo toàn bộ API qua HTTP: xem scripts/measure-latency.mjs.
 */
const LIMIT_MS = 500;
const RUNS = 20;

describe('Hiệu năng (PostgreSQL thật, dữ liệu mẫu)', () => {
  let ds: DataSource;
  let orders: OrdersService;
  let payments: PaymentsService;
  let userId: number;

  const p95 = (samples: number[]) => [...samples].sort((a, b) => a - b)[Math.ceil(0.95 * samples.length) - 1];
  async function sample(run: () => Promise<unknown>) {
    const times: number[] = [];
    for (let i = 0; i < RUNS; i += 1) {
      const started = performance.now();
      await run();
      times.push(performance.now() - started);
    }
    return p95(times);
  }

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      host: process.env.TEST_DB_HOST ?? 'localhost',
      port: Number(process.env.TEST_DB_PORT ?? 5432),
      username: process.env.TEST_DB_USER ?? 'postgres',
      password: process.env.TEST_DB_PASSWORD ?? 'postgres',
      database: process.env.TEST_DB_NAME ?? 'brewlite_test',
      entities: [User, Product, Order, OrderItem, Payment, PasswordResetToken],
      dropSchema: true,
      synchronize: true,
    });
    await ds.initialize();

    const state = new OrderStateService();
    const promotions = new PromotionsService();
    orders = new OrdersService(
      ds.getRepository(Order),
      ds.getRepository(OrderItem),
      ds.getRepository(Product),
      ds,
      new InventoryService(),
      promotions,
      state,
    );
    payments = new PaymentsService(ds.getRepository(Payment), ds.getRepository(Order), ds, new MockPaymentService(), state, promotions);

    const user = await ds.getRepository(User).save(ds.getRepository(User).create({ name: 'Perf', email: 'perf@t.vn', passwordHash: 'x' }));
    userId = user.id;
    const products = await ds.getRepository(Product).save(
      ['Cà phê sữa', 'Cà phê đen', 'Bạc xỉu', 'Trà đào', 'Trà sữa'].map((name, index) =>
        ds.getRepository(Product).create({ name, category: 'drink', price: 30000 + index * 5000, imageUrl: 'x', stock: 100000 }),
      ),
    );
    for (let i = 0; i < 120; i += 1) {
      await orders.createOrder(
        {
          items: [
            { productId: products[i % 5].id, size: 'M', quantity: 1, toppings: [] },
            { productId: products[(i + 1) % 5].id, size: 'L', quantity: 2, toppings: [] },
          ],
        } as never,
        userId,
      );
    }
  }, 120_000);

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it(`GET /orders/me (120 đơn, mỗi đơn 2 dòng hàng): p95 dưới ${LIMIT_MS} ms`, async () => {
    const value = await sample(() => orders.findMine(userId));
    console.info(`[hiệu năng] findMine p95 = ${value.toFixed(1)} ms`);
    expect(value).toBeLessThan(LIMIT_MS);
  });

  it(`POST /orders (tạo đơn có giữ chỗ tồn kho): p95 dưới ${LIMIT_MS} ms`, async () => {
    const product = await ds.getRepository(Product).findOneByOrFail({ name: 'Trà đào' });
    const value = await sample(() => orders.createOrder({ items: [{ productId: product.id, size: 'M', quantity: 1, toppings: [] }] } as never, userId));
    console.info(`[hiệu năng] createOrder p95 = ${value.toFixed(1)} ms`);
    expect(value).toBeLessThan(LIMIT_MS);
  });

  it(`POST /payments (thanh toán một đơn): p95 dưới ${LIMIT_MS} ms`, async () => {
    const product = await ds.getRepository(Product).findOneByOrFail({ name: 'Trà sữa' });
    const created = [] as number[];
    for (let i = 0; i < RUNS; i += 1) {
      created.push((await orders.createOrder({ items: [{ productId: product.id, size: 'S', quantity: 1, toppings: [] }] } as never, userId)).id);
    }
    let index = 0;
    const value = await sample(() =>
      payments.pay({ orderId: created[index], method: 'Thẻ ngân hàng', cardNumber: '4242424242424242' } as never, `perf-${index++}`, userId),
    );
    console.info(`[hiệu năng] pay p95 = ${value.toFixed(1)} ms`);
    expect(value).toBeLessThan(LIMIT_MS);
  });
});
