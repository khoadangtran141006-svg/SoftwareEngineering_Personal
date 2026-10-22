import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { User } from '../src/users/entities/user.entity.js';
import { Product } from '../src/products/entities/product.entity.js';
import { Order } from '../src/orders/entities/order.entity.js';
import { OrderItem } from '../src/orders/entities/order-item.entity.js';
import { Payment } from '../src/payments/entities/payment.entity.js';
import { PasswordResetToken } from '../src/auth/entities/password-reset-token.entity.js';
import { InventoryService } from '../src/inventory/inventory.service.js';
import { PromotionsService } from '../src/promotions/promotions.service.js';
import { OrderStateService } from '../src/orders/order-state.service.js';
import { OrderStatus } from '../src/orders/order-status.enum.js';
import { OrdersService } from '../src/orders/orders.service.js';
import { PaymentsService } from '../src/payments/payments.service.js';
import { MockPaymentService } from '../src/payments/mock-payment.service.js';

/**
 * Integration test chạy trên PostgreSQL thật (không mock) để chứng minh Task 10:
 *  (a) chặn chuyển trạng thái sai, (b) Idempotency-Key, (c) tồn kho khi đặt đồng thời.
 *
 * Cấu hình kết nối bằng biến môi trường (mặc định trỏ tới Postgres cục bộ):
 *   TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER, TEST_DB_PASSWORD, TEST_DB_NAME
 * CẢNH BÁO: schema của database test sẽ bị xóa sạch ở mỗi lần chạy.
 */
describe('Task 10 – nghiệp vụ backend (PostgreSQL thật)', () => {
  let ds: DataSource;
  let orders: OrdersService;
  let payments: PaymentsService;
  let chargeSpy: ReturnType<typeof vi.spyOn>;
  let userId: number;
  let productId: number;

  const item = (quantity = 1) => ({ productId, size: 'S', quantity, toppings: [] as string[] });

  async function newOrder(quantity = 1, promotionCode?: string) {
    return orders.createOrder({ items: [item(quantity)], promotionCode } as never, userId);
  }
  const pay = (orderId: number, key: string, declined = false) =>
    payments.pay(
      { orderId, method: 'Thẻ ngân hàng', cardNumber: declined ? '4000000000000002' : '4242424242424242' } as never,
      key,
      userId,
    );
  const payWallet = (orderId: number, key: string, otp: string) =>
    payments.pay(
      { orderId, method: 'Ví điện tử', walletProvider: 'MoMo', walletPhone: '0912345678', otp } as never,
      key,
      userId,
    );
  const stockOf = async () => (await ds.getRepository(Product).findOneByOrFail({ id: productId })).stock;
  const pointsOf = async () => (await ds.getRepository(User).findOneByOrFail({ id: userId })).loyaltyPoints;

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
    // Cổng thanh toán chậm (60ms) để các request song song thực sự chồng lên nhau, giống môi trường thật/CI.
    const gateway = new MockPaymentService();
    const realCharge = gateway.charge.bind(gateway);
    chargeSpy = vi.spyOn(gateway, 'charge').mockImplementation(async (input) => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      return realCharge(input);
    });
    payments = new PaymentsService(
      ds.getRepository(Payment),
      ds.getRepository(Order),
      ds,
      gateway,
      state,
      promotions,
    );
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  beforeEach(async () => {
    chargeSpy.mockClear();
    await ds.query('TRUNCATE payments, order_items, orders, users, products RESTART IDENTITY CASCADE');
    const user = await ds.getRepository(User).save(
      ds.getRepository(User).create({ name: 'Test', email: 't@t.vn', passwordHash: 'x' }),
    );
    userId = user.id;
    const product = await ds.getRepository(Product).save(
      ds.getRepository(Product).create({ name: 'Cà phê sữa', category: 'coffee', price: 30000, imageUrl: 'x', stock: 5 }),
    );
    productId = product.id;
  });

  describe('(a) State machine', () => {
    it('chặn chuyển trạng thái không hợp lệ (PENDING → COMPLETED, PAID → PENDING)', async () => {
      const order = await newOrder();
      await expect(orders.updateStatus(order.id, OrderStatus.COMPLETED)).rejects.toBeInstanceOf(BadRequestException);
      await pay(order.id, 'k-a');
      await expect(orders.updateStatus(order.id, OrderStatus.PENDING)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('đi hết luồng PAID → PREPARING → READY → COMPLETED', async () => {
      const order = await newOrder();
      await pay(order.id, 'k-flow');
      for (const next of [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED]) {
        const updated = await orders.updateStatus(order.id, next);
        expect(updated.status).toBe(next);
      }
    });

    it('hủy đơn thì hoàn lại tồn kho', async () => {
      const order = await newOrder(2);
      expect(await stockOf()).toBe(3);
      await orders.updateStatus(order.id, OrderStatus.CANCELLED);
      expect(await stockOf()).toBe(5);
    });

    it('không hoàn kho hai lần khi hủy lặp lại', async () => {
      const order = await newOrder(2);
      await orders.updateStatus(order.id, OrderStatus.CANCELLED);
      await expect(orders.updateStatus(order.id, OrderStatus.CANCELLED)).rejects.toBeInstanceOf(BadRequestException);
      expect(await stockOf()).toBe(5);
    });
  });

  describe('(b) Thanh toán idempotent', () => {
    it('gửi lần lượt 2 lần cùng Idempotency-Key chỉ tạo 1 giao dịch và cộng điểm 1 lần', async () => {
      const order = await newOrder(1); // 30.000đ → 3 điểm
      const first = await pay(order.id, 'same-key');
      const second = await pay(order.id, 'same-key');
      expect(second.id).toBe(first.id);
      expect(await ds.getRepository(Payment).count()).toBe(1);
      expect(await pointsOf()).toBe(3);
    });

    it('gửi đồng thời nhiều request cùng key vẫn chỉ có 1 giao dịch và điểm cộng 1 lần', async () => {
      const order = await newOrder(1);
      const results = await Promise.allSettled(Array.from({ length: 5 }, () => pay(order.id, 'race-key')));
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(chargeSpy).toHaveBeenCalledTimes(1); // chỉ gọi cổng thanh toán đúng 1 lần
      expect(await ds.getRepository(Payment).count()).toBe(1);
      expect(await pointsOf()).toBe(3);
      expect((await ds.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe('PAID');
    });

    it('hai key khác nhau cùng trả một đơn → chỉ một giao dịch thành công', async () => {
      const order = await newOrder(1);
      const results = await Promise.allSettled([pay(order.id, 'key-1'), pay(order.id, 'key-2')]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(chargeSpy).toHaveBeenCalledTimes(1);
      expect(await ds.getRepository(Payment).count({ where: { status: 'SUCCEEDED' } })).toBe(1);
      expect(await pointsOf()).toBe(3);
    });

    it('ví điện tử: đúng OTP thì PAID, sai OTP thì PAYMENT_FAILED', async () => {
      const ok = await newOrder(1);
      expect((await payWallet(ok.id, 'w-1', '123456')).status).toBe('SUCCEEDED');
      const bad = await newOrder(1);
      expect((await payWallet(bad.id, 'w-2', '000000')).status).toBe('FAILED');
      expect((await ds.getRepository(Order).findOneByOrFail({ id: bad.id })).status).toBe('PAYMENT_FAILED');
    });

    it('dùng lại key cho đơn khác bị từ chối', async () => {
      const a = await newOrder(1);
      const b = await newOrder(1);
      await pay(a.id, 'reused');
      await expect(pay(b.id, 'reused')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('thanh toán lỗi → PAYMENT_FAILED, không cộng điểm; thử lại với key mới thì thành công', async () => {
      const order = await newOrder(1);
      const failed = await pay(order.id, 'fail-1', true);
      expect(failed.status).toBe('FAILED');
      expect((await ds.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe('PAYMENT_FAILED');
      expect(await pointsOf()).toBe(0);

      const retried = await pay(order.id, 'fail-2');
      expect(retried.status).toBe('SUCCEEDED');
      expect((await ds.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe('PAID');
    });
  });

  describe('(c) Tồn kho khi đặt đồng thời', () => {
    it('10 đơn cùng lúc khi kho còn 5 → đúng 5 đơn thành công, kho về 0, không âm', async () => {
      const results = await Promise.allSettled(Array.from({ length: 10 }, () => newOrder(1)));
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(5);
      expect(await stockOf()).toBe(0);
      expect(await ds.getRepository(Order).count()).toBe(5);
    });

    it('đơn thất bại giữa chừng không làm mất tồn kho (rollback)', async () => {
      await expect(newOrder(6)).rejects.toBeInstanceOf(BadRequestException);
      expect(await stockOf()).toBe(5);
      expect(await ds.getRepository(Order).count()).toBe(0);
    });
  });

  describe('Hủy đơn và đơn quá hạn', () => {
    const statusOf = async (id: number) => (await ds.getRepository(Order).findOneByOrFail({ id })).status;
    const backdate = (id: number, minutes: number) =>
      ds.query(`UPDATE orders SET "createdAt" = now() - ($2 || ' minutes')::interval WHERE id = $1`, [id, String(minutes)]);

    it('khách hủy đơn chưa thanh toán của mình thì được hoàn kho', async () => {
      const order = await newOrder(2);
      expect(await stockOf()).toBe(3);
      const cancelled = await orders.cancelMine(order.id, userId);
      expect(cancelled.status).toBe('CANCELLED');
      expect(await stockOf()).toBe(5);
    });

    it('khách không hủy được đơn của người khác', async () => {
      const order = await newOrder(2);
      await expect(orders.cancelMine(order.id, userId + 999)).rejects.toBeInstanceOf(ForbiddenException);
      expect(await statusOf(order.id)).toBe('PENDING');
      expect(await stockOf()).toBe(3);
    });

    it('khách không tự hủy được đơn đã thanh toán (cần nhân viên hoàn tiền)', async () => {
      const order = await newOrder(1);
      await pay(order.id, 'paid-1');
      await expect(orders.cancelMine(order.id, userId)).rejects.toBeInstanceOf(BadRequestException);
      expect(await statusOf(order.id)).toBe('PAID');
      expect(await stockOf()).toBe(4);
    });

    it('đơn PAYMENT_FAILED vẫn hủy được và hoàn kho', async () => {
      const order = await newOrder(1);
      await pay(order.id, 'fail-cancel', true);
      await orders.cancelMine(order.id, userId);
      expect(await statusOf(order.id)).toBe('CANCELLED');
      expect(await stockOf()).toBe(5);
    });

    it('hủy và thanh toán cùng lúc: kết quả luôn nhất quán (không vừa PAID vừa hoàn kho)', async () => {
      const order = await newOrder(1);
      const [cancel, payment] = await Promise.allSettled([orders.cancelMine(order.id, userId), pay(order.id, 'race-cancel')]);
      const status = await statusOf(order.id);
      if (status === 'PAID') {
        expect(cancel.status).toBe('rejected');
        expect(await stockOf()).toBe(4);
      } else {
        expect(status).toBe('CANCELLED');
        expect(payment.status).toBe('rejected');
        expect(await stockOf()).toBe(5);
        expect(await ds.getRepository(Payment).count()).toBe(0);
      }
    });

    it('đơn chưa thanh toán quá hạn bị hủy và hoàn kho; đơn mới hoặc đã thanh toán thì giữ nguyên', async () => {
      const stale = await newOrder(2);
      const fresh = await newOrder(1);
      const paid = await newOrder(1);
      await pay(paid.id, 'paid-old');
      await backdate(stale.id, 30);
      await backdate(paid.id, 30);

      const expired = await orders.expireStaleOrders(15 * 60_000);

      expect(expired).toBe(1);
      expect(await statusOf(stale.id)).toBe('CANCELLED');
      expect(await statusOf(fresh.id)).toBe('PENDING');
      expect(await statusOf(paid.id)).toBe('PAID');
      expect(await stockOf()).toBe(5 - 1 - 1); // chỉ còn giữ chỗ cho đơn mới và đơn đã thanh toán
    });

    it('không hủy nhầm đơn mới khi đồng hồ máy chạy ứng dụng lệch so với đồng hồ database', async () => {
      const fresh = await newOrder(1);
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.now() + 60 * 60_000); // giả lập máy ứng dụng nhanh hơn database 1 giờ
      try {
        expect(await orders.expireStaleOrders(15 * 60_000)).toBe(0);
      } finally {
        vi.useRealTimers();
      }
      expect(await statusOf(fresh.id)).toBe('PENDING');
      expect(await stockOf()).toBe(4);
    });

    it('dọn đơn quá hạn nhiều lần không hoàn kho hai lần', async () => {
      const stale = await newOrder(3);
      await backdate(stale.id, 30);
      expect(await orders.expireStaleOrders(15 * 60_000)).toBe(1);
      expect(await orders.expireStaleOrders(15 * 60_000)).toBe(0);
      expect(await stockOf()).toBe(5);
    });
  });

  describe('Khuyến mãi và điểm thưởng', () => {
    it('mã BREW10 giảm 10% và điểm tính theo số tiền sau giảm', async () => {
      const order = await newOrder(2, 'brew10'); // 60.000 → giảm 6.000 → 54.000 → 5 điểm
      expect(order.discount).toBe(6000);
      expect(order.total).toBe(54000);
      await pay(order.id, 'promo-key');
      expect(await pointsOf()).toBe(5);
    });

    it('mã sai bị từ chối và không trừ kho', async () => {
      await expect(newOrder(1, 'SAIMA')).rejects.toBeInstanceOf(BadRequestException);
      expect(await stockOf()).toBe(5);
    });
  });
});
