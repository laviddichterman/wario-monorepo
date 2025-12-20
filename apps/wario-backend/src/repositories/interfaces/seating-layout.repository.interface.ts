import type { SeatingLayout } from '@wcp/wario-shared';

/**
 * SeatingLayout repository for normalized model.
 * Layout stores floors as string[] (floor IDs in display order).
 */
export interface ISeatingLayoutRepository {
  findById(id: string): Promise<SeatingLayout | null>;
  findAll(): Promise<Array<Omit<SeatingLayout, 'floors'>>>;
  create(layout: Omit<SeatingLayout, 'id'>): Promise<SeatingLayout>;
  update(id: string, partial: Partial<Omit<SeatingLayout, 'id'>>): Promise<SeatingLayout | null>;
  delete(id: string): Promise<boolean>;
}

export const SEATING_LAYOUT_REPOSITORY = Symbol('ISeatingLayoutRepository');
