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

import { useActiveFloor, useActiveSectionIndex, useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

export const SectionTabs = memo(function SectionTabs() {
  const activeFloor = useActiveFloor();
  const activeSectionIndex = useActiveSectionIndex();

  // Get sections from the active floor - memoized to stabilize useCallback dependencies
  const sections = useMemo(() => activeFloor?.sections ?? [], [activeFloor?.sections]);

  const setActiveSection = useSeatingBuilderStore((s) => s.setActiveSection);
  const addSection = useSeatingBuilderStore((s) => s.addSection);
  const deleteSection = useSeatingBuilderStore((s) => s.deleteSection);

  const addDialog = useBoolean();
  const [deleteDialogSectionIndex, setDeleteDialogSectionIndex] = useState<number | null>(null);

  // Get section info for delete dialog
  const sectionToDelete = deleteDialogSectionIndex !== null ? sections[deleteDialogSectionIndex] : null;
  const tableCountToDelete = sectionToDelete?.resources.length ?? 0;

  const canDeleteSection = sections.length > 1;

  const handleSectionClick = useCallback(
    (sectionIndex: number) => {
      setActiveSection(sectionIndex);
    },
    [setActiveSection],
  );

  const handleAddSection = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!activeFloor) return;

      const formData = new FormData(e.currentTarget);
      const name = formData.get('sectionName') as string;
      if (name.trim()) {
        addSection(name.trim());
        addDialog.onFalse();
      }
    },
    [activeFloor, addSection, addDialog],
  );

  const handleDeleteSection = useCallback(
    (sectionIndex: number) => {
      const section = sections[sectionIndex];
      const sectionName = section.name;
      deleteSection(sectionIndex);
      setDeleteDialogSectionIndex(null);
      toast.success(`Deleted section "${sectionName}"`);
    },
    [deleteSection, sections],
  );

  if (!activeFloor) {
    return null;
  }

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ py: 1 }}>
        {sections.map((section, index) => {
          const isActive = index === activeSectionIndex;

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
                  handleSectionClick(index);
                }}
                onDelete={
                  canDeleteSection
                    ? () => {
                        setDeleteDialogSectionIndex(index);
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
        open={deleteDialogSectionIndex !== null}
        onClose={() => {
          setDeleteDialogSectionIndex(null);
        }}
        onConfirm={() => {
          if (deleteDialogSectionIndex !== null) {
            handleDeleteSection(deleteDialogSectionIndex);
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
