import { useCallback, useState } from 'react';

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

import type { ICatalogSelectors, IProduct, WProduct } from '@wcp/wario-shared/types';
import {
  CustomerModifierTypeEditor,
  CustomizerProvider,
  useOrderModifierEditor,
} from '@wcp/wario-ux-shared/product-customizer';
import { useCatalogSelectors, useProductById } from '@wcp/wario-ux-shared/query';

// =============================================================================
// Types
// =============================================================================

export interface ProductEditModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** The product being edited */
  product: WProduct;
  /** Order's fulfillment ID for availability filtering */
  fulfillmentId: string;
  /** Order's service date/time */
  serviceDateTime: Date | number;
  /** Called when user cancels editing */
  onCancel: () => void;
  /** Called when user applies changes */
  onApply: (product: WProduct) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ProductEditModal({
  open,
  product,
  fulfillmentId,
  serviceDateTime,
  onCancel,
  onApply,
}: ProductEditModalProps) {
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors | null;
  const productType = useProductById(product.p.productId) as IProduct | undefined;

  // Local state for the product being edited
  const [editingProduct, setEditingProduct] = useState<WProduct>(() => structuredClone(product));

  // Reset local state when product prop changes (modal opens with new product)
  if (open && product.p.productId !== editingProduct.p.productId) {
    setEditingProduct(structuredClone(product));
  }

  // Use the order modifier editor hook for mutations and visible modifiers
  const { selectRadio, toggleCheckbox, visibleModifiers } = useOrderModifierEditor({
    product: editingProduct,
    fulfillmentId,
    serviceDateTime,
    onProductChange: setEditingProduct,
  });

  const handleApply = useCallback(() => {
    onApply(editingProduct);
  }, [editingProduct, onApply]);

  const handleCancel = useCallback(() => {
    setEditingProduct(structuredClone(product));
    onCancel();
  }, [product, onCancel]);

  // Check if product is valid (all required modifiers satisfied)
  const isValid = !editingProduct.m.incomplete;

  if (!catalogSelectors || !productType) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { maxHeight: '80vh' } },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span">
          {editingProduct.m.name}
        </Typography>
        <IconButton onClick={handleCancel} size="small" edge="end">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <CustomizerProvider
          product={editingProduct}
          catalogSelectors={catalogSelectors}
          productType={productType}
          fulfillmentId={fulfillmentId}
          serviceDateTime={serviceDateTime}
        >
          <Stack spacing={2}>
            {visibleModifiers.map((entry) => (
              <CustomerModifierTypeEditor
                key={entry.mtid}
                mtid={entry.mtid}
                enableSplitMode
                size="small"
                onSelectRadio={selectRadio}
                onToggleCheckbox={toggleCheckbox}
              />
            ))}
          </Stack>
        </CustomizerProvider>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleCancel} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained" disabled={!isValid}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProductEditModal;
