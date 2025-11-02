import { Clear, Edit } from '@mui/icons-material';
import { Grid, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { styled } from '@mui/system';

import { type CartEntry, formatDecimal, parseInteger } from '@wcp/wario-shared';
import { CheckedNumericInput, selectGroupedAndOrderedCart } from '@wcp/wario-ux-shared';

import { SelectSelectableModifiers } from '@/app/selectors';
import { getCart, removeFromCart, updateCartQuantity } from '@/app/slices/WCartSlice';
import { useAppDispatch, useAppSelector } from '@/app/useHooks';

import { ProductDisplay } from './WProductComponent';


const RemoveFromCart = styled(Clear)(() => ({
  border: '1px solid',
  borderRadius: 16,
  padding: 4
}))

interface IOrderCart {
  isProductEditDialogOpen: boolean;
  setProductToEdit: (entry: CartEntry) => void;
}

export function WOrderCartEntry({ cartEntry, isProductEditDialogOpen, setProductToEdit }: { cartEntry: CartEntry } & IOrderCart) {
  const dispatch = useAppDispatch();
  const hasSelectableModifiers = useAppSelector(s => Object.values(SelectSelectableModifiers(s, cartEntry.product.m.modifier_map)).length > 0);
  const setRemoveEntry = () => {
    dispatch(removeFromCart(cartEntry.id));
  };
  const setEntryQuantity = (quantity: number | null) => {
    if (quantity !== null) {
      dispatch(updateCartQuantity({ id: cartEntry.id, newQuantity: quantity }));
    }
  };
  return (
    <TableRow className={`cart-item${hasSelectableModifiers ? " editible" : ""}`}>
      <TableCell sx={{ py: 0 }}>
        <ProductDisplay productMetadata={cartEntry.product.m} description displayContext="order" />
      </TableCell>
      <TableCell sx={{ py: 1 }}>
        <Grid container alignContent={'center'} >
          <Grid sx={{ p: 1, alignContent: 'center' }} size={12}>
            <CheckedNumericInput
              size='small'
              fullWidth
              pattern={'[0-9]*'}
              step={1}
              inputMode={'numeric'}
              numberProps={{
                allowEmpty: false,
                defaultValue: cartEntry.quantity,
                formatFunction: (v) => formatDecimal(v, 0),
                parseFunction: parseInteger,
                min: 1,
                max: 99
              }}
              value={cartEntry.quantity}
              disabled={cartEntry.isLocked}
              onChange={(value: number) => { setEntryQuantity(value); }}
            />
          </Grid>
          <Grid sx={{ py: 1, pl: 1, textAlign: 'center' }} size={6}>
            <IconButton disabled={cartEntry.isLocked} name="remove" onClick={() => { setRemoveEntry(); }} >
              <RemoveFromCart /></IconButton>
          </Grid>
          <Grid sx={{ py: 1, pr: 1, textAlign: 'center' }} size={6}>
            {hasSelectableModifiers &&
              <IconButton
                disabled={isProductEditDialogOpen || cartEntry.isLocked}
                onClick={() => { setProductToEdit(cartEntry); }}
              >
                <Edit />
              </IconButton>}
          </Grid>
        </Grid>
      </TableCell>
    </TableRow>
  );
}

export function WOrderCart({ isProductEditDialogOpen, setProductToEdit }: IOrderCart) {
  const cart = useAppSelector(s => selectGroupedAndOrderedCart(s, getCart(s.cart.cart)));
  return cart.length === 0 ? <></> :
    <div id="orderCart">
      <Typography variant="h4" sx={{ p: 2, textTransform: 'uppercase', fontFamily: 'Source Sans Pro', }}>Current Order</Typography>
      <TableContainer elevation={0} component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={'85%'}>Item</TableCell>
              <TableCell sx={{ minWidth: 100 }} align='center'>Quantity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cart.map(x => x[1].map((cartEntry: CartEntry) => (
              <WOrderCartEntry key={cartEntry.id} cartEntry={cartEntry} isProductEditDialogOpen={isProductEditDialogOpen} setProductToEdit={setProductToEdit} />
            ))).flat()}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
};
