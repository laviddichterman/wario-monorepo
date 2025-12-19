/**
 * SectionTabs - Section selector tabs within a floor.
 *
 * Features:
 * - Add section via dialog
 * - Delete section with confirmation (cascade deletes tables)
 */

import { memo, useCallback, useMemo, useState } from 'react';

import Add from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';

import { AppDialog } from '@wcp/wario-ux-shared/containers';

import { useBoolean } from '@/hooks/useBoolean';

import { toast } from '@/components/snackbar';

import { useActiveFloorId, useActiveSectionId, useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

export const SectionTabs = memo(function SectionTabs() {
  const activeFloorId = useActiveFloorId();
  const activeSectionId = useActiveSectionId();

  // Select raw data (stable references) instead of derived arrays
  const sectionIdsByFloorId = useSeatingBuilderStore((s) => s.layout.sectionIdsByFloorId);
  const sectionsById = useSeatingBuilderStore((s) => s.layout.sectionsById);
  const resourceIdsBySectionId = useSeatingBuilderStore((s) => s.layout.resourceIdsBySectionId);

  // Memoize derived sections array to prevent infinite re-renders
  const sections = useMemo(() => {
    if (!activeFloorId) return [];
    const sectionIds = sectionIdsByFloorId[activeFloorId] ?? [];
    return sectionIds.map((id) => sectionsById[id]).filter(Boolean);
  }, [activeFloorId, sectionIdsByFloorId, sectionsById]);

  const setActiveSection = useSeatingBuilderStore((s) => s.setActiveSection);
  const addSection = useSeatingBuilderStore((s) => s.addSection);
  const deleteSection = useSeatingBuilderStore((s) => s.deleteSection);

  const addDialog = useBoolean();
  const [deleteDialogSectionId, setDeleteDialogSectionId] = useState<string | null>(null);

  // Get section info for delete dialog
  const sectionToDelete = deleteDialogSectionId ? sectionsById[deleteDialogSectionId] : null;
  const tableCountToDelete = deleteDialogSectionId ? (resourceIdsBySectionId[deleteDialogSectionId] ?? []).length : 0;

  const canDeleteSection = sections.length > 1;

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      setActiveSection(sectionId);
    },
    [setActiveSection],
  );

  const handleAddSection = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!activeFloorId) return;

      const formData = new FormData(e.currentTarget);
      const name = formData.get('sectionName') as string;
      if (name.trim()) {
        addSection(activeFloorId, name.trim());
        addDialog.onFalse();
      }
    },
    [activeFloorId, addSection, addDialog],
  );

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      const section = sectionsById[sectionId] as { name: string } | undefined;
      deleteSection(sectionId);
      setDeleteDialogSectionId(null);

      if (section) {
        toast.success(`Deleted section "${section.name}"`);
      }
    },
    [deleteSection, sectionsById],
  );

  if (!activeFloorId) {
    return null;
  }

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ py: 1 }}>
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;

          return (
            <Tooltip
              key={section.id}
              title={canDeleteSection ? 'Right-click to delete' : 'Cannot delete the only section'}
              enterDelay={1000}
            >
              <Chip
                label={section.name}
                variant={isActive ? 'filled' : 'outlined'}
                color={isActive ? 'primary' : 'default'}
                onClick={() => {
                  handleSectionClick(section.id);
                }}
                onDelete={
                  canDeleteSection
                    ? () => {
                        setDeleteDialogSectionId(section.id);
                      }
                    : undefined
                }
                disabled={section.disabled}
                sx={{
                  fontWeight: isActive ? 600 : 400,
                  '& .MuiChip-deleteIcon': {
                    opacity: 0.5,
                    '&:hover': { opacity: 1 },
                  },
                }}
              />
            </Tooltip>
          );
        })}

        <Button size="small" variant="text" startIcon={<Add />} onClick={addDialog.onTrue}>
          Section
        </Button>
      </Stack>

      {/* Add Section Dialog */}
      <AppDialog.Root open={addDialog.value} onClose={addDialog.onFalse} maxWidth="xs" fullWidth>
        <form onSubmit={handleAddSection}>
          <AppDialog.Header onClose={addDialog.onFalse} title="Add Section" />
          <AppDialog.Content>
            <TextField
              autoFocus
              name="sectionName"
              label="Section Name"
              placeholder="e.g., Dining Room, Bar Area, Patio"
              fullWidth
              required
            />
          </AppDialog.Content>
          <AppDialog.Actions>
            <Button onClick={addDialog.onFalse}>Cancel</Button>
            <Button type="submit" variant="contained">
              Add
            </Button>
          </AppDialog.Actions>
        </form>
      </AppDialog.Root>

      {/* Delete Section Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogSectionId !== null}
        onClose={() => {
          setDeleteDialogSectionId(null);
        }}
        onConfirm={() => {
          if (deleteDialogSectionId) {
            handleDeleteSection(deleteDialogSectionId);
          }
        }}
        title="Delete Section"
        entityName={sectionToDelete?.name ?? 'Section'}
        warningItems={
          tableCountToDelete > 0
            ? [`${String(tableCountToDelete)} table${tableCountToDelete > 1 ? 's' : ''}`]
            : undefined
        }
      />
    </>
  );
});
