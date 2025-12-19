/**
 * DeleteConfirmDialog - Reusable confirmation dialog for delete operations.
 *
 * Shows the entity being deleted and lists cascade effects (resources/sections that will also be removed).
 */

import { memo } from 'react';

import Warning from '@mui/icons-material/Warning';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

import { AppDialog } from '@wcp/wario-ux-shared/containers';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  entityName: string;
  /** Items that will be cascaded deleted, e.g., ["5 tables", "2 sections"] */
  warningItems?: string[];
  isPending?: boolean;
}

export const DeleteConfirmDialog = memo(function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  entityName,
  warningItems,
  isPending = false,
}: DeleteConfirmDialogProps) {
  return (
    <AppDialog.Root open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <AppDialog.Header onClose={onClose} title={title} />
      <AppDialog.Content>
        <Typography>
          Are you sure you want to delete <strong>{entityName}</strong>?
        </Typography>

        {warningItems && warningItems.length > 0 && (
          <List dense sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              This will also delete:
            </Typography>
            {warningItems.map((item) => (
              <ListItem key={item} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Warning color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        )}
      </AppDialog.Content>
      <AppDialog.Actions>
        <Button onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Deleting...' : 'Delete'}
        </Button>
      </AppDialog.Actions>
    </AppDialog.Root>
  );
});
