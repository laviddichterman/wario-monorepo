import type { SeatingResource } from '@wcp/wario-shared';

export interface ISeatingResourceRepository {
  findById(id: string): Promise<SeatingResource | null>;
  findAll(): Promise<SeatingResource[]>;
  findBySectionId(sectionId: string): Promise<SeatingResource[]>;
  create(resource: Omit<SeatingResource, 'id'>): Promise<SeatingResource>;
  update(id: string, partial: Partial<Omit<SeatingResource, 'id'>>): Promise<SeatingResource | null>;
  delete(id: string): Promise<boolean>;
}

export const SEATING_RESOURCE_REPOSITORY = Symbol('ISeatingResourceRepository');
