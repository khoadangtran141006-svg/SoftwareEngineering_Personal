import { BadRequestException, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { Product } from '../products/entities/product.entity.js';

@Injectable()
export class InventoryService {
  private static readonly MAX_RESERVE_ATTEMPTS = 5;
  private static readonly RETRY_BACKOFF_MS = 5;

  async reserve(manager: EntityManager, product: Product, quantity: number) {
    for (let attempt = 0; attempt < InventoryService.MAX_RESERVE_ATTEMPTS; attempt += 1) {
      const current = await manager.findOne(Product, {
        where: { id: product.id },
      });

      if (!current || current.stock < quantity) {
        throw this.insufficientStock(product.name);
      }

      const result = await manager
        .createQueryBuilder()
        .update(Product)
        .set({
          stock: () => 'stock - :quantity',
          version: () => 'version + 1',
        })
        .where(
          'id = :id AND version = :version AND stock >= :quantity',
          { id: current.id, version: current.version, quantity },
        )
        .execute();

      if (result.affected) return;

      if (attempt + 1 < InventoryService.MAX_RESERVE_ATTEMPTS) {
        await new Promise((resolve) =>
          setTimeout(resolve, InventoryService.RETRY_BACKOFF_MS * (attempt + 1)),
        );
      }
    }

    // A depleted stock or an exhausted version-conflict retry uses the same domain error.
    throw this.insufficientStock(product.name);
  }

  /** Hoàn lại tồn kho (ví dụ khi đơn bị hủy). */
  async release(manager: EntityManager, productId: number, quantity: number) {
    await manager
      .createQueryBuilder()
      .update(Product)
      .set({
        stock: () => 'stock + :quantity',
        version: () => 'version + 1',
      })
      .where('id = :id', { id: productId, quantity })
      .execute();
  }

  private insufficientStock(productName: string) {
    return new BadRequestException(
      `Sản phẩm "${productName}" không đủ số lượng trong kho`,
    );
  }
}
