import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import {
  SeatingFloor,
  SeatingLayout,
  SeatingLayoutSection,
  SeatingPlacement,
  SeatingResource,
} from '@wcp/wario-shared';

import { DataProviderService } from 'src/config/data-provider/data-provider.service';
import { SocketIoService } from 'src/infrastructure/messaging/socket-io/socket-io.service';
import {
  SEATING_FLOOR_REPOSITORY,
  SEATING_LAYOUT_REPOSITORY,
  SEATING_PLACEMENT_REPOSITORY,
  SEATING_RESOURCE_REPOSITORY,
  SEATING_SECTION_REPOSITORY,
} from 'src/repositories/interfaces';
import type { ISeatingFloorRepository } from 'src/repositories/interfaces/seating-floor.repository.interface';
import type { ISeatingLayoutRepository } from 'src/repositories/interfaces/seating-layout.repository.interface';
import type { ISeatingPlacementRepository } from 'src/repositories/interfaces/seating-placement.repository.interface';
import type { ISeatingResourceRepository } from 'src/repositories/interfaces/seating-resource.repository.interface';
import type { ISeatingSectionRepository } from 'src/repositories/interfaces/seating-section.repository.interface';

@Injectable()
export class SeatingService {
  constructor(
    @Inject(SEATING_FLOOR_REPOSITORY)
    private readonly seatingFloorRepository: ISeatingFloorRepository,
    @Inject(SEATING_LAYOUT_REPOSITORY)
    private readonly seatingLayoutRepository: ISeatingLayoutRepository,
    @Inject(SEATING_PLACEMENT_REPOSITORY)
    private readonly seatingPlacementRepository: ISeatingPlacementRepository,
    @Inject(SEATING_RESOURCE_REPOSITORY)
    private readonly seatingResourceRepository: ISeatingResourceRepository,
    @Inject(SEATING_SECTION_REPOSITORY)
    private readonly seatingSectionRepository: ISeatingSectionRepository,
    private readonly socketIoService: SocketIoService,
    private readonly dataProvider: DataProviderService,
    @InjectPinoLogger(SeatingService.name)
    private readonly logger: PinoLogger,
  ) { }

  // --- FLOORS ---

  async getAllFloors(): Promise<SeatingFloor[]> {
    return this.seatingFloorRepository.findAll();
  }

  async getFloor(id: string): Promise<SeatingFloor | null> {
    return this.seatingFloorRepository.findById(id);
  }

  async createFloor(floor: Omit<SeatingFloor, 'id'>): Promise<SeatingFloor> {
    const created = await this.seatingFloorRepository.create(floor);
    // Emit updates if necessary? Currently Seating Resources are the main thing synced via socket
    // But full layout sync might be needed. For now sticking to simple CRUD
    return created;
  }

  async updateFloor(id: string, update: Partial<Omit<SeatingFloor, 'id'>>): Promise<SeatingFloor | null> {
    const updated = await this.seatingFloorRepository.update(id, update);
    return updated;
  }

  async deleteFloor(id: string): Promise<boolean> {
    return this.seatingFloorRepository.delete(id);
  }

  // --- LAYOUTS ---

  async getAllLayouts(): Promise<Omit<SeatingLayout, 'floors' | 'sections' | 'resources' | 'placements'>[]> {
    return this.seatingLayoutRepository.findAll();
  }

  async getLayout(id: string): Promise<Omit<SeatingLayout, 'floors' | 'sections' | 'resources' | 'placements'> | null> {
    return this.seatingLayoutRepository.findById(id);
  }

  async createLayout(layout: Omit<SeatingLayout, 'id'>): Promise<SeatingLayout> {
    return this.seatingLayoutRepository.create(layout);
  }

  async updateLayout(id: string, update: Partial<Omit<SeatingLayout, 'id'>>): Promise<SeatingLayout | null> {
    return this.seatingLayoutRepository.update(id, update);
  }

  async deleteLayout(id: string): Promise<boolean> {
    return this.seatingLayoutRepository.delete(id);
  }

  // --- PLACEMENTS ---

  async getAllPlacements(): Promise<SeatingPlacement[]> {
    return this.seatingPlacementRepository.findAll();
  }

  async getPlacement(id: string): Promise<SeatingPlacement | null> {
    return this.seatingPlacementRepository.findById(id);
  }

  async createPlacement(placement: Omit<SeatingPlacement, 'id'>): Promise<SeatingPlacement> {
    return this.seatingPlacementRepository.create(placement);
  }

  async updatePlacement(id: string, update: Partial<Omit<SeatingPlacement, 'id'>>): Promise<SeatingPlacement | null> {
    return this.seatingPlacementRepository.update(id, update);
  }

  async deletePlacement(id: string): Promise<boolean> {
    return this.seatingPlacementRepository.delete(id);
  }

  // --- SECTIONS ---

  async getAllSections(): Promise<SeatingLayoutSection[]> {
    return this.seatingSectionRepository.findAll();
  }

  async getSection(id: string): Promise<SeatingLayoutSection | null> {
    return this.seatingSectionRepository.findById(id);
  }

  async createSection(section: Omit<SeatingLayoutSection, 'id'>): Promise<SeatingLayoutSection> {
    return this.seatingSectionRepository.create(section);
  }

  async updateSection(id: string, update: Partial<Omit<SeatingLayoutSection, 'id'>>): Promise<SeatingLayoutSection | null> {
    return this.seatingSectionRepository.update(id, update);
  }

  async deleteSection(id: string): Promise<boolean> {
    return this.seatingSectionRepository.delete(id);
  }

  // --- RESOURCES (Existing + New Logic) ---
  // We keep using DataProvider for legacy compatibility where it caches things, 
  // but we can also use the repository directly if we move away from DataProvider.
  // The prompt asked for "full set of CRUD controllers".
  // SeatingResourceController currently uses DataProvider.
  // We should mirror that behavior or wrap it.

  // existing logic in SeatingResourceController calls:
  // dataProvider.setSeatingResource -> repo.create + update cache
  // dataProvider.syncSeatingResources -> repo.findAll + update cache
  // socketIoService.EmitSeatingResourcesTo -> emits cache

  // I will delegate to DataProvider for SeatingResource to maintain consistency with existing code,
  // OR I can reimplement it here and update DataProvider.
  // Given DataProvider is a "Config" service, it makes sense for it to hold the "live" config.
  // I will leave SeatingResource logic primarily in DataProvider BUT expose it here or let the controller keep using DataProvider?
  // The user asked for "Add the full set of CRUD controllers... SeatingResource...".
  // SeatingResourceController ALREADY exists. I should probably just update it or leave it.
  // I will implement the methods here wrapping DataProvider to centralize "Seating" operations if I want to be clean,
  // but to avoid circular deps (DataProvider might need SeatingService later?), I'll stick to:
  // SeatingService handles the NEW entities.
  // SeatingResourceController can stay as is OR use SeatingService.
  // If I move SeatingResource logic to SeatingService, I need to inject DataProvider to update its cache.

  async createResource(resource: Omit<SeatingResource, 'id'>): Promise<SeatingResource> {
    const created = await this.dataProvider.setSeatingResource(resource);
    // Sync and Emit
    await this.notifyResourceChanges();
    return created;
  }

  async updateResource(id: string, update: Partial<Omit<SeatingResource, 'id'>>): Promise<SeatingResource | null> {
    const updated = await this.dataProvider.updateSeatingResource(id, update);
    await this.notifyResourceChanges();
    return updated;
  }

  async deleteResource(id: string): Promise<boolean> {
    const result = await this.dataProvider.deleteSeatingResource(id);
    await this.notifyResourceChanges();
    return result;
  }

  async getAllResources(): Promise<Record<string, SeatingResource>> {
    return Promise.resolve(this.dataProvider.getSeatingResources());
  }

  private async notifyResourceChanges() {
    await this.dataProvider.syncSeatingResources();
    this.socketIoService.EmitSeatingResourcesTo(
      this.socketIoService.server,
      this.dataProvider.getSeatingResources()
    );
  }
}
