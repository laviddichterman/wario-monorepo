import type { SeatingLayout } from '@wcp/wario-shared';

/**
 * SeatingLayout is an aggregate type. The repository provides methods to:
 * - Get layout metadata (id, name)
 * - Assemble a full SeatingLayout by joining with floors/sections/resources/placements
 */
export interface ISeatingLayoutRepository {
  findById(id: string): Promise<SeatingLayout | null>;
  findAll(): Promise<Array<Omit<SeatingLayout, 'floors' | 'sections' | 'resources' | 'placements'>>>;
  create(
    layout: Omit<SeatingLayout, 'id' | 'floors' | 'sections' | 'resources' | 'placements'>,
  ): Promise<SeatingLayout>;
  update(
    id: string,
    partial: Partial<Omit<SeatingLayout, 'id' | 'floors' | 'sections' | 'resources' | 'placements'>>,
  ): Promise<SeatingLayout | null>;
  delete(id: string): Promise<boolean>;
}

export const SEATING_LAYOUT_REPOSITORY = Symbol('ISeatingLayoutRepository');
