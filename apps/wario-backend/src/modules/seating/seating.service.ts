import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import {
  CreateSeatingFloorDto,
  CreateSeatingLayoutDto,
  CreateSeatingLayoutSectionDto,
  CreateSeatingResourceDto,
  FullSeatingFloor,
  FullSeatingLayout,
  FullSeatingSection,
  SeatingFloor,
  SeatingLayout,
  SeatingLayoutSection,
  SeatingResource,
  UpdateSeatingFloorDto,
  UpdateSeatingLayoutDto,
  UpdateSeatingLayoutSectionDto,
  UpdateSeatingResourceDto,
  UpsertSeatingFloorArrayElementDto,
  UpsertSeatingLayoutSectionArrayElementDto,
  UpsertSeatingResourceArrayElementDto,
} from '@wcp/wario-shared';

import { SocketIoService } from 'src/infrastructure/messaging/socket-io/socket-io.service';
import { DataProviderService } from 'src/modules/data-provider/data-provider.service';
import {
  SEATING_FLOOR_REPOSITORY,
  SEATING_LAYOUT_REPOSITORY,
  SEATING_RESOURCE_REPOSITORY,
  SEATING_SECTION_REPOSITORY,
} from 'src/repositories/interfaces';
import type { ISeatingFloorRepository } from 'src/repositories/interfaces/seating-floor.repository.interface';
import type { ISeatingLayoutRepository } from 'src/repositories/interfaces/seating-layout.repository.interface';
import type { ISeatingResourceRepository } from 'src/repositories/interfaces/seating-resource.repository.interface';
import type { ISeatingSectionRepository } from 'src/repositories/interfaces/seating-section.repository.interface';

@Injectable()
export class SeatingService {
  constructor(
    @Inject(SEATING_FLOOR_REPOSITORY)
    private readonly seatingFloorRepository: ISeatingFloorRepository,
    @Inject(SEATING_LAYOUT_REPOSITORY)
    private readonly seatingLayoutRepository: ISeatingLayoutRepository,
    @Inject(SEATING_RESOURCE_REPOSITORY)
    private readonly seatingResourceRepository: ISeatingResourceRepository,
    @Inject(SEATING_SECTION_REPOSITORY)
    private readonly seatingSectionRepository: ISeatingSectionRepository,
    private readonly socketIoService: SocketIoService,
    private readonly dataProvider: DataProviderService,
    @InjectPinoLogger(SeatingService.name)
    private readonly logger: PinoLogger,
  ) {}

  // --- FLOORS ---

  async getAllFloors(): Promise<SeatingFloor[]> {
    return this.seatingFloorRepository.findAll();
  }

  async getFloor(id: string): Promise<SeatingFloor | null> {
    return this.seatingFloorRepository.findById(id);
  }

  async createFloor(dto: CreateSeatingFloorDto): Promise<SeatingFloor> {
    // Create nested sections if they are objects
    const sectionIds = await this.syncSections([], dto.sections as UpsertSeatingLayoutSectionArrayElementDto[]);
    const created = await this.seatingFloorRepository.create({
      name: dto.name,
      disabled: dto.disabled,
      sections: sectionIds,
    });
    await this.notifyResourceChanges();
    return created;
  }

  async updateFloor(id: string, dto: UpdateSeatingFloorDto): Promise<SeatingFloor | null> {
    const existing = await this.seatingFloorRepository.findById(id);
    if (!existing) return null;

    // Sync nested sections logic
    let newSectionIds = existing.sections;
    if (dto.sections) {
      newSectionIds = await this.syncSections(existing.sections, dto.sections);
    }

    const { id: _id, sections: _sections, ...floorData } = dto;
    const updated = await this.seatingFloorRepository.update(id, { ...floorData, sections: newSectionIds });
    await this.notifyResourceChanges();
    return updated;
  }

  async deleteFloor(id: string): Promise<boolean> {
    const floor = await this.seatingFloorRepository.findById(id);
    if (floor) {
      await this.cascadeDeleteFloor(floor);
      await this.notifyResourceChanges();
      return true;
    }
    return false;
  }

  // --- LAYOUTS ---

  async getAllLayouts(): Promise<Omit<SeatingLayout, 'floors'>[]> {
    return this.seatingLayoutRepository.findAll();
  }

  async getLayout(id: string): Promise<SeatingLayout | null> {
    return this.seatingLayoutRepository.findById(id);
  }

  /**
   * Get a fully assembled layout with all floors, sections, and resources nested.
   * This is the main endpoint for fetching a layout to edit.
   */
  async getFullLayout(id: string): Promise<FullSeatingLayout | null> {
    const layout = await this.seatingLayoutRepository.findById(id);
    if (!layout) return null;

    // Fetch all floors referenced by this layout
    const floors = await Promise.all(layout.floors.map((floorId) => this.seatingFloorRepository.findById(floorId)));
    const validFloors = floors.filter((f): f is SeatingFloor => f !== null);

    // For each floor, assemble its sections with their resources
    const assembledFloors: FullSeatingFloor[] = [];
    for (const floor of validFloors) {
      // Fetch sections for this floor
      const sections = await Promise.all(
        floor.sections.map((sectionId) => this.seatingSectionRepository.findById(sectionId)),
      );
      const validSections = sections.filter((s): s is SeatingLayoutSection => s !== null);

      // For each section, assemble its resources
      const assembledSections: FullSeatingSection[] = [];
      for (const section of validSections) {
        const resources = await Promise.all(
          section.resources.map((resourceId) => this.seatingResourceRepository.findById(resourceId)),
        );
        const validResources = resources.filter((r): r is SeatingResource => r !== null);

        assembledSections.push({
          id: section.id,
          name: section.name,
          disabled: section.disabled,
          resources: validResources,
        });
      }

      assembledFloors.push({
        id: floor.id,
        name: floor.name,
        disabled: floor.disabled,
        sections: assembledSections,
      });
    }

    return {
      id: layout.id,
      name: layout.name,
      floors: assembledFloors,
    };
  }

  /**
   * Create a new layout with nested floors (can contain section/resource objects).
   * Uses syncFloors to recursively create nested entities.
   */
  async createLayout(layout: CreateSeatingLayoutDto): Promise<FullSeatingLayout> {
    // Recursively create floors (and their nested sections/resources)
    const floorIds = await this.syncFloors([], (layout.floors ?? []) as UpsertSeatingFloorArrayElementDto[]);

    // Create the layout with the generated floor IDs
    const createdLayout = await this.seatingLayoutRepository.create({
      name: layout.name,
      floors: floorIds,
    });

    await this.notifyResourceChanges();
    // Return fully populated layout with nested floors/sections/resources
    return (await this.getFullLayout(createdLayout.id)) as FullSeatingLayout;
  }

  /**
   * Update an existing layout with nested upsert support.
   * Floors can be: bare string IDs (reference existing), create objects, or update objects.
   * Sections are nested within floor updates.
   * Resources are nested within section updates.
   */
  async updateLayout(id: string, layout: UpdateSeatingLayoutDto): Promise<FullSeatingLayout | null> {
    // 1. Check if layout exists
    const existingLayout = await this.seatingLayoutRepository.findById(id);
    if (!existingLayout) return null;

    // Update layout name if provided
    if (layout.name !== undefined) {
      await this.seatingLayoutRepository.update(id, { name: layout.name });
    }

    // Sync nested floors if provided
    if (layout.floors) {
      const newFloorIds = await this.syncFloors(existingLayout.floors, layout.floors);
      await this.seatingLayoutRepository.update(id, { floors: newFloorIds });
    }

    await this.notifyResourceChanges();
    // Return fully populated layout
    return this.getFullLayout(id);
  }

  /**
   * Sync floors from an array of UpsertSeatingFloorArrayElementDto (string | upsert object).
   * Returns the new floor IDs array (for updating parent layout).
   * Deletes floors that are no longer referenced.
   */
  private async syncFloors(
    existingFloorIds: string[],
    incoming: UpsertSeatingFloorArrayElementDto[],
  ): Promise<string[]> {
    const newFloorIds: string[] = [];

    for (const item of incoming) {
      // Bare string = existing floor ID reference
      if (typeof item === 'string') {
        // Validate that the floor exists
        const floor = await this.seatingFloorRepository.findById(item);
        if (!floor) {
          throw new BadRequestException(`Floor with ID '${item}' does not exist`);
        }
        newFloorIds.push(item);
        continue;
      }

      // Object with id = update existing floor
      if ('id' in item && typeof item.id === 'string') {
        const updateDto = item;
        const existingFloor = await this.seatingFloorRepository.findById(updateDto.id);
        if (!existingFloor) {
          throw new BadRequestException(`Floor with ID '${updateDto.id}' does not exist for update`);
        }

        // Sync nested sections if provided
        let newSectionIds = existingFloor.sections;
        if (updateDto.sections) {
          newSectionIds = await this.syncSections(existingFloor.sections, updateDto.sections);
        }

        // Update the floor
        const { id, sections: _sections, ...floorData } = updateDto;
        await this.seatingFloorRepository.update(id, { ...floorData, sections: newSectionIds });
        newFloorIds.push(id);
        continue;
      }

      // Object without id = create new floor
      const createDto = item as CreateSeatingFloorDto;
      // Create nested sections if they are objects (not strings)
      const sectionIds = await this.syncSections([], createDto.sections ?? []);
      const createdFloor = await this.seatingFloorRepository.create({
        name: createDto.name,
        disabled: createDto.disabled,
        sections: sectionIds,
      });
      newFloorIds.push(createdFloor.id);
    }

    // Delete floors that are no longer in the incoming list
    const newFloorIdSet = new Set(newFloorIds);
    for (const oldFloorId of existingFloorIds) {
      if (!newFloorIdSet.has(oldFloorId)) {
        // Cascade delete: delete sections and their resources first
        const floor = await this.seatingFloorRepository.findById(oldFloorId);
        if (floor) {
          await this.cascadeDeleteFloor(floor);
        }
      }
    }

    return newFloorIds;
  }

  /**
   * Sync sections from an array of UpdateSeatingSectionItem (string | upsert object).
   * Returns the new section IDs array.
   */
  private async syncSections(
    existingSectionIds: string[],
    incoming: UpsertSeatingLayoutSectionArrayElementDto[],
  ): Promise<string[]> {
    const newSectionIds: string[] = [];

    for (const item of incoming) {
      // Bare string = existing section ID reference
      if (typeof item === 'string') {
        const section = await this.seatingSectionRepository.findById(item);
        if (!section) {
          throw new BadRequestException(`Section with ID '${item}' does not exist`);
        }
        newSectionIds.push(item);
        continue;
      }

      // Object with id = update existing section
      if ('id' in item && typeof item.id === 'string') {
        const updateDto = item;
        const existingSection = await this.seatingSectionRepository.findById(updateDto.id);
        if (!existingSection) {
          throw new BadRequestException(`Section with ID '${updateDto.id}' does not exist for update`);
        }

        // Sync nested resources if provided
        let newResourceIds = existingSection.resources;
        if (updateDto.resources) {
          newResourceIds = await this.syncResources(existingSection.resources, updateDto.resources);
        }

        // Update the section
        const { id, resources: _resources, ...sectionData } = updateDto;
        await this.seatingSectionRepository.update(id, { ...sectionData, resources: newResourceIds });
        newSectionIds.push(id);
        continue;
      }

      // Object without id = create new section
      const createDto = item as CreateSeatingLayoutSectionDto;
      // Create nested resources if they are objects (not strings)
      const resourceIds = await this.syncResources([], createDto.resources as UpsertSeatingResourceArrayElementDto[]);
      const createdSection = await this.seatingSectionRepository.create({
        name: createDto.name,
        disabled: createDto.disabled,
        resources: resourceIds,
      });
      newSectionIds.push(createdSection.id);
    }

    // Delete sections that are no longer in the incoming list
    const newSectionIdSet = new Set(newSectionIds);
    for (const oldSectionId of existingSectionIds) {
      if (!newSectionIdSet.has(oldSectionId)) {
        const section = await this.seatingSectionRepository.findById(oldSectionId);
        if (section) {
          await this.cascadeDeleteSection(section);
        }
      }
    }

    return newSectionIds;
  }

  /**
   * Sync resources from an array of UpdateSeatingResourceItem (string | upsert object).
   * Returns the new resource IDs array.
   */
  private async syncResources(
    existingResourceIds: string[],
    incoming: UpsertSeatingResourceArrayElementDto[],
  ): Promise<string[]> {
    const newResourceIds: string[] = [];

    for (const item of incoming) {
      // Bare string = existing resource ID reference
      if (typeof item === 'string') {
        const resource = await this.seatingResourceRepository.findById(item);
        if (!resource) {
          throw new BadRequestException(`Resource with ID '${item}' does not exist`);
        }
        newResourceIds.push(item);
        continue;
      }

      // Object with id = update existing resource
      if ('id' in item && typeof item.id === 'string') {
        const updateDto = item;
        const existingResource = await this.seatingResourceRepository.findById(updateDto.id);
        if (!existingResource) {
          throw new BadRequestException(`Resource with ID '${updateDto.id}' does not exist for update`);
        }

        const { id, ...resourceData } = updateDto;
        await this.seatingResourceRepository.update(id, resourceData);
        newResourceIds.push(id);
        continue;
      }

      // Object without id = create new resource
      const createDto = item as CreateSeatingResourceDto;
      const createdResource = await this.seatingResourceRepository.create(createDto);
      newResourceIds.push(createdResource.id);
    }

    // Delete resources that are no longer in the incoming list
    const newResourceIdSet = new Set(newResourceIds);
    for (const oldResourceId of existingResourceIds) {
      if (!newResourceIdSet.has(oldResourceId)) {
        await this.seatingResourceRepository.delete(oldResourceId);
      }
    }

    return newResourceIds;
  }

  /**
   * Cascade delete a floor and all its sections and resources.
   */
  private async cascadeDeleteFloor(floor: SeatingFloor): Promise<void> {
    for (const sectionId of floor.sections) {
      const section = await this.seatingSectionRepository.findById(sectionId);
      if (section) {
        await this.cascadeDeleteSection(section);
      }
    }
    await this.seatingFloorRepository.delete(floor.id);
  }

  /**
   * Cascade delete a section and all its resources.
   */
  private async cascadeDeleteSection(section: SeatingLayoutSection): Promise<void> {
    for (const resourceId of section.resources) {
      await this.seatingResourceRepository.delete(resourceId);
    }
    await this.seatingSectionRepository.delete(section.id);
  }

  async deleteLayout(id: string): Promise<boolean> {
    return this.seatingLayoutRepository.delete(id);
  }

  // --- SECTIONS ---

  async getAllSections(): Promise<SeatingLayoutSection[]> {
    return this.seatingSectionRepository.findAll();
  }

  async getSection(id: string): Promise<SeatingLayoutSection | null> {
    return this.seatingSectionRepository.findById(id);
  }

  async createSection(dto: CreateSeatingLayoutSectionDto): Promise<SeatingLayoutSection> {
    // Create nested resources if they are objects
    const resourceIds = await this.syncResources([], dto.resources as UpsertSeatingResourceArrayElementDto[]);
    const created = await this.seatingSectionRepository.create({
      name: dto.name,
      disabled: dto.disabled,
      resources: resourceIds,
    });
    await this.notifyResourceChanges();
    return created;
  }

  async updateSection(id: string, dto: UpdateSeatingLayoutSectionDto): Promise<SeatingLayoutSection | null> {
    const existing = await this.seatingSectionRepository.findById(id);
    if (!existing) return null;

    // Sync nested resources
    let newResourceIds = existing.resources;
    if (dto.resources) {
      newResourceIds = await this.syncResources(existing.resources, dto.resources);
    }

    const { id: _id, resources: _resources, ...sectionData } = dto;
    const updated = await this.seatingSectionRepository.update(id, { ...sectionData, resources: newResourceIds });
    await this.notifyResourceChanges();
    return updated;
  }

  async deleteSection(id: string): Promise<boolean> {
    const section = await this.seatingSectionRepository.findById(id);
    if (section) {
      await this.cascadeDeleteSection(section);
      await this.notifyResourceChanges();
      return true;
    }
    return false;
  }

  // --- RESOURCES ---

  async createResource(dto: CreateSeatingResourceDto): Promise<SeatingResource> {
    const created = await this.dataProvider.setSeatingResource(dto);
    await this.notifyResourceChanges();
    return created;
  }

  async updateResource(id: string, dto: UpdateSeatingResourceDto): Promise<SeatingResource | null> {
    const { id: _id, ...updateData } = dto;
    const updated = await this.dataProvider.updateSeatingResource(id, updateData);
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
    this.socketIoService.EmitSeatingResourcesTo(this.socketIoService.server, this.dataProvider.getSeatingResources());
  }
}
