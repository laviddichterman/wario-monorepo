/**
 * Zustand store for Seating Builder state management.
 *
 * DESIGN: Uses nested FullSeatingLayout structure directly, matching the API response.
 * Type discrimination handles create vs update:
 * - Entities WITHOUT id = Create (new entity, server assigns id)
 * - Entities WITH id = Update (existing entity from server)
 *
 * Local keys (prefixed 'local-') are used for React keying of new entities.
 */

import { create } from 'zustand';

import {
  type FullSeatingFloor,
  type FullSeatingLayout,
  type FullSeatingSection,
  type SeatingResource,
  type SeatingShape,
  type UpsertSeatingLayoutRequest,
} from '@wcp/wario-shared/types';

// ---------- Local Key Generator ----------
// Used for React keys on new entities before they get server IDs
let localKeyCounter = 0;
const generateLocalKey = (): string => `local-${String(++localKeyCounter)}`;

// Check if an id is a local key (not from server)
const isLocalKey = (id: string): boolean => id.startsWith('local-');

// ---------- Undo/Redo Constants ----------
const MAX_UNDO_STACK_SIZE = 50;
const MAX_REDO_STACK_SIZE = 50;

// Deep clone layout for undo/redo snapshots
const cloneLayout = (layout: FullSeatingLayout): FullSeatingLayout =>
  JSON.parse(JSON.stringify(layout)) as FullSeatingLayout;

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

interface EditorState {
  activeFloorIndex: number;
  activeSectionIndex: number;
  selectedResourceIds: string[];
  gridSize: number;
  snapToGrid: boolean;
}

interface UndoRedoSnapshot {
  layout: FullSeatingLayout;
  label: string;
}

export interface SeatingBuilderState {
  // The layout data - nested structure matching API
  layout: FullSeatingLayout;

  // Editor UI state
  editor: EditorState;

  // Tracking
  isDirty: boolean;
  originalLayoutId: string | null;
  interactionMode: 'SELECT' | 'PAN' | 'ADD_TABLE';

  // Undo/Redo
  undoStack: UndoRedoSnapshot[];
  redoStack: UndoRedoSnapshot[];

  // Actions
  loadLayout: (layout: FullSeatingLayout) => void;
  createEmptyLayout: (name?: string) => void;
  markClean: () => void;
  setActiveFloor: (floorIndex: number) => void;
  setActiveSection: (sectionIndex: number) => void;
  selectResources: (ids: string[]) => void;
  clearSelection: () => void;
  moveResources: (ids: string[], dx: number, dy: number) => void;
  addFloor: (name: string) => void;
  addSection: (name: string) => void;
  addResource: (params: AddResourceParams) => void;
  updateResource: (id: string, updates: UpdateResourceParams) => void;
  deleteResources: (ids: string[]) => void;
  deleteFloor: (floorIndex: number) => void;
  deleteSection: (sectionIndex: number) => void;
  rotateResources: (ids: string[], degrees: number) => void;
  copyResources: (ids: string[]) => void;
  renameLayout: (newName: string) => void;
  renameFloor: (floorIndex: number, newName: string) => void;
  renameSection: (sectionIndex: number, newName: string) => void;
  setInteractionMode: (mode: 'SELECT' | 'PAN' | 'ADD_TABLE') => void;
  resetToDefaultLayout: () => void;
  toLayout: () => UpsertSeatingLayoutRequest;
  pushUndoCheckpoint: (label: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  clearHistory: () => void;
  getNextTableNumber: () => number;
  findAvailablePosition: (gridSize?: number) => { x: number; y: number };
}

// ---------- Helper Functions ----------

// Find a resource by ID across all floors/sections
const findResource = (
  layout: FullSeatingLayout,
  id: string,
): {
  floor: FullSeatingFloor;
  section: FullSeatingSection;
  resource: SeatingResource;
  resourceIndex: number;
} | null => {
  for (const floor of layout.floors) {
    for (const section of floor.sections) {
      const resourceIndex = section.resources.findIndex((r) => r.id === id);
      if (resourceIndex !== -1) {
        return { floor, section, resource: section.resources[resourceIndex], resourceIndex };
      }
    }
  }
  return null;
};

// Create default empty layout
const createDefaultLayout = (name = 'Default'): FullSeatingLayout => ({
  id: generateLocalKey(),
  name,
  floors: [
    {
      id: generateLocalKey(),
      name: 'Main',
      disabled: false,
      sections: [
        {
          id: generateLocalKey(),
          name: 'Main',
          disabled: false,
          resources: [],
        },
      ],
    },
  ],
});

// ---------- Zustand Store ----------

export const useSeatingBuilderStore = create<SeatingBuilderState>()((set, get) => {
  const defaultLayout = createDefaultLayout();

  return {
    layout: defaultLayout,
    editor: {
      activeFloorIndex: 0,
      activeSectionIndex: 0,
      selectedResourceIds: [],
      gridSize: 10,
      snapToGrid: true,
    },
    isDirty: false,
    originalLayoutId: null,
    interactionMode: 'SELECT',
    undoStack: [],
    redoStack: [],

    loadLayout: (apiLayout) => {
      set({
        layout: apiLayout,
        editor: {
          activeFloorIndex: 0,
          activeSectionIndex: 0,
          selectedResourceIds: [],
          gridSize: 10,
          snapToGrid: true,
        },
        isDirty: false,
        originalLayoutId: apiLayout.id,
        undoStack: [],
        redoStack: [],
      });
    },

    createEmptyLayout: (name = 'New Layout') => {
      set({
        layout: createDefaultLayout(name),
        editor: {
          activeFloorIndex: 0,
          activeSectionIndex: 0,
          selectedResourceIds: [],
          gridSize: 10,
          snapToGrid: true,
        },
        isDirty: true,
        originalLayoutId: null,
        undoStack: [],
        redoStack: [],
      });
    },

    markClean: () => {
      set({ isDirty: false });
    },

    setActiveFloor: (floorIndex) => {
      const { layout } = get();
      if (floorIndex >= 0 && floorIndex < layout.floors.length) {
        set({
          editor: {
            ...get().editor,
            activeFloorIndex: floorIndex,
            activeSectionIndex: 0,
            selectedResourceIds: [],
          },
        });
      }
    },

    setActiveSection: (sectionIndex) => {
      const { layout, editor } = get();
      const floor = layout.floors[editor.activeFloorIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (floor && sectionIndex >= 0 && sectionIndex < floor.sections.length) {
        set({
          editor: {
            ...editor,
            activeSectionIndex: sectionIndex,
            selectedResourceIds: [],
          },
        });
      }
    },

    selectResources: (ids) => {
      set({ editor: { ...get().editor, selectedResourceIds: ids } });
    },

    clearSelection: () => {
      set({ editor: { ...get().editor, selectedResourceIds: [] } });
    },

    moveResources: (ids, dx, dy) => {
      if (ids.length === 0) return;
      get().pushUndoCheckpoint(`Move ${String(ids.length)} table(s)`);

      set((s) => {
        const layout = cloneLayout(s.layout);
        const idSet = new Set(ids);

        for (const floor of layout.floors) {
          for (const section of floor.sections) {
            for (const resource of section.resources) {
              if (idSet.has(resource.id)) {
                resource.centerX = Math.max(0, resource.centerX + dx);
                resource.centerY = Math.max(0, resource.centerY + dy);
              }
            }
          }
        }

        return { layout, isDirty: true };
      });
    },

    addFloor: (name) => {
      get().pushUndoCheckpoint(`Add floor "${name}"`);

      set((s) => {
        const layout = cloneLayout(s.layout);
        layout.floors.push({
          id: generateLocalKey(),
          name,
          disabled: false,
          sections: [
            {
              id: generateLocalKey(),
              name: 'Main',
              disabled: false,
              resources: [],
            },
          ],
        });

        return {
          layout,
          editor: {
            ...s.editor,
            activeFloorIndex: layout.floors.length - 1,
            activeSectionIndex: 0,
          },
          isDirty: true,
        };
      });
    },

    addSection: (name) => {
      get().pushUndoCheckpoint(`Add section "${name}"`);

      set((s) => {
        const layout = cloneLayout(s.layout);
        const floor = layout.floors[s.editor.activeFloorIndex];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!floor) return s;

        floor.sections.push({
          id: generateLocalKey(),
          name,
          disabled: false,
          resources: [],
        });

        return {
          layout,
          editor: {
            ...s.editor,
            activeSectionIndex: floor.sections.length - 1,
          },
          isDirty: true,
        };
      });
    },

    addResource: (params) => {
      get().pushUndoCheckpoint(`Add ${params.name}`);

      set((s) => {
        const layout = cloneLayout(s.layout);
        const floor = layout.floors[s.editor.activeFloorIndex];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!floor) return s;
        const section = floor.sections[s.editor.activeSectionIndex];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!section) return s;

        const resource: SeatingResource = {
          id: generateLocalKey(),
          name: params.name,
          capacity: params.capacity,
          shape: params.shape,
          shapeDimX: params.shapeDimX,
          shapeDimY: params.shapeDimY,
          centerX: params.centerX ?? 200,
          centerY: params.centerY ?? 200,
          rotation: params.rotation ?? 0,
          disabled: false,
        };

        section.resources.push(resource);

        return { layout, isDirty: true };
      });
    },

    updateResource: (id, updates) => {
      get().pushUndoCheckpoint(`Update table`);

      set((s) => {
        const layout = cloneLayout(s.layout);
        const found = findResource(layout, id);
        if (!found) return s;

        Object.assign(found.resource, updates);
        return { layout, isDirty: true };
      });
    },

    deleteResources: (ids) => {
      if (ids.length === 0) return;
      get().pushUndoCheckpoint(`Delete ${String(ids.length)} table(s)`);

      set((s) => {
        const layout = cloneLayout(s.layout);
        const idSet = new Set(ids);

        for (const floor of layout.floors) {
          for (const section of floor.sections) {
            section.resources = section.resources.filter((r) => !idSet.has(r.id));
          }
        }

        return {
          layout,
          editor: { ...s.editor, selectedResourceIds: [] },
          isDirty: true,
        };
      });
    },

    deleteFloor: (floorIndex) => {
      const { layout } = get();
      if (layout.floors.length <= 1) return; // Keep at least one floor

      get().pushUndoCheckpoint(`Delete floor`);

      set((s) => {
        const newLayout = cloneLayout(s.layout);
        newLayout.floors.splice(floorIndex, 1);

        const newFloorIndex = Math.min(s.editor.activeFloorIndex, newLayout.floors.length - 1);

        return {
          layout: newLayout,
          editor: {
            ...s.editor,
            activeFloorIndex: newFloorIndex,
            activeSectionIndex: 0,
            selectedResourceIds: [],
          },
          isDirty: true,
        };
      });
    },

    deleteSection: (sectionIndex) => {
      const { layout, editor } = get();
      const floor = layout.floors[editor.activeFloorIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!floor || floor.sections.length <= 1) return; // Keep at least one section

      get().pushUndoCheckpoint(`Delete section`);

      set((s) => {
        const newLayout = cloneLayout(s.layout);
        const flr = newLayout.floors[s.editor.activeFloorIndex];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!flr) return s;

        flr.sections.splice(sectionIndex, 1);
        const newSectionIndex = Math.min(s.editor.activeSectionIndex, flr.sections.length - 1);

        return {
          layout: newLayout,
          editor: {
            ...s.editor,
            activeSectionIndex: newSectionIndex,
            selectedResourceIds: [],
          },
          isDirty: true,
        };
      });
    },

    rotateResources: (ids, degrees) => {
      if (ids.length === 0) return;
      get().pushUndoCheckpoint(`Rotate ${String(ids.length)} table(s)`);

      set((s) => {
        const layout = cloneLayout(s.layout);
        const idSet = new Set(ids);

        for (const floor of layout.floors) {
          for (const section of floor.sections) {
            for (const resource of section.resources) {
              if (idSet.has(resource.id)) {
                resource.rotation = (resource.rotation + degrees) % 360;
              }
            }
          }
        }

        return { layout, isDirty: true };
      });
    },

    copyResources: (ids) => {
      if (ids.length === 0) return;
      get().pushUndoCheckpoint(`Copy ${String(ids.length)} table(s)`);

      set((s) => {
        const layout = cloneLayout(s.layout);
        const floor = layout.floors[s.editor.activeFloorIndex];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!floor) return s;
        const section = floor.sections[s.editor.activeSectionIndex];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!section) return s;

        const idSet = new Set(ids);
        const newIds: string[] = [];
        const offset = 30; // Offset for copied tables

        // Find resources to copy across all sections
        for (const flr of layout.floors) {
          for (const sect of flr.sections) {
            for (const resource of sect.resources) {
              if (idSet.has(resource.id)) {
                const newResource: SeatingResource = {
                  id: generateLocalKey(),
                  name: `${resource.name} (copy)`,
                  capacity: resource.capacity,
                  shape: resource.shape,
                  shapeDimX: resource.shapeDimX,
                  shapeDimY: resource.shapeDimY,
                  centerX: resource.centerX + offset,
                  centerY: resource.centerY + offset,
                  rotation: resource.rotation,
                  disabled: false,
                };
                // Add copy to the active section
                section.resources.push(newResource);
                newIds.push(newResource.id);
              }
            }
          }
        }

        return {
          layout,
          editor: { ...s.editor, selectedResourceIds: newIds },
          isDirty: true,
        };
      });
    },

    renameLayout: (newName) => {
      const oldName = get().layout.name;
      get().pushUndoCheckpoint(`Rename layout "${oldName}" to "${newName}"`);

      set((s) => {
        const layout = cloneLayout(s.layout);
        layout.name = newName;
        return { layout, isDirty: true };
      });
    },

    renameFloor: (floorIndex, newName) => {
      const floor = get().layout.floors[floorIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!floor) return;

      const oldName = floor.name;
      get().pushUndoCheckpoint(`Rename floor "${oldName}" to "${newName}"`);

      set((s) => {
        const layout = cloneLayout(s.layout);
        const flr = layout.floors[floorIndex];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (flr) {
          flr.name = newName;
        }
        return { layout, isDirty: true };
      });
    },

    renameSection: (sectionIndex, newName) => {
      const { layout, editor } = get();
      const floor = layout.floors[editor.activeFloorIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const section = floor?.sections[sectionIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!section) return;

      const oldName = section.name;
      get().pushUndoCheckpoint(`Rename section "${oldName}" to "${newName}"`);

      set((s) => {
        const newLayout = cloneLayout(s.layout);
        const flr = newLayout.floors[s.editor.activeFloorIndex];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const sect = flr?.sections[sectionIndex];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (sect) {
          sect.name = newName;
        }
        return { layout: newLayout, isDirty: true };
      });
    },

    setInteractionMode: (mode) => {
      set({ interactionMode: mode });
    },

    resetToDefaultLayout: () => {
      set({
        layout: createDefaultLayout(),
        editor: {
          activeFloorIndex: 0,
          activeSectionIndex: 0,
          selectedResourceIds: [],
          gridSize: 10,
          snapToGrid: true,
        },
        isDirty: false,
        originalLayoutId: null,
        undoStack: [],
        redoStack: [],
      });
    },

    toLayout: (): UpsertSeatingLayoutRequest => {
      const { layout } = get();

      // Helper to build object with optional id (only include if not a local key)
      const withOptionalId = <T extends Record<string, unknown>>(id: string, obj: T): T & { id?: string } => {
        if (isLocalKey(id)) {
          return obj; // New entity - no id
        }
        return { ...obj, id }; // Existing entity - include id
      };

      const floors = layout.floors.map((floor) =>
        withOptionalId(floor.id, {
          name: floor.name,
          disabled: floor.disabled,
          sections: floor.sections.map((section) =>
            withOptionalId(section.id, {
              name: section.name,
              disabled: section.disabled,
              resources: section.resources.map((resource) =>
                withOptionalId(resource.id, {
                  name: resource.name,
                  capacity: Math.round(resource.capacity),
                  shape: resource.shape,
                  shapeDimX: Math.round(resource.shapeDimX),
                  shapeDimY: Math.round(resource.shapeDimY),
                  centerX: Math.round(resource.centerX),
                  centerY: Math.round(resource.centerY),
                  rotation: Math.round(resource.rotation),
                  disabled: resource.disabled,
                }),
              ),
            }),
          ),
        }),
      );

      // If layout has a real (non-local) id, this is an update
      if (!isLocalKey(layout.id)) {
        return { id: layout.id, name: layout.name, floors } as UpsertSeatingLayoutRequest;
      }
      return { name: layout.name, floors } as UpsertSeatingLayoutRequest;
    },

    pushUndoCheckpoint: (label) => {
      set((s) => {
        const snapshot = { layout: cloneLayout(s.layout), label };
        const newUndoStack = [...s.undoStack, snapshot];
        if (newUndoStack.length > MAX_UNDO_STACK_SIZE) {
          newUndoStack.shift();
        }
        return { undoStack: newUndoStack, redoStack: [] };
      });
    },

    undo: () => {
      const { undoStack, layout } = get();
      if (undoStack.length === 0) return null;

      const snapshot = undoStack[undoStack.length - 1];
      set((s) => {
        const newRedoStack = [...s.redoStack, { layout: cloneLayout(layout), label: snapshot.label }];
        if (newRedoStack.length > MAX_REDO_STACK_SIZE) {
          newRedoStack.shift();
        }
        return {
          layout: snapshot.layout,
          undoStack: undoStack.slice(0, -1),
          redoStack: newRedoStack,
          isDirty: true,
        };
      });
      return snapshot.label;
    },

    redo: () => {
      const { redoStack, layout } = get();
      if (redoStack.length === 0) return null;

      const snapshot = redoStack[redoStack.length - 1];
      set((s) => {
        const newUndoStack = [...s.undoStack, { layout: cloneLayout(layout), label: snapshot.label }];
        if (newUndoStack.length > MAX_UNDO_STACK_SIZE) {
          newUndoStack.shift();
        }
        return {
          layout: snapshot.layout,
          undoStack: newUndoStack,
          redoStack: redoStack.slice(0, -1),
          isDirty: true,
        };
      });
      return snapshot.label;
    },

    clearHistory: () => {
      set({ undoStack: [], redoStack: [] });
    },

    getNextTableNumber: () => {
      const { layout } = get();
      const existingNames = new Set<string>();
      for (const floor of layout.floors) {
        for (const section of floor.sections) {
          for (const resource of section.resources) {
            existingNames.add(resource.name);
          }
        }
      }
      let num = 1;
      while (existingNames.has(`Table ${String(num)}`)) {
        num++;
      }
      return num;
    },

    findAvailablePosition: (_gridSize = 10) => {
      const { layout, editor } = get();
      const floor = layout.floors[editor.activeFloorIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!floor) return { x: 200, y: 200 };

      // Check ALL sections on the floor to avoid placing on top of tables in other sections
      const occupied = new Set<string>();
      for (const section of floor.sections) {
        for (const resource of section.resources) {
          const gx = Math.floor(resource.centerX / 100);
          const gy = Math.floor(resource.centerY / 100);
          occupied.add(`${String(gx)},${String(gy)}`);
        }
      }

      // Find first unoccupied grid cell
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (!occupied.has(`${String(x)},${String(y)}`)) {
            return { x: x * 100 + 50, y: y * 100 + 50 };
          }
        }
      }

      return { x: 200, y: 200 };
    },
  };
});

// ---------- Convenience Selectors ----------

// Get active floor object
export const useActiveFloor = (): FullSeatingFloor | null =>
  useSeatingBuilderStore((s) => s.layout.floors[s.editor.activeFloorIndex] ?? null);

// Get active section object
export const useActiveSection = () =>
  useSeatingBuilderStore((s) => {
    const floor = s.layout.floors[s.editor.activeFloorIndex];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return floor?.sections[s.editor.activeSectionIndex] ?? null;
  });

// Get active floor index
export const useActiveFloorIndex = () => useSeatingBuilderStore((s) => s.editor.activeFloorIndex);

// Get active section index
export const useActiveSectionIndex = () => useSeatingBuilderStore((s) => s.editor.activeSectionIndex);

// Get selected resource IDs
export const useSelectedResourceIds = () => useSeatingBuilderStore((s) => s.editor.selectedResourceIds);

// Get isDirty
export const useIsDirty = () => useSeatingBuilderStore((s) => s.isDirty);

// Get canUndo/canRedo
export const useCanUndo = () => useSeatingBuilderStore((s) => s.undoStack.length > 0);
export const useCanRedo = () => useSeatingBuilderStore((s) => s.redoStack.length > 0);

// Get all resources as render models
export const useAllResourceRenderModels = (): SeatingResourceRenderModel[] =>
  useSeatingBuilderStore((s) => {
    const { layout, editor } = s;
    const activeFloor = layout.floors[editor.activeFloorIndex];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const activeSectionId = activeFloor?.sections[editor.activeSectionIndex]?.id;
    const selectedSet = new Set(editor.selectedResourceIds);

    const models: SeatingResourceRenderModel[] = [];
    for (const floor of layout.floors) {
      for (const section of floor.sections) {
        for (const resource of section.resources) {
          models.push({
            ...resource,
            sectionId: section.id,
            isSelected: selectedSet.has(resource.id),
            isActiveSection: section.id === activeSectionId,
          });
        }
      }
    }
    return models;
  });

// Get active section's resources as render models
export const useActiveSectionResourceRenderModels = (): SeatingResourceRenderModel[] =>
  useSeatingBuilderStore((s) => {
    const { layout, editor } = s;
    const activeFloor = layout.floors[editor.activeFloorIndex];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const activeSection = activeFloor?.sections[editor.activeSectionIndex];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!activeSection) return [];

    const selectedSet = new Set(editor.selectedResourceIds);
    return activeSection.resources.map((resource) => ({
      ...resource,
      sectionId: activeSection.id,
      isSelected: selectedSet.has(resource.id),
      isActiveSection: true,
    }));
  });
