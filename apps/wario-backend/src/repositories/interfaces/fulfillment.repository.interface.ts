import type { FulfillmentConfig } from '@wcp/wario-shared';

export interface IFulfillmentRepository {
  findById(id: string): Promise<FulfillmentConfig | null>;
  findAll(): Promise<FulfillmentConfig[]>;
  findByService(service: string): Promise<FulfillmentConfig[]>;
  create(fulfillment: Omit<FulfillmentConfig, 'id'>): Promise<FulfillmentConfig>;
  update(id: string, partial: Partial<Omit<FulfillmentConfig, 'id'>>): Promise<FulfillmentConfig | null>;
  delete(id: string): Promise<boolean>;
}

export const FULFILLMENT_REPOSITORY = Symbol('IFulfillmentRepository');
