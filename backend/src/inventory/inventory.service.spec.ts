import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import type { EntityManager } from 'typeorm';
import { Product } from '../products/entities/product.entity.js';

describe('InventoryService', () => {
  const execute = vi.fn();
  const where = vi.fn(() => ({ execute }));
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const findOne = vi.fn();
  const manager = { createQueryBuilder: () => ({ update }), findOne };
  const inventory = new InventoryService();
  const productData = { id: 3, name: 'Bạc xỉu' };
  const product = productData as Product;

  function expectVersionedStockUpdate(stockExpression: string) {
    const changes = set.mock.calls.at(-1)?.[0] as {
      stock: () => string;
      version: () => string;
    };
    expect(changes.stock()).toBe(stockExpression);
    expect(changes.version()).toBe('version + 1');
  }

  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue({ affected: 1 });
    findOne.mockResolvedValue({ ...productData, stock: 5, version: 0 });
  });

  it('reserves stock with the current optimistic-lock version', async () => {
    await inventory.reserve(manager as unknown as EntityManager, product, 2);
    expect(update).toHaveBeenCalledWith(Product);
    expect(where).toHaveBeenCalledWith(
      'id = :id AND version = :version AND stock >= :quantity',
      { id: 3, version: 0, quantity: 2 },
    );
    expectVersionedStockUpdate('stock - :quantity');
  });

  it('re-reads the product and retries after a version conflict', async () => {
    findOne
      .mockResolvedValueOnce({ ...productData, stock: 5, version: 0 })
      .mockResolvedValueOnce({ ...productData, stock: 3, version: 1 });
    execute
      .mockResolvedValueOnce({ affected: 0 })
      .mockResolvedValueOnce({ affected: 1 });

    await inventory.reserve(manager as unknown as EntityManager, product, 2);

    expect(findOne).toHaveBeenCalledTimes(2);
    expect(where).toHaveBeenNthCalledWith(
      2,
      'id = :id AND version = :version AND stock >= :quantity',
      { id: 3, version: 1, quantity: 2 },
    );
  });

  it('rejects after exhausting the version-conflict retry limit', async () => {
    execute.mockResolvedValue({ affected: 0 });

    await expect(inventory.reserve(manager as unknown as EntityManager, product, 1))
      .rejects.toThrow('không đủ số lượng trong kho');

    expect(findOne).toHaveBeenCalledTimes(5);
    expect(execute).toHaveBeenCalledTimes(5);
  });

  it('rejects when concurrent orders consume the remaining stock', async () => {
    findOne
      .mockResolvedValueOnce({ ...productData, stock: 2, version: 0 })
      .mockResolvedValueOnce({ ...productData, stock: 0, version: 1 });
    execute.mockResolvedValueOnce({ affected: 0 });
    await expect(inventory.reserve(manager as unknown as EntityManager, product, 2)).rejects.toBeInstanceOf(BadRequestException);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('rejects immediately when the current stock is insufficient', async () => {
    findOne.mockResolvedValue({ ...productData, stock: 1, version: 0 });

    await expect(inventory.reserve(manager as unknown as EntityManager, product, 2))
      .rejects.toThrow('không đủ số lượng trong kho');
    expect(execute).not.toHaveBeenCalled();
  });

  it('releases stock and increments its version', async () => {
    await inventory.release(manager as unknown as EntityManager, product.id, 2);

    expect(update).toHaveBeenCalledWith(Product);
    expectVersionedStockUpdate('stock + :quantity');
    expect(where).toHaveBeenCalledWith('id = :id', { id: product.id, quantity: 2 });
  });
});
