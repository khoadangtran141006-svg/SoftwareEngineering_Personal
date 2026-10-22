import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { PromotionsService } from '../promotions/promotions.service.js';
import { OrderStateService } from './order-state.service.js';
import { OrderStatus } from './order-status.enum.js';

/** Các trạng thái chưa thanh toán thành công: khách được hủy và hệ thống được tự hết hạn. */
const CANCELLABLE_BY_CUSTOMER = [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED];

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly dataSource: DataSource,
    private readonly inventory: InventoryService,
    private readonly promotions: PromotionsService,
    private readonly orderState: OrderStateService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      let total = 0;

      const orderItems: Partial<OrderItem>[] = [];

      for (const item of createOrderDto.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Không tìm thấy sản phẩm có id ${item.productId}`,
          );
        }

        await this.inventory.reserve(manager, product, item.quantity);

        const sizeExtra = this.getSizeExtra(item.size);

        const toppings = item.toppings ?? [];
        const unitPrice = product.price + sizeExtra + this.getToppingsExtra(toppings);

        const lineTotal = unitPrice * item.quantity;

        total += lineTotal;

        orderItems.push({
          productId: product.id,
          size: item.size,
          quantity: item.quantity,
          lineTotal,
          toppings,
        });
      }

      const discount = this.promotions.discount(createOrderDto.promotionCode, total);
      total -= discount;
      const orderCode = this.generateOrderCode();

      const order = manager.create(Order, {
        orderCode,
        status: 'PENDING',
        total,
        userId,
      });

      const savedOrder = await manager.save(Order, order);

      const itemsToSave = orderItems.map((item) =>
        manager.create(OrderItem, {
          ...item,
          orderId: savedOrder.id,
        }),
      );

      await manager.save(OrderItem, itemsToSave);

      return {
        id: savedOrder.id,
        orderCode: savedOrder.orderCode,
        status: savedOrder.status,
        total: savedOrder.total,
        discount,
      };
    });
  }

  async findMine(userId: number) {
    return this.orderRepository.find({
      where: { userId },
      relations: { items: { product: true } },
      order: { createdAt: 'DESC' },
    });
  }

  /** Nhân viên cập nhật trạng thái đơn (theo state machine). */
  async updateStatus(id: number, next: OrderStatus) {
    return this.changeStatus(id, next);
  }

  /**
   * Khách tự hủy đơn của mình. Chỉ hủy được khi đơn chưa thanh toán (PENDING / PAYMENT_FAILED);
   * đơn đã PAID cần hoàn tiền nên phải do nhân viên xử lý.
   */
  async cancelMine(id: number, userId: number) {
    return this.changeStatus(id, OrderStatus.CANCELLED, {
      ownerId: userId,
      allowedFrom: CANCELLABLE_BY_CUSTOMER,
    });
  }

  /**
   * Hủy các đơn chưa thanh toán đã tạo quá lâu để trả lại tồn kho đã giữ chỗ.
   * Trả về số đơn đã được hủy.
   */
  async expireStaleOrders(maxAgeMs: number): Promise<number> {
    // So sánh bằng đồng hồ của CƠ SỞ DỮ LIỆU (cùng nguồn với cột createdAt), không dùng đồng hồ của máy chạy
    // backend: hai đồng hồ này có thể lệch nhau (ví dụ Docker Desktop trên Windows) và làm hủy nhầm đơn mới.
    const stale: Array<{ id: number }> = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.id', 'id')
      .where('o.status IN (:...statuses)', { statuses: CANCELLABLE_BY_CUSTOMER })
      .andWhere(`o."createdAt" < now() - make_interval(secs => (:seconds)::double precision)`, {
        seconds: maxAgeMs / 1000,
      })
      .orderBy('o.id', 'ASC')
      .limit(100)
      .getRawMany();

    let expired = 0;
    for (const { id } of stale) {
      try {
        // allowedFrom được kiểm tra lại dưới khóa dòng: đơn vừa được thanh toán thì bị bỏ qua.
        await this.changeStatus(id, OrderStatus.CANCELLED, { allowedFrom: CANCELLABLE_BY_CUSTOMER });
        expired += 1;
      } catch (error) {
        if (!(error instanceof BadRequestException) && !(error instanceof NotFoundException)) throw error;
      }
    }
    return expired;
  }

  private async changeStatus(
    id: number,
    next: OrderStatus,
    options: { ownerId?: number; allowedFrom?: OrderStatus[] } = {},
  ) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (options.ownerId !== undefined && order.userId !== options.ownerId) {
        throw new ForbiddenException('Bạn không có quyền thao tác trên đơn hàng này');
      }
      if (options.allowedFrom && !options.allowedFrom.includes(order.status as OrderStatus)) {
        throw new BadRequestException('Đơn hàng không thể hủy ở trạng thái hiện tại');
      }

      this.orderState.assertTransition(order.status as OrderStatus, next);

      if (next === OrderStatus.CANCELLED) {
        // Đơn bị hủy thì trả lại số lượng đã giữ chỗ lúc tạo đơn.
        const items = await manager.find(OrderItem, { where: { orderId: order.id } });
        for (const item of items) {
          await this.inventory.release(manager, item.productId, item.quantity);
        }
      }

      order.status = next;
      return manager.save(order);
    });
  }

  private getSizeExtra(size: string): number {
    switch (size) {
      case 'S':
        return 0;
      case 'M':
        return 5000;
      case 'L':
        return 10000;
      default:
        return 0;
    }
  }

  private getToppingsExtra(toppings: string[]) {
    const prices: Record<string, number> = {
      'Trân châu': 5000,
      'Kem cheese': 8000,
      Espresso: 10000,
    };
    return toppings.reduce((total, topping) => {
      const price = prices[topping];
      if (price === undefined) throw new BadRequestException('Topping không hợp lệ');
      return total + price;
    }, 0);
  }

  private generateOrderCode(): string {
    const now = new Date();

    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');

    const random = Math.floor(100000 + Math.random() * 900000);

    return `BL-${date}-${random}`;
  }
}
