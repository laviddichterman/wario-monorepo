/**
 * SectionTabs - Section selector tabs within a floor.
 *
 * Features:
 * - Add section via dialog
 * - Delete section with confirmation (cascade deletes tables)
 */

import { memo, useCallback, useMemo, useRef, useState } from 'react';

import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

import { toast } from '@/components/snackbar';

import { useActiveFloor, useActiveSectionIndex, useSeatingBuilderStore } from '@/stores/useSeatingBuilderStore';

import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { NamePopover } from './components/NamePopover';

export const SectionTabs = memo(function SectionTabs() {
  const activeFloor = useActiveFloor();
  const activeSectionIndex = useActiveSectionIndex();

  // Get sections from the active floor - memoized to stabilize useCallback dependencies
  const sections = useMemo(() => activeFloor?.sections ?? [], [activeFloor?.sections]);

  const setActiveSection = useSeatingBuilderStore((s) => s.setActiveSection);
  const addSection = useSeatingBuilderStore((s) => s.addSection);
  const deleteSection = useSeatingBuilderStore((s) => s.deleteSection);
  const renameSection = useSeatingBuilderStore((s) => s.renameSection);

  const [addAnchorEl, setAddAnchorEl] = useState<HTMLElement | null>(null);
  const [deleteDialogSectionIndex, setDeleteDialogSectionIndex] = useState<number | null>(null);
  const [renameAnchor, setRenameAnchor] = useState<{ el: HTMLElement; index: number } | null>(null);
  const sectionSelectorRef = useRef<HTMLDivElement>(null);
  const [renameDropdownOpen, setRenameDropdownOpen] = useState(false);

  // Threshold for switching to dropdown
  const useDropdown = sections.length > 5;

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
    (name: string) => {
      addSection(name);
      toast.success(`Added section "${name}"`);
    },
    [addSection],
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

  const handleRenameSection = useCallback(
    (newName: string) => {
      // Handle chip mode (double-click)
      if (renameAnchor !== null) {
        renameSection(renameAnchor.index, newName);
        toast.success(`Renamed section to "${newName}"`);
        setRenameAnchor(null);
        return;
      }
      // Handle dropdown mode (edit button)
      if (renameDropdownOpen) {
        renameSection(activeSectionIndex, newName);
        toast.success(`Renamed section to "${newName}"`);
        setRenameDropdownOpen(false);
      }
    },
    [renameAnchor, renameDropdownOpen, activeSectionIndex, renameSection],
  );

  // Compute which section is being renamed for popup
  const sectionToRename =
    renameAnchor !== null ? sections[renameAnchor.index] : renameDropdownOpen ? sections[activeSectionIndex] : null;

  // Compute popover anchor element based on mode
  const popoverAnchorEl = renameAnchor?.el ?? (renameDropdownOpen ? sectionSelectorRef.current : null);

  if (!activeFloor) {
    return null;
  }

  return (
    <>
      {useDropdown ? (
        // Dropdown mode for many sections
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box ref={sectionSelectorRef}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="section-select-label">Section</InputLabel>
              <Select
                labelId="section-select-label"
                value={String(activeSectionIndex)}
                label="Section"
                onChange={(e: SelectChangeEvent) => {
                  const value = e.target.value;
                  if (value === '__add__') {
                    setAddAnchorEl(sectionSelectorRef.current);
                  } else {
                    setActiveSection(Number(value));
                  }
                }}
              >
                {sections.map((section, index) => (
                  <MenuItem key={section.id} value={String(index)} disabled={section.disabled}>
                    {section.name}
                  </MenuItem>
                ))}
                <Divider />
                <MenuItem value="__add__">
                  <Add sx={{ mr: 1, fontSize: 20 }} />
                  Add Section...
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Rename Section Button */}
          <Tooltip title="Rename current section">
            <IconButton
              size="small"
              onClick={() => {
                setRenameDropdownOpen(true);
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Delete Section Button */}
          <Tooltip title={canDeleteSection ? 'Delete current section' : 'Cannot delete the only section'}>
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  setDeleteDialogSectionIndex(activeSectionIndex);
                }}
                disabled={!canDeleteSection}
              >
                <Delete fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ) : (
        // Chip mode for few sections
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ py: 1 }}>
          {sections.map((section, index) => {
            const isActive = index === activeSectionIndex;

            return (
              <Tooltip key={section.id} title="Double-click to rename" enterDelay={1000}>
                <Chip
                  label={section.name}
                  variant={isActive ? 'filled' : 'outlined'}
                  color={isActive ? 'primary' : 'default'}
                  onClick={() => {
                    handleSectionClick(index);
                  }}
                  onDoubleClick={(e) => {
                    setRenameAnchor({ el: e.currentTarget, index });
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
          <IconButton
            size="small"
            onClick={(e) => {
              setAddAnchorEl(e.currentTarget);
            }}
          >
            <Add fontSize="small" />
          </IconButton>
        </Stack>
      )}

      {/* Add Section Popover */}
      <NamePopover
        anchorEl={addAnchorEl}
        onClose={() => {
          setAddAnchorEl(null);
        }}
        onConfirm={handleAddSection}
        label="Add Section"
        placeholder="e.g., Dining Room, Bar Area"
      />

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

      {/* Rename Section Popover */}
      <NamePopover
        anchorEl={popoverAnchorEl}
        onClose={() => {
          setRenameAnchor(null);
          setRenameDropdownOpen(false);
        }}
        onConfirm={handleRenameSection}
        currentName={sectionToRename?.name ?? ''}
        label="Rename Section"
      />
    </>
  );
});
