/**
 * UnsavedChangesDialog - Confirmation dialog when switching layouts with unsaved changes.
 *
 * Shows three options:
 * - Discard: Lose changes and proceed
 * - Cancel: Stay on current layout
 * - Save & Switch: Save changes first, then proceed
 */

import { memo } from 'react';

import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { AppDialog } from '@wcp/wario-ux-shared/containers';

export interface UnsavedChangesDialogProps {
  open: boolean;
  layoutName: string;
  onDiscard: () => void;
  onCancel: () => void;
  onSaveAndProceed: () => void;
  isSaving?: boolean;
}

export const UnsavedChangesDialog = memo(function UnsavedChangesDialog({
  open,
  layoutName,
  onDiscard,
  onCancel,
  onSaveAndProceed,
  isSaving = false,
}: UnsavedChangesDialogProps) {
  return (
    <AppDialog.Root open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <AppDialog.Header onClose={onCancel} title="Unsaved Changes" />
      <AppDialog.Content>
        <Typography>
          You have unsaved changes to <strong>{layoutName}</strong>.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          What would you like to do?
        </Typography>
      </AppDialog.Content>
      <AppDialog.Actions>
        <Button onClick={onDiscard} color="error" disabled={isSaving}>
          Discard
        </Button>
        <Button onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSaveAndProceed} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save & Switch'}
        </Button>
      </AppDialog.Actions>
    </AppDialog.Root>
  );
});
