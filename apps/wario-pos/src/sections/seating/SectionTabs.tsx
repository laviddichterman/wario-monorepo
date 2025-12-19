/**
 * SectionTabs - Section selector tabs within a floor.
 */

import { memo, useCallback, useMemo } from 'react';

import Add from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { AppDialog } from '@wcp/wario-ux-shared/containers';

import { useBoolean } from '@/hooks/useBoolean';

import { useActiveFloorId, useActiveSectionId, useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

export const SectionTabs = memo(function SectionTabs() {
  const activeFloorId = useActiveFloorId();
  const activeSectionId = useActiveSectionId();

  // Select raw data (stable references) instead of derived arrays
  const sectionIdsByFloorId = useSeatingBuilderStore((s) => s.layout.sectionIdsByFloorId);
  const sectionsById = useSeatingBuilderStore((s) => s.layout.sectionsById);

  // Memoize derived sections array to prevent infinite re-renders
  const sections = useMemo(() => {
    if (!activeFloorId) return [];
    const sectionIds = sectionIdsByFloorId[activeFloorId] ?? [];
    return sectionIds.map((id) => sectionsById[id]).filter(Boolean);
  }, [activeFloorId, sectionIdsByFloorId, sectionsById]);

  const setActiveSection = useSeatingBuilderStore((s) => s.setActiveSection);
  const addSection = useSeatingBuilderStore((s) => s.addSection);

  const addDialog = useBoolean();

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

  if (!activeFloorId) {
    return null;
  }

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ py: 1 }}>
        {sections.map((section) => (
          <Chip
            key={section.id}
            label={section.name}
            variant={section.id === activeSectionId ? 'filled' : 'outlined'}
            color={section.id === activeSectionId ? 'primary' : 'default'}
            onClick={() => {
              handleSectionClick(section.id);
            }}
            disabled={section.disabled}
            sx={{ fontWeight: section.id === activeSectionId ? 600 : 400 }}
          />
        ))}

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
    </>
  );
});
