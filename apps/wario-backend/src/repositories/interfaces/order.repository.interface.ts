import type { WFulfillmentStatus, WOrderInstance, WOrderStatus } from '@wcp/wario-shared';

export interface IOrderRepository {
  findById(id: string): Promise<WOrderInstance | null>;
  findByStatus(status: WOrderStatus): Promise<WOrderInstance[]>;
  findByFulfillmentDate(date: string): Promise<WOrderInstance[]>;
  findByDateRange(startDate: string, endDate: string): Promise<WOrderInstance[]>;
  save(order: WOrderInstance): Promise<WOrderInstance>;
  updateStatus(id: string, status: WOrderStatus): Promise<WOrderInstance | null>;
  delete(id: string): Promise<boolean>;

  // Methods for PrinterService/ThirdPartyOrderService
  findByThirdPartySquareIds(squareIds: string[]): Promise<WOrderInstance[]>;
  updateWithLock(id: string, lock: string | null, updates: Partial<WOrderInstance>): Promise<WOrderInstance | null>;
  releaseLock(id: string): Promise<void>;
  bulkCreate(orders: Omit<WOrderInstance, 'id'>[]): Promise<WOrderInstance[]>;

  // Methods for OrderManagerService
  /** Create a new order */
  create(order: Omit<WOrderInstance, 'id'>): Promise<WOrderInstance>;

  /** Find orders by their lock key */
  findByLock(lock: string): Promise<WOrderInstance[]>;

  /**
   * Atomically lock orders ready for fulfillment.
   * Returns the number of orders locked.
   */
  lockReadyOrders(
    status: WOrderStatus,
    fulfillmentStatus: WFulfillmentStatus,
    selectedDate: string,
    maxSelectedTime: number,
    lock: string,
  ): Promise<number>;

  /**
   * Atomically acquire lock on an order if conditions match.
   * Returns the order if lock was acquired, null otherwise.
   */
  acquireLock(id: string, status: WOrderStatus, lock: string): Promise<WOrderInstance | null>;

  /**
   * Atomically try to acquire lock on an order if not already locked.
   * Used by OrderLockInterceptor. Returns the order if lock was acquired, null otherwise.
   */
  tryAcquireLock(id: string, lock: string): Promise<WOrderInstance | null>;

  /** Unlock all locked orders (admin operation). Returns count of unlocked orders. */
  unlockAll(): Promise<number>;
}

export const ORDER_REPOSITORY = Symbol('IOrderRepository');
