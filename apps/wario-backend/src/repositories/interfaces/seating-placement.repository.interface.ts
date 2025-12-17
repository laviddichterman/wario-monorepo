import type { SeatingPlacement } from '@wcp/wario-shared';

export interface ISeatingPlacementRepository {
  findById(id: string): Promise<SeatingPlacement | null>;
  findAll(): Promise<SeatingPlacement[]>;
  findBySectionId(sectionId: string): Promise<SeatingPlacement[]>;
  create(placement: Omit<SeatingPlacement, 'id'>): Promise<SeatingPlacement>;
  update(id: string, partial: Partial<Omit<SeatingPlacement, 'id'>>): Promise<SeatingPlacement | null>;
  delete(id: string): Promise<boolean>;
}

export const SEATING_PLACEMENT_REPOSITORY = Symbol('ISeatingPlacementRepository');
