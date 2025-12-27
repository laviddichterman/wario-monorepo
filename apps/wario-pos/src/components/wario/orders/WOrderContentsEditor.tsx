import { useCallback, useEffect } from 'react';

import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Alert, Box, Button, IconButton, Typography } from '@mui/material';

import { WDateUtils } from '@wcp/wario-shared';
import type { CoreCartEntry, WProduct } from '@wcp/wario-shared/types';

import { useGroupedAndSortedCart, useOrderById } from '@/hooks/useOrdersQuery';

import {
  selectEditingCategoryId,
  selectEditingProduct,
  selectIsDirty,
  selectIsModalOpen,
  selectOrderCart,
  useOrderEditorStore,
} from '@/stores/useOrderEditorStore';

import EditableOrderItemList from './EditableOrderItemList';
import ProductEditModal from './ProductEditModal';
import ProductSearchBar from './ProductSearchBar';

// =============================================================================
// Types
// =============================================================================

export interface WOrderContentsEditorProps {
  /** Order ID being edited */
  orderId: string;
  /** Called when user exits the editor */
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function WOrderContentsEditor({ orderId, onClose }: WOrderContentsEditorProps) {
  const order = useOrderById(orderId);
  const groupedCart = useGroupedAndSortedCart(order);

  // Zustand store
  const orderCart = useOrderEditorStore(selectOrderCart);
  const editingProduct = useOrderEditorStore(selectEditingProduct);
  const editingCategoryId = useOrderEditorStore(selectEditingCategoryId);
  const isDirty = useOrderEditorStore(selectIsDirty);
  const isModalOpen = useOrderEditorStore(selectIsModalOpen);

  const {
    initializeFromRebuiltCart,
    commitProduct,
    removeItem,
    updateQuantity,
    editItem,
    startAddProduct,
    cancelEditing,
    addProductDirect,
    clearEditor,
  } = useOrderEditorStore();

  // Initialize editor when order loads
  useEffect(() => {
    if (order && groupedCart.length > 0) {
      // Flatten grouped cart into single array
      const flatCart: CoreCartEntry<WProduct>[] = groupedCart.flatMap(([_categoryId, items]) =>
        items.map((item) => ({
          categoryId: item.categoryId,
          quantity: item.quantity,
          product: item.product,
        })),
      );
      initializeFromRebuiltCart(orderId, flatCart);
    }
  }, [order, orderId, groupedCart, initializeFromRebuiltCart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearEditor();
    };
  }, [clearEditor]);

  // Handlers
  const handleAddDirect = useCallback(
    (product: WProduct, categoryId: string) => {
      addProductDirect(product, categoryId);
    },
    [addProductDirect],
  );

  const handleOpenCustomizer = useCallback(
    (product: WProduct, categoryId: string) => {
      startAddProduct(product, categoryId);
    },
    [startAddProduct],
  );

  const handleModalApply = useCallback(
    (product: WProduct) => {
      if (editingCategoryId) {
        commitProduct(product, editingCategoryId);
      }
    },
    [editingCategoryId, commitProduct],
  );

  const handleCancel = useCallback(() => {
    if (isDirty) {
      // Could show confirmation dialog here
      // For now, just close
    }
    clearEditor();
    onClose();
  }, [isDirty, clearEditor, onClose]);

  if (!order) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading order...</Typography>
      </Box>
    );
  }

  // Compute service time from order
  const serviceDateTime = WDateUtils.ComputeServiceDateTime(order.fulfillment);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={handleCancel} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">Edit Order Contents</Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Search Bar */}
        <ProductSearchBar
          serviceDateTime={serviceDateTime}
          fulfillmentId={order.fulfillment.selectedService}
          onAddDirect={handleAddDirect}
          onOpenCustomizer={handleOpenCustomizer}
        />

        {/* Editable Item List */}
        <EditableOrderItemList
          items={orderCart}
          onEdit={editItem}
          onDelete={removeItem}
          onQuantityChange={updateQuantity}
        />
      </Box>

      {/* API Not Implemented Notice */}
      <Alert severity="info" sx={{ mx: 2, mb: 1 }}>
        API support for saving order changes is not yet implemented.
      </Alert>

      {/* Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 2,
          justifyContent: 'flex-end',
        }}
      >
        <Button variant="outlined" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="contained" disabled>
          Save Changes
        </Button>
      </Box>

      {/* Product Edit Modal */}
      {editingProduct && (
        <ProductEditModal
          open={isModalOpen}
          product={editingProduct}
          fulfillmentId={order.fulfillment.selectedService}
          serviceDateTime={serviceDateTime}
          onCancel={cancelEditing}
          onApply={handleModalApply}
        />
      )}
    </Box>
  );
}

export default WOrderContentsEditor;
