/**
 * NamePopover - Compact popover for naming floors, sections, and layouts.
 * Used for both adding new items and renaming existing ones.
 * Less disruptive than a full dialog.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';

import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

export interface NamePopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onConfirm: (name: string) => void;
  /** For rename: pre-fill with current name. For add: leave empty or undefined */
  currentName?: string;
  label?: string;
  placeholder?: string;
}

export const NamePopover = memo(function NamePopover({
  anchorEl,
  onClose,
  onConfirm,
  currentName = '',
  label = 'Name',
  placeholder,
}: NamePopoverProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset name when popover opens
  useEffect(() => {
    if (anchorEl) {
      setName(currentName);
      // Focus input after popover opens
      setTimeout(() => {
        inputRef.current?.focus();
        if (currentName) {
          inputRef.current?.select();
        }
      }, 50);
    }
  }, [anchorEl, currentName]);

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    // For add: just need non-empty. For rename: need different from current
    if (trimmed && (currentName === '' || trimmed !== currentName)) {
      onConfirm(trimmed);
    }
    onClose();
  }, [name, currentName, onConfirm, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [handleSubmit, onClose],
  );

  const isValid = name.trim().length > 0;

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          sx: { p: 1, minWidth: 200 },
        },
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center">
        <TextField
          inputRef={inputRef}
          size="small"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          label={label}
          placeholder={placeholder}
          variant="outlined"
          sx={{ minWidth: 160 }}
        />
        <IconButton size="small" color="primary" onClick={handleSubmit} disabled={!isValid}>
          <Check fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </Stack>
    </Popover>
  );
});
