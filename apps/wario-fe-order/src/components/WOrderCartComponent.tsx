import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import { type CartEntry } from '@wcp/wario-shared/logic';
import { EditableCartItem } from '@wcp/wario-ux-shared/components';

import { useGroupedAndOrderedCart } from '@/hooks/useDerivedState';

import { useCartStore } from '@/stores/useCartStore';

interface IOrderCart {
  isProductEditDialogOpen: boolean;
  setProductToEdit: (entry: CartEntry) => void;
}

export function WOrderCartEntry({
  cartEntry,
  isProductEditDialogOpen,
  setProductToEdit,
}: { cartEntry: CartEntry } & IOrderCart) {
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const updateCartQuantity = useCartStore((s) => s.updateCartQuantity);

  return (
    <EditableCartItem
      entry={cartEntry}
      onEdit={() => {
        setProductToEdit(cartEntry);
      }}
      onDelete={() => {
        removeFromCart(cartEntry.id);
      }}
      onQuantityChange={(newQuantity) => {
        updateCartQuantity(cartEntry.id, newQuantity);
      }}
      isEditDisabled={isProductEditDialogOpen}
      showPrice
    />
  );
}

export function WOrderCart({ isProductEditDialogOpen, setProductToEdit }: IOrderCart) {
  const groupedCart = useGroupedAndOrderedCart();
  return groupedCart.length === 0 ? (
    <></>
  ) : (
    <Box id="orderCart">
      <Typography variant="h4" sx={{ p: 2, textTransform: 'uppercase', fontFamily: 'Source Sans Pro' }}>
        Current Order
      </Typography>
      <Paper elevation={0}>
        {groupedCart
          .map((x) =>
            x[1].map((cartEntry: CartEntry) => (
              <WOrderCartEntry
                key={cartEntry.id}
                cartEntry={cartEntry}
                isProductEditDialogOpen={isProductEditDialogOpen}
                setProductToEdit={setProductToEdit}
              />
            )),
          )
          .flat()}
      </Paper>
    </Box>
  );
}
