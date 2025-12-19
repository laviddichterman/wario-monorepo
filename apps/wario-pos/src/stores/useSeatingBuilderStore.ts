/**
 * Zustand store for Seating Builder state management.
 *
 * DESIGN: Stores normalized state directly in Zustand for stable references.
 * The SeatingLayoutStore class is used only for load/save serialization,
 * not for runtime state management.
 */

import { create } from 'zustand';

import type {
  SeatingFloor,
  SeatingLayout,
  SeatingLayoutSection,
  SeatingResource,
  SeatingShape,
  UpsertSeatingLayoutRequest,
} from '@wcp/wario-shared/types';

// Simple ID generator using crypto API
const generateId = (): string => crypto.randomUUID();

// ---------- Undo/Redo Constants ----------
const MAX_UNDO_STACK_SIZE = 50;
const MAX_REDO_STACK_SIZE = 50;

/** Deep clone a LayoutState for undo/redo snapshots */
const cloneLayoutState = (layout: LayoutState): LayoutState => ({
  id: layout.id,
  name: layout.name,
  floorsById: { ...layout.floorsById },
  floorIds: [...layout.floorIds],
  sectionsById: { ...layout.sectionsById },
  sectionIdsByFloorId: Object.fromEntries(
    Object.entries(layout.sectionIdsByFloorId).map(([k, v]) => [k, [...v]]),
  ),
  resourcesById: Object.fromEntries(
    Object.entries(layout.resourcesById).map(([k, v]) => [k, { ...v }]),
  ),
  resourceIdsBySectionId: Object.fromEntries(
    Object.entries(layout.resourceIdsBySectionId).map(([k, v]) => [k, [...v]]),
  ),
});

// ---------- Types ----------

export interface SeatingResourceRenderModel {
  id: string;
  name: string;
  sectionId: string;
  capacity: number;
  shape: SeatingShape;
  shapeDimX: number;
  shapeDimY: number;
  disabled: boolean;
  centerX: number;
  centerY: number;
  rotation: number;
  isSelected: boolean;
  /** Whether this table belongs to the currently active section */
  isActiveSection: boolean;
}

export interface AddResourceParams {
  sectionId: string;
  name: string;
  capacity: number;
  shape: SeatingShape;
  shapeDimX: number;
  shapeDimY: number;
  centerX?: number;
  centerY?: number;
  rotation?: number;
}

export interface TemporaryMergeGroup {
  id: string;
  resourceIds: string[];
}

export interface UpdateResourceParams {
  name?: string;
  capacity?: number;
  shape?: SeatingShape;
  shapeDimX?: number;
  shapeDimY?: number;
  centerX?: number;
  centerY?: number;
  rotation?: number;
}

export interface UpdatePlacementParams {
  rotation?: number;
}

// ---------- State Shape ----------

interface LayoutState {
  id: string;
  name: string;
  floorsById: Record<string, SeatingFloor>;
  floorIds: string[];
  sectionsById: Record<string, SeatingLayoutSection>;
  sectionIdsByFloorId: Record<string, string[]>;
  resourcesById: Record<string, SeatingResource>;
  resourceIdsBySectionId: Record<string, string[]>;
}

interface EditorState {
  activeFloorId: string | null;
  activeSectionId: string | null;
  selectedResourceIds: string[];
  gridSize: number;
  snapToGrid: boolean;
}

/** Snapshot of layout state for undo/redo */
interface UndoRedoSnapshot {
  layout: LayoutState;
  label: string;
}

export interface SeatingBuilderState {
  // Flattened layout data - stable references
  layout: LayoutState;
  editor: EditorState;

  // UI state
  isDirty: boolean;
  originalLayoutId: string | null;
  /** IDs of entities that exist on the server (used to distinguish new vs existing) */
  serverEntityIds: Set<string>;
  temporaryMerges: TemporaryMergeGroup[];
  interactionMode: 'SELECT' | 'PAN' | 'ADD_TABLE';

  // Undo/Redo stacks
  undoStack: UndoRedoSnapshot[];
  redoStack: UndoRedoSnapshot[];

  // Actions
  loadLayout: (layout: SeatingLayout) => void;
  createEmptyLayout: (name?: string) => void;
  markClean: () => void;
  setActiveFloor: (floorId: string | null) => void;
  setActiveSection: (sectionId: string | null) => void;
  selectResources: (ids: string[]) => void;
  clearSelection: () => void;
  moveResources: (ids: string[], dx: number, dy: number) => void;
  addFloor: (name: string) => void;
  addSection: (floorId: string, name: string) => void;
  addResource: (params: AddResourceParams) => void;
  updateResource: (id: string, updates: UpdateResourceParams) => void;
  updatePlacement: (id: string, updates: UpdatePlacementParams) => void;
  deleteResources: (ids: string[]) => void;
  deleteSection: (sectionId: string) => void;
  deleteFloor: (floorId: string) => void;
  resetToDefaultLayout: () => void;
  rotateResources: (ids: string[], degrees: number) => void;
  setInteractionMode: (mode: 'SELECT' | 'PAN' | 'ADD_TABLE') => void;
  /** Returns layout for API - new entities have no id, existing have id */
  /** Returns layout for API - new entities have no id, existing have id */
  toLayout: () => UpsertSeatingLayoutRequest;

  // Undo/Redo actions
  /** Push current state to undo stack with a label describing the action about to happen */
  pushUndoCheckpoint: (label: string) => void;
  /** Undo the last action, returns the label of the undone action or null if nothing to undo */
  undo: () => string | null;
  /** Redo the last undone action, returns the label of the redone action or null if nothing to redo */
  redo: () => string | null;
  /** Clear undo/redo history (called on layout load) */
  clearHistory: () => void;

  // Helper functions for quick-add
  getNextTableNumber: () => number;
  findAvailablePosition: (sectionId: string, gridSize?: number) => { x: number; y: number };
}

//

// ---------- Initial State Factory ----------

const createInitialLayout = (): { layout: LayoutState; editor: EditorState } => {
  const layoutId = generateId();
  const floorId = generateId();
  const sectionId = generateId();

  const floor: SeatingFloor = { id: floorId, name: 'Main Floor', ordinal: 0, disabled: false };
  const section: SeatingLayoutSection = { id: sectionId, floorId, name: 'Main Area', ordinal: 0, disabled: false };

  return {
    layout: {
      id: layoutId,
      name: 'Default Layout',
      floorsById: { [floorId]: floor },
      floorIds: [floorId],
      sectionsById: { [sectionId]: section },
      sectionIdsByFloorId: { [floorId]: [sectionId] },
      resourcesById: {},
      resourceIdsBySectionId: { [sectionId]: [] },
    },
    editor: {
      activeFloorId: floorId,
      activeSectionId: sectionId,
      selectedResourceIds: [],
      gridSize: 10,
      snapToGrid: true,
    },
  };
};

// ---------- Zustand Store ----------

export const useSeatingBuilderStore = create<SeatingBuilderState>()((set, get) => {
  const initial = createInitialLayout();

  return {
    layout: initial.layout,
    editor: initial.editor,
    isDirty: false,
    originalLayoutId: null,
    serverEntityIds: new Set<string>(),
    temporaryMerges: [],
    interactionMode: 'SELECT',
    undoStack: [],
    redoStack: [],

    loadLayout: (apiLayout) => {
      // Sort arrays by ordinal
      const sortByOrdinal = <T extends { ordinal: number; id: string }>(xs: T[]) =>
        [...xs].sort((a, b) => a.ordinal - b.ordinal || a.id.localeCompare(b.id));

      // Parse floors
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const floors = sortByOrdinal(apiLayout.floors ?? []);
      const floorsById = Object.fromEntries(floors.map((f) => [f.id, f])) as Record<string, SeatingFloor>;
      const floorIds = floors.map((f) => f.id);

      // Parse sections
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const sections = sortByOrdinal(apiLayout.sections ?? []);
      const sectionsById = Object.fromEntries(sections.map((s) => [s.id, s])) as Record<string, SeatingLayoutSection>;
      const sectionIdsByFloorId = sections.reduce<Record<string, string[]>>((acc, section) => {
        (acc[section.floorId] ??= []).push(section.id);
        return acc;
      }, {});

      // Parse resources (now include centerX, centerY, rotation directly)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const resources = apiLayout.resources ?? [];
      const resourcesById = Object.fromEntries(resources.map((r) => [r.id, r])) as Record<string, SeatingResource>;
      const resourceIdsBySectionId = resources.reduce<Record<string, string[]>>((acc, resource) => {
        (acc[resource.sectionId] ??= []).push(resource.id);
        return acc;
      }, {});

      // Compute active floor and section
      const activeFloorId = floorIds[0] ?? null;
      const firstSectionIds = activeFloorId ? (sectionIdsByFloorId[activeFloorId] ?? []) : [];
      const activeSectionId = firstSectionIds[0] ?? null;

      // Collect all server entity IDs for distinguishing new vs existing
      const serverEntityIds = new Set<string>([
        ...floorIds,
        ...sections.map((s) => s.id),
        ...resources.map((r) => r.id),
      ]);

      set({
        layout: {
          id: apiLayout.id,
          name: apiLayout.name,
          floorsById,
          floorIds,
          sectionsById,
          sectionIdsByFloorId,
          resourcesById,
          resourceIdsBySectionId,
        },
        editor: {
          activeFloorId,
          activeSectionId,
          selectedResourceIds: [],
          gridSize: 10,
          snapToGrid: true,
        },
        isDirty: false,
        originalLayoutId: apiLayout.id,
        serverEntityIds,
        temporaryMerges: [],
        undoStack: [],
        redoStack: [],
      });
    },

    createEmptyLayout: (name = 'New Layout') => {
      const floorId = generateId();
      const sectionId = generateId();

      const floor: SeatingFloor = { id: floorId, name: 'Main Floor', ordinal: 0, disabled: false };
      const section: SeatingLayoutSection = { id: sectionId, floorId, name: 'Main Area', ordinal: 0, disabled: false };

      set({
        layout: {
          id: generateId(),
          name,
          floorsById: { [floorId]: floor },
          floorIds: [floorId],
          sectionsById: { [sectionId]: section },
          sectionIdsByFloorId: { [floorId]: [sectionId] },
          resourcesById: {},
          resourceIdsBySectionId: { [sectionId]: [] },
        },
        editor: {
          activeFloorId: floorId,
          activeSectionId: sectionId,
          selectedResourceIds: [],
          gridSize: 10,
          snapToGrid: true,
        },
        isDirty: true,
        originalLayoutId: null,
        temporaryMerges: [],
        undoStack: [],
        redoStack: [],
      });
    },

    markClean: () => {
      set({ isDirty: false });
    },

    setActiveFloor: (floorId) => {
      set((s) => {
        const sectionIds = floorId ? (s.layout.sectionIdsByFloorId[floorId] ?? []) : [];
        return {
          editor: {
            ...s.editor,
            activeFloorId: floorId,
            activeSectionId: sectionIds[0] ?? null,
            selectedResourceIds: [],
          },
        };
      });
    },

    setActiveSection: (sectionId) => {
      set((s) => ({
        editor: { ...s.editor, activeSectionId: sectionId, selectedResourceIds: [] },
      }));
    },

    selectResources: (ids) => {
      set((s) => ({
        editor: { ...s.editor, selectedResourceIds: ids },
      }));
    },

    clearSelection: () => {
      set((s) => ({
        editor: { ...s.editor, selectedResourceIds: [] },
      }));
    },

    moveResources: (ids, dx, dy) => {
      set((s) => {
        const { gridSize, snapToGrid } = s.editor;
        const newResourcesById = { ...s.layout.resourcesById };

        for (const id of ids) {
          const resource = newResourcesById[id];
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!resource) continue;

          let newX = resource.centerX + dx;
          let newY = resource.centerY + dy;

          if (snapToGrid) {
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
          }

          newResourcesById[id] = { ...resource, centerX: newX, centerY: newY };
        }

        return {
          layout: { ...s.layout, resourcesById: newResourcesById },
          isDirty: true,
        };
      });
    },

    addFloor: (name) => {
      get().pushUndoCheckpoint(`Add floor "${name}"`);
      const id = generateId();
      const floor: SeatingFloor = { id, name, ordinal: get().layout.floorIds.length, disabled: false };

      set((s) => ({
        layout: {
          ...s.layout,
          floorsById: { ...s.layout.floorsById, [id]: floor },
          floorIds: [...s.layout.floorIds, id],
          sectionIdsByFloorId: { ...s.layout.sectionIdsByFloorId, [id]: [] },
        },
        editor: {
          ...s.editor,
          activeFloorId: s.editor.activeFloorId ?? id,
        },
        isDirty: true,
      }));
    },

    addSection: (floorId, name) => {
      get().pushUndoCheckpoint(`Add section "${name}"`);
      const id = generateId();
      const currentSections = get().layout.sectionIdsByFloorId[floorId] ?? [];
      const section: SeatingLayoutSection = { id, floorId, name, ordinal: currentSections.length, disabled: false };

      set((s) => ({
        layout: {
          ...s.layout,
          sectionsById: { ...s.layout.sectionsById, [id]: section },
          sectionIdsByFloorId: {
            ...s.layout.sectionIdsByFloorId,
            [floorId]: [...(s.layout.sectionIdsByFloorId[floorId] ?? []), id],
          },
          resourceIdsBySectionId: { ...s.layout.resourceIdsBySectionId, [id]: [] },
        },
        editor: {
          ...s.editor,
          activeSectionId: s.editor.activeSectionId ?? id,
        },
        isDirty: true,
      }));
    },

    addResource: (params) => {
      get().pushUndoCheckpoint(`Add ${params.name}`);
      const id = generateId();
      const resource: SeatingResource = {
        id,
        sectionId: params.sectionId,
        name: params.name,
        capacity: params.capacity,
        shape: params.shape,
        shapeDimX: params.shapeDimX,
        shapeDimY: params.shapeDimY,
        centerX: params.centerX ?? 100,
        centerY: params.centerY ?? 100,
        rotation: params.rotation ?? 0,
        disabled: false,
      };

      set((s) => ({
        layout: {
          ...s.layout,
          resourcesById: { ...s.layout.resourcesById, [id]: resource },
          resourceIdsBySectionId: {
            ...s.layout.resourceIdsBySectionId,
            [params.sectionId]: [...(s.layout.resourceIdsBySectionId[params.sectionId] ?? []), id],
          },
        },
        isDirty: true,
      }));
    },

    updateResource: (id, updates) => {
      const existing = get().layout.resourcesById[id] as { name: string } | undefined;
      const resourceName = existing?.name ?? 'table';
      get().pushUndoCheckpoint(`Update ${resourceName}`);
      set((s) => {
        const existing = s.layout.resourcesById[id];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!existing) return s;

        const updated: SeatingResource = {
          ...existing,
          ...updates,
        };

        return {
          layout: {
            ...s.layout,
            resourcesById: { ...s.layout.resourcesById, [id]: updated },
          },
          isDirty: true,
        };
      });
    },

    updatePlacement: (id, updates) => {
      set((s) => {
        const existing = s.layout.resourcesById[id];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!existing) return s;

        // Normalize rotation to 0-360
        let rotation = updates.rotation ?? existing.rotation;
        rotation = ((rotation % 360) + 360) % 360;

        const updated = {
          ...existing,
          rotation,
        };

        return {
          layout: {
            ...s.layout,
            resourcesById: { ...s.layout.resourcesById, [id]: updated },
          },
          isDirty: true,
        };
      });
    },

    deleteResources: (ids) => {
      const count = ids.length;
      get().pushUndoCheckpoint(`Delete ${String(count)} table${count > 1 ? 's' : ''}`);
      set((s) => {
        const idsToDelete = new Set(ids);

        // Filter out deleted resources
        const newResourcesById = Object.fromEntries(
          Object.entries(s.layout.resourcesById).filter(([id]) => !idsToDelete.has(id)),
        );

        // Remove from section resource lists
        const newResourceIdsBySectionId: Record<string, string[]> = {};
        for (const [sectionId, resourceIds] of Object.entries(s.layout.resourceIdsBySectionId)) {
          newResourceIdsBySectionId[sectionId] = resourceIds.filter((id) => !idsToDelete.has(id));
        }

        return {
          layout: {
            ...s.layout,
            resourcesById: newResourcesById,
            resourceIdsBySectionId: newResourceIdsBySectionId,
          },
          editor: {
            ...s.editor,
            selectedResourceIds: s.editor.selectedResourceIds.filter((id) => !idsToDelete.has(id)),
          },
          isDirty: true,
        };
      });
    },

    deleteSection: (sectionId) => {
      const state = get();
      const section = state.layout.sectionsById[sectionId] as { floorId: string; name: string } | undefined;

      if (!section) return;

      // Don't allow deleting the last section on a floor
      const floorSections = state.layout.sectionIdsByFloorId[section.floorId] ?? [];
      if (floorSections.length <= 1) return;

      // Get resource count for label
      const resourceIds = state.layout.resourceIdsBySectionId[sectionId] ?? [];
      const resourceCount = resourceIds.length;
      const label = resourceCount > 0
        ? `Delete section "${section.name}" (${String(resourceCount)} table${resourceCount > 1 ? 's' : ''})`
        : `Delete section "${section.name}"`;

      get().pushUndoCheckpoint(label);

      set((s) => {
        const floorId = section.floorId;

        // Remove all resources in this section
        const resourcesToDelete = new Set(s.layout.resourceIdsBySectionId[sectionId] ?? []);
        const newResourcesById = Object.fromEntries(
          Object.entries(s.layout.resourcesById).filter(([id]) => !resourcesToDelete.has(id)),
        );

        // Remove section from sectionsById
        const { [sectionId]: _removed, ...newSectionsById } = s.layout.sectionsById;

        // Remove section from floor's section list
        const newSectionIdsByFloorId = {
          ...s.layout.sectionIdsByFloorId,
          [floorId]: (s.layout.sectionIdsByFloorId[floorId] ?? []).filter((id) => id !== sectionId),
        };

        // Remove section's resource list
        const { [sectionId]: _removedResources, ...newResourceIdsBySectionId } = s.layout.resourceIdsBySectionId;

        // If active section was deleted, switch to first remaining section on floor
        const remainingSections = newSectionIdsByFloorId[floorId] ?? [];
        const newActiveSectionId = s.editor.activeSectionId === sectionId
          ? (remainingSections[0] ?? null)
          : s.editor.activeSectionId;

        return {
          layout: {
            ...s.layout,
            sectionsById: newSectionsById,
            sectionIdsByFloorId: newSectionIdsByFloorId,
            resourcesById: newResourcesById,
            resourceIdsBySectionId: newResourceIdsBySectionId,
          },
          editor: {
            ...s.editor,
            activeSectionId: newActiveSectionId,
            selectedResourceIds: s.editor.selectedResourceIds.filter((id) => !resourcesToDelete.has(id)),
          },
          isDirty: true,
        };
      });
    },

    deleteFloor: (floorId) => {
      const state = get();
      const floor = state.layout.floorsById[floorId] as { name: string } | undefined;

      if (!floor) return;

      // Don't allow deleting the last floor
      if (state.layout.floorIds.length <= 1) return;

      // Get counts for label
      const sectionIds = state.layout.sectionIdsByFloorId[floorId] ?? [];
      const sectionCount = sectionIds.length;
      let resourceCount = 0;
      for (const sectionId of sectionIds) {
        resourceCount += (state.layout.resourceIdsBySectionId[sectionId] ?? []).length;
      }

      let label = `Delete floor "${floor.name}"`;
      const details: string[] = [];
      if (sectionCount > 0) details.push(`${String(sectionCount)} section${sectionCount > 1 ? 's' : ''}`);
      if (resourceCount > 0) details.push(`${String(resourceCount)} table${resourceCount > 1 ? 's' : ''}`);
      if (details.length > 0) label += ` (${details.join(', ')})`;

      get().pushUndoCheckpoint(label);

      set((s) => {
        // Collect all sections and resources to delete
        const sectionsToDelete = new Set(s.layout.sectionIdsByFloorId[floorId] ?? []);
        const resourcesToDelete = new Set<string>();
        for (const sectionId of sectionsToDelete) {
          for (const resourceId of (s.layout.resourceIdsBySectionId[sectionId] ?? [])) {
            resourcesToDelete.add(resourceId);
          }
        }

        // Remove resources
        const newResourcesById = Object.fromEntries(
          Object.entries(s.layout.resourcesById).filter(([id]) => !resourcesToDelete.has(id)),
        );

        // Remove sections
        const newSectionsById = Object.fromEntries(
          Object.entries(s.layout.sectionsById).filter(([id]) => !sectionsToDelete.has(id)),
        );

        // Remove floor
        const { [floorId]: _removedFloor, ...newFloorsById } = s.layout.floorsById;
        const newFloorIds = s.layout.floorIds.filter((id) => id !== floorId);

        // Remove floor's section list
        const { [floorId]: _removedSections, ...newSectionIdsByFloorId } = s.layout.sectionIdsByFloorId;

        // Remove all deleted sections' resource lists
        const newResourceIdsBySectionId = Object.fromEntries(
          Object.entries(s.layout.resourceIdsBySectionId).filter(([id]) => !sectionsToDelete.has(id)),
        );

        // If active floor was deleted, switch to first remaining floor
        const newActiveFloorId = s.editor.activeFloorId === floorId
          ? (newFloorIds[0] ?? null)
          : s.editor.activeFloorId;

        // Update active section if floor changed
        let newActiveSectionId = s.editor.activeSectionId;
        if (newActiveFloorId !== s.editor.activeFloorId) {
          const firstSectionIds = newActiveFloorId ? (newSectionIdsByFloorId[newActiveFloorId] ?? []) : [];
          newActiveSectionId = firstSectionIds[0] ?? null;
        } else if (sectionsToDelete.has(s.editor.activeSectionId ?? '')) {
          newActiveSectionId = null;
        }

        return {
          layout: {
            ...s.layout,
            floorsById: newFloorsById,
            floorIds: newFloorIds,
            sectionsById: newSectionsById,
            sectionIdsByFloorId: newSectionIdsByFloorId,
            resourcesById: newResourcesById,
            resourceIdsBySectionId: newResourceIdsBySectionId,
          },
          editor: {
            ...s.editor,
            activeFloorId: newActiveFloorId,
            activeSectionId: newActiveSectionId,
            selectedResourceIds: s.editor.selectedResourceIds.filter((id) => !resourcesToDelete.has(id)),
          },
          isDirty: true,
        };
      });
    },

    resetToDefaultLayout: () => {
      const initial = createInitialLayout();
      set({
        layout: initial.layout,
        editor: initial.editor,
        isDirty: false,
        originalLayoutId: null,
        serverEntityIds: new Set<string>(),
        temporaryMerges: [],
        undoStack: [],
        redoStack: [],
      });
    },

    rotateResources: (ids, degrees) => {
      const count = ids.length;
      get().pushUndoCheckpoint(`Rotate ${String(count)} table${count > 1 ? 's' : ''}`);
      set((s) => {
        const newResourcesById = { ...s.layout.resourcesById };

        for (const id of ids) {
          const resource = newResourcesById[id];
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!resource) continue;

          // Normalize rotation to 0-360
          const newRotation = (resource.rotation + degrees) % 360;
          newResourcesById[id] = { ...resource, rotation: newRotation };
        }

        return {
          layout: { ...s.layout, resourcesById: newResourcesById },
          isDirty: true,
        };
      });
    },

    setInteractionMode: (mode) => {
      set({ interactionMode: mode });
    },

    toLayout: (): UpsertSeatingLayoutRequest => {
      const { layout, serverEntityIds } = get();

      // Helper to strip MongoDB fields (_id, __v) and optionally strip id for new entities
      // Returns either T (with id) or Omit<T, 'id'> (without id)
      const cleanEntity = <T extends { id: string }>(entity: T, isNew: boolean): T | Omit<T, 'id'> => {
        // Create a shallow copy to avoid mutating state
        // We use 'any' here because we need to delete dynamic MongoDB fields that don't exist on the type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const cleaned = { ...entity } as any;

        // Remove MongoDB internal fields that may have leaked from API response
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete cleaned['_id'];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete cleaned['__v'];

        // Strip id if entity is new (not from server)
        if (isNew) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          delete cleaned['id'];
        }

        return cleaned as T | Omit<T, 'id'>;
      };

      // Convert normalized state back to SeatingLayout API format
      const floors = layout.floorIds
        .map((id) => layout.floorsById[id])
        .filter(Boolean)
        .map((floor) => cleanEntity(floor, !serverEntityIds.has(floor.id)));

      const sections = Object.values(layout.sectionsById).map((section) =>
        cleanEntity(section, !serverEntityIds.has(section.id)),
      );

      const resources = Object.values(layout.resourcesById).map((resource) =>
        cleanEntity(resource, !serverEntityIds.has(resource.id)),
      );

      return {
        id: layout.id,
        name: layout.name,
        floors,
        sections,
        resources,
      } as UpsertSeatingLayoutRequest;
    },

    getNextTableNumber: () => {
      const { layout } = get();
      // Count existing tables and return next number
      const existingNames = Object.values(layout.resourcesById).map((r) => r.name);
      let num = 1;
      while (existingNames.includes(`Table ${String(num)}`)) {
        num++;
      }
      return num;
    },

    pushUndoCheckpoint: (label) => {
      set((s) => {
        const snapshot = { layout: cloneLayoutState(s.layout), label };
        const newUndoStack = [...s.undoStack, snapshot];
        // Limit stack size
        if (newUndoStack.length > MAX_UNDO_STACK_SIZE) {
          newUndoStack.shift();
        }
        return {
          undoStack: newUndoStack,
          redoStack: [], // Clear redo stack on new mutation
        };
      });
    },

    undo: () => {
      const { undoStack, layout } = get();
      if (undoStack.length === 0) return null;

      const snapshot = undoStack[undoStack.length - 1];
      const newUndoStack = undoStack.slice(0, -1);

      // Push current state to redo stack
      const redoSnapshot = { layout: cloneLayoutState(layout), label: snapshot.label };
      const newRedoStack = [redoSnapshot, ...get().redoStack];
      if (newRedoStack.length > MAX_REDO_STACK_SIZE) {
        newRedoStack.pop();
      }

      set({
        layout: snapshot.layout,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        isDirty: true,
      });

      return snapshot.label;
    },

    redo: () => {
      const { redoStack, layout } = get();
      if (redoStack.length === 0) return null;

      const snapshot = redoStack[0];
      const newRedoStack = redoStack.slice(1);

      // Push current state to undo stack
      const undoSnapshot = { layout: cloneLayoutState(layout), label: snapshot.label };
      const newUndoStack = [...get().undoStack, undoSnapshot];
      if (newUndoStack.length > MAX_UNDO_STACK_SIZE) {
        newUndoStack.shift();
      }

      set({
        layout: snapshot.layout,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        isDirty: true,
      });

      return snapshot.label;
    },

    clearHistory: () => {
      set({ undoStack: [], redoStack: [] });
    },

    findAvailablePosition: (sectionId, gridSize = 100) => {
      const { layout } = get();
      const resourceIds = layout.resourceIdsBySectionId[sectionId] ?? [];

      // Get all occupied positions (snapped to grid)
      const occupiedPositions = new Set<string>();
      for (const id of resourceIds) {
        const resource = layout.resourcesById[id];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (resource) {
          const gridX = Math.round(resource.centerX / gridSize) * gridSize;
          const gridY = Math.round(resource.centerY / gridSize) * gridSize;
          occupiedPositions.add(`${String(gridX)},${String(gridY)}`);
        }
      }

      // Search for first available position in a spiral pattern from center
      const startX = 200;
      const startY = 200;
      const maxSearchRadius = 10;

      for (let radius = 0; radius < maxSearchRadius; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            // Only check border cells of this radius (skip inner cells already checked)
            if (radius > 0 && Math.abs(dx) < radius && Math.abs(dy) < radius) continue;

            const x = startX + dx * gridSize;
            const y = startY + dy * gridSize;
            const key = `${String(x)},${String(y)}`;

            if (!occupiedPositions.has(key) && x > 0 && y > 0) {
              return { x, y };
            }
          }
        }
      }

      // Fallback: return a position offset from existing tables
      return { x: startX + resourceIds.length * gridSize, y: startY };
    },
  };
});

// ---------- Selector Hooks ----------

// Primitive selectors - no memoization needed
export const useActiveFloorId = () => useSeatingBuilderStore((s) => s.editor.activeFloorId);
export const useActiveSectionId = () => useSeatingBuilderStore((s) => s.editor.activeSectionId);
export const useSelectedResourceIds = () => useSeatingBuilderStore((s) => s.editor.selectedResourceIds);
export const useIsDirty = () => useSeatingBuilderStore((s) => s.isDirty);
export const useInteractionMode = () => useSeatingBuilderStore((s) => s.interactionMode);
export const useTemporaryMerges = () => useSeatingBuilderStore((s) => s.temporaryMerges);
export const useCanUndo = () => useSeatingBuilderStore((s) => s.undoStack.length > 0);
export const useCanRedo = () => useSeatingBuilderStore((s) => s.redoStack.length > 0);

// Array selectors - these now return stable arrays from Zustand state
export const useFloors = () =>
  useSeatingBuilderStore((s) => {
    const { floorIds, floorsById } = s.layout;
    // floorIds and floorsById are stable references, only change when mutated
    return floorIds.map((id) => floorsById[id]).filter(Boolean);
  });

export const useSections = (floorId: string | null) =>
  useSeatingBuilderStore((s) => {
    if (!floorId) return [];
    const sectionIds = s.layout.sectionIdsByFloorId[floorId] ?? [];
    return sectionIds.map((id) => s.layout.sectionsById[id]).filter(Boolean);
  });

export const useResourceRenderModels = (sectionId: string | null): SeatingResourceRenderModel[] =>
  useSeatingBuilderStore((s) => {
    if (!sectionId) return [];
    const resourceIds = s.layout.resourceIdsBySectionId[sectionId] ?? [];
    const selectedSet = new Set(s.editor.selectedResourceIds);

    return resourceIds
      .map((id) => {
        const resource = s.layout.resourcesById[id];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!resource) return null;

        return {
          id: resource.id,
          name: resource.name,
          sectionId: resource.sectionId,
          capacity: resource.capacity,
          shape: resource.shape,
          shapeDimX: resource.shapeDimX,
          shapeDimY: resource.shapeDimY,
          disabled: resource.disabled,
          centerX: resource.centerX,
          centerY: resource.centerY,
          rotation: resource.rotation,
          isSelected: selectedSet.has(id),
          isActiveSection: true,
        };
      })
      .filter(Boolean) as SeatingResourceRenderModel[];
  });
