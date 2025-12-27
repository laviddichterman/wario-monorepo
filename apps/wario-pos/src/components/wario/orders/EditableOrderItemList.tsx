import { Box, List, Typography } from '@mui/material';

import type { ICatalogSelectors } from '@wcp/wario-shared/types';
import { EditableCartItem } from '@wcp/wario-ux-shared/components';
import { useCatalogSelectors } from '@wcp/wario-ux-shared/query';

import type { OrderEditorCartEntry } from '@/stores/useOrderEditorStore';

// =============================================================================
// Types
// =============================================================================

export interface EditableOrderItemListProps {
  /** Cart items to display */
  items: OrderEditorCartEntry[];
  /** Called when user clicks edit on an item */
  onEdit: (index: number) => void;
  /** Called when user clicks delete on an item */
  onDelete: (index: number) => void;
  /** Called when user changes quantity */
  onQuantityChange: (index: number, quantity: number) => void;
}

// =============================================================================
// Component
// =============================================================================

export function EditableOrderItemList({ items, onEdit, onDelete, onQuantityChange }: EditableOrderItemListProps) {
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors | null;

  if (items.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No items in order. Use the search bar above to add products.
        </Typography>
      </Box>
    );
  }

  if (!catalogSelectors) {
    return null;
  }

  return (
    <List disablePadding>
      {items.map((item, index) => (
        <EditableCartItem
          key={item.id}
          entry={item}
          onEdit={() => {
            onEdit(index);
          }}
          onDelete={() => {
            onDelete(index);
          }}
          onQuantityChange={(newQuantity) => {
            onQuantityChange(index, newQuantity);
          }}
          showPrice={false}
        />
      ))}
    </List>
  );
}

export default EditableOrderItemList;
