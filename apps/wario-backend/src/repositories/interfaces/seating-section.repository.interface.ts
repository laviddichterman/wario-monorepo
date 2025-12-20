import type { SeatingLayoutSection } from '@wcp/wario-shared';

export interface ISeatingSectionRepository {
  findById(id: string): Promise<SeatingLayoutSection | null>;
  findAll(): Promise<SeatingLayoutSection[]>;
  create(section: Omit<SeatingLayoutSection, 'id'>): Promise<SeatingLayoutSection>;
  update(id: string, partial: Partial<Omit<SeatingLayoutSection, 'id'>>): Promise<SeatingLayoutSection | null>;
  delete(id: string): Promise<boolean>;
}

export const SEATING_SECTION_REPOSITORY = Symbol('ISeatingSectionRepository');
