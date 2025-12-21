/**
 * NavigationGuardDialog - Confirmation dialog for navigation with unsaved changes.
 *
 * Shows three options:
 * - Discard: Leave without saving
 * - Cancel: Stay on current page
 * - Save & Leave: Save and then proceed (optional)
 */

import { memo } from 'react';

import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { AppDialog } from '@wcp/wario-ux-shared/containers';

export interface NavigationGuardDialogProps {
  open: boolean;
  /** Name of the item with unsaved changes (e.g., "Layout A") */
  entityName?: string;
  /** What type of entity (e.g., "layout", "form") */
  entityType?: string;
  /** Called when user chooses to discard changes */
  onDiscard: () => void;
  /** Called when user chooses to stay (cancel navigation) */
  onCancel: () => void;
  /** Called when user chooses to save first. If not provided, the Save button is not shown. */
  onSave?: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Custom title */
  title?: string;
  /** Custom save button text */
  saveButtonText?: string;
}

export const NavigationGuardDialog = memo(function NavigationGuardDialog({
  open,
  entityName,
  entityType = 'changes',
  onDiscard,
  onCancel,
  onSave,
  isSaving = false,
  title = 'Unsaved Changes',
  saveButtonText = 'Save & Leave',
}: NavigationGuardDialogProps) {
  return (
    <AppDialog.Root open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <AppDialog.Header onClose={onCancel} title={title} />
      <AppDialog.Content>
        <Typography>
          You have unsaved {entityType}
          {entityName ? (
            <>
              {' '}
              in <strong>{entityName}</strong>
            </>
          ) : null}
          .
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
          Stay
        </Button>
        {onSave && (
          <Button variant="contained" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : saveButtonText}
          </Button>
        )}
      </AppDialog.Actions>
    </AppDialog.Root>
  );
});
