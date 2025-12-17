import type { SeatingFloor } from '@wcp/wario-shared';

export interface ISeatingFloorRepository {
  findById(id: string): Promise<SeatingFloor | null>;
  findAll(): Promise<SeatingFloor[]>;
  create(floor: Omit<SeatingFloor, 'id'>): Promise<SeatingFloor>;
  update(id: string, partial: Partial<Omit<SeatingFloor, 'id'>>): Promise<SeatingFloor | null>;
  delete(id: string): Promise<boolean>;
}

export const SEATING_FLOOR_REPOSITORY = Symbol('ISeatingFloorRepository');
