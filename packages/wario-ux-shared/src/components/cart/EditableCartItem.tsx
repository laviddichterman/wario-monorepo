/**
 * EditableCartItem - A shared cart item component with two-row layout.
 *
 * Row 1: Full-width product name + description
 * Row 2: Price (optional) on left, compact controls on right
 *
 * Used by both wario-fe-order and wario-pos for cart/order editing.
 */

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import RemoveIcon from '@mui/icons-material/Remove';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { MoneyToDisplayString } from '@wcp/wario-shared/logic';
import type { CartEntry, ICatalogSelectors, IMoney } from '@wcp/wario-shared/types';

import { ProductDisplay } from '@/components/WProductComponent';

import { useCatalogSelectors, useHasSelectableModifiers } from '@/query/hooks/useCatalogQuery';

// =============================================================================
// Types
// =============================================================================

/**
 * Entry type for EditableCartItem - uses Pick from CartEntry to get only the fields
 * needed for display, with isLocked made optional for compatibility with
 * OrderEditorCartEntry (wario-pos) which doesn't have isLocked.
 */
export type EditableCartEntry = Pick<CartEntry, 'id' | 'product' | 'quantity'> & {
  isLocked?: boolean;
};

export interface EditableCartItemProps {
  /** The cart entry (contains product, quantity, id, and optionally isLocked) */
  entry: EditableCartEntry;
  /** Called when user clicks edit */
  onEdit: () => void;
  /** Called when user clicks delete */
  onDelete: () => void;
  /** Called when quantity changes */
  onQuantityChange: (newQuantity: number) => void;
  /** If true, disables the edit button (e.g., dialog already open) */
  isEditDisabled?: boolean;
  /** If true, shows price on the left of controls row (default: true) */
  showPrice?: boolean;
}

// =============================================================================
// Static Styles (Extracted to avoid recreating on every render)
// =============================================================================

const CONTAINER_SX = {
  py: 1.5,
  px: 2,
  borderBottom: 1,
  borderColor: 'divider',
  '&:last-child': { borderBottom: 0 },
} as const;

const CONTROLS_ROW_SX = { mt: 1 } as const;

const PRICE_SX = {
  fontFamily: 'Cabin',
  fontWeight: 700,
} as const;

const PRICE_UNIT_SX = {
  fontFamily: 'Cabin',
  fontWeight: 400,
  color: 'text.secondary',
  ml: 0.5,
} as const;

const QUANTITY_SX = { minWidth: 24, textAlign: 'center', fontWeight: 600 } as const;

const ICON_BUTTON_SX = { p: 0.5 } as const;

const DELETE_BUTTON_SX = { p: 0.5, ml: 0.5 } as const;

// =============================================================================
// Helper Functions (Price formatting utilities)
// =============================================================================

/**
 * Creates a new IMoney object by multiplying the amount by a factor.
 */
function multiplyMoney(money: IMoney, multiplier: number): IMoney {
  return {
    ...money,
    amount: Math.round(money.amount * multiplier),
  };
}

// =============================================================================
// Component
// =============================================================================

export function EditableCartItem({
  entry,
  onEdit,
  onDelete,
  onQuantityChange,
  isEditDisabled = false,
  showPrice = true,
}: EditableCartItemProps) {
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors | null;
  const hasSelectableModifiers = useHasSelectableModifiers(entry.product.m.modifier_map);

  const { product, quantity, isLocked } = entry;
  // Use MoneyToDisplayString instead of manual conversion
  const unitPrice = product.m.price;
  const totalMoney = multiplyMoney(unitPrice, quantity);

  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    onQuantityChange(quantity + 1);
  };

  if (!catalogSelectors) {
    return null;
  }

  return (
    <Box className={`cart-item${hasSelectableModifiers ? ' editable' : ''}`} sx={CONTAINER_SX}>
      {/* Row 1: Full-width product info */}
      <ProductDisplay
        productMetadata={product.m}
        catalogSelectors={catalogSelectors}
        description
        displayContext="order"
      />

      {/* Row 2: Price left (optional), controls right */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={CONTROLS_ROW_SX}>
        {/* Price display - Cabin typeface to match menu */}
        {showPrice ? (
          <Typography component="span" sx={PRICE_SX}>
            {MoneyToDisplayString(totalMoney, false)}
            {quantity > 1 && (
              <Typography component="span" sx={PRICE_UNIT_SX}>
                ({MoneyToDisplayString(unitPrice, false)} ea)
              </Typography>
            )}
          </Typography>
        ) : (
          <Box /> // Empty placeholder to maintain flex layout
        )}

        {/* Compact controls */}
        <Stack direction="row" alignItems="center" spacing={0}>
          {/* Quantity stepper */}
          <IconButton size="small" onClick={handleDecrement} disabled={quantity <= 1 || isLocked} sx={ICON_BUTTON_SX}>
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={QUANTITY_SX}>
            {quantity}
          </Typography>
          <IconButton size="small" onClick={handleIncrement} disabled={isLocked} sx={ICON_BUTTON_SX}>
            <AddIcon fontSize="small" />
          </IconButton>

          {/* Delete */}
          <IconButton size="small" onClick={onDelete} disabled={isLocked} sx={DELETE_BUTTON_SX} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>

          {/* Edit (rightmost) - shows EditOff icon when not editable */}
          {hasSelectableModifiers ? (
            <IconButton size="small" onClick={onEdit} disabled={isEditDisabled || isLocked} sx={ICON_BUTTON_SX}>
              <EditIcon fontSize="small" />
            </IconButton>
          ) : (
            <Tooltip title="This item has no customization options">
              <span>
                <IconButton size="small" disabled sx={ICON_BUTTON_SX}>
                  <EditOffIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

export default EditableCartItem;
