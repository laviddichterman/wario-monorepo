import { useCallback, useMemo } from 'react';

import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

import type { CoreCartEntry, ICatalogSelectors, IMoney, OrderLineDiscount, OrderPayment, WProduct } from '@wcp/wario-shared';
import { DiscountMethod, MoneyToDisplayString, PaymentMethod, TenderBaseStatus } from '@wcp/wario-shared';

import { ProductDisplay } from '@/components/WProductComponent';

import { fPercent } from '@/common/numbers';
import { ProductPrice, ProductTitle } from '@/styled/styled';

export interface WCheckoutCartComponentProps {
  selectedService: string;
  catalogSelectors: ICatalogSelectors;
  cart: [string, CoreCartEntry<WProduct>[]][];
  discounts: OrderLineDiscount[];
  taxRate: number;
  taxValue?: IMoney;
  tipValue?: IMoney;
  serviceCharge?: IMoney;
  total?: IMoney;
  payments: OrderPayment[];
  hideProductDescriptions?: boolean;
}

export function WCheckoutCartComponent(props: WCheckoutCartComponentProps) {
  const balance: IMoney | null = useMemo(() => props.total && props.payments.length > 0 ? { currency: props.total.currency, amount: props.payments.reduce((acc, payment) => (acc - payment.amount.amount), props.total.amount) } : null, [props.total, props.payments])
  const generateDiscountLine = useCallback((discount: OrderLineDiscount) => {
    switch (discount.t) {
      case DiscountMethod.CreditCodeAmount: {
        return (<ProductTitle>Discount Code Applied <Typography sx={{ textTransform: "none" }}>({discount.discount.code})</Typography></ProductTitle>);
      }
      case DiscountMethod.ManualAmount: {
        return (<ProductTitle>{MoneyToDisplayString(discount.discount.amount, false)} off</ProductTitle>);
      }
      case DiscountMethod.ManualPercentage: {
        return (<ProductTitle>{fPercent(discount.discount.percentage)} off</ProductTitle>);
      }
    }
  }, []);
  const generatePaymentLine = useCallback((payment: OrderPayment) => {
    switch (payment.t) {
      case PaymentMethod.CreditCard: {
        return payment.status === TenderBaseStatus.PROPOSED ? "" : <ProductTitle>Payment received {payment.payment.last4 ? ` from card ending in: ${payment.payment.last4}` : " from credit card."}</ProductTitle>;
      }
      case PaymentMethod.StoreCredit: {
        return <ProductTitle>Digital Gift Applied <Typography sx={{ textTransform: "none" }}>({payment.payment.code})</Typography></ProductTitle>;
      }
      case PaymentMethod.Cash: {
        return (<ProductTitle>Cash payment of {MoneyToDisplayString(payment.payment.amountTendered, false)}</ProductTitle>);
      }
    }
  }, []);
  return (<>
    <Typography variant="h4" sx={{ p: 2, textTransform: 'uppercase', fontFamily: 'Source Sans Pro', }}>Order summary</Typography>
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell colSpan={3}>Quantity x Price</TableCell>
            <TableCell>Subtotal</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.cart.map(([_, entries]) => entries).flat().map((cartEntry, i) => (
            <TableRow key={i}>
              <TableCell>
                <ProductDisplay catalogSelectors={props.catalogSelectors} productMetadata={cartEntry.product.m} description={props.hideProductDescriptions === true ? false : true} displayContext="order" />
              </TableCell>
              <TableCell><ProductPrice>{cartEntry.quantity}</ProductPrice></TableCell>
              <TableCell><ProductPrice>×</ProductPrice></TableCell>
              <TableCell align="right"><ProductPrice>{MoneyToDisplayString(cartEntry.product.m.price, false)}</ProductPrice></TableCell>
              <TableCell align="right"><ProductPrice>{MoneyToDisplayString({ currency: cartEntry.product.m.price.currency, amount: Math.round(cartEntry.product.m.price.amount * cartEntry.quantity) }, false)}</ProductPrice></TableCell>
            </TableRow>
          ))}
          <TableRow />
          {props.discounts.map((discount, i) =>
            <TableRow key={`${discount.t}${i.toString()}`}>
              <TableCell colSpan={3} >
                {generateDiscountLine(discount)}
              </TableCell>
              <TableCell colSpan={2} align="right">
                <ProductPrice >-{MoneyToDisplayString(discount.discount.amount, false)}</ProductPrice>
              </TableCell>
            </TableRow>)}
          {props.taxValue && props.taxValue.amount > 0 &&
            <TableRow>
              <TableCell colSpan={3} >
                <ProductTitle>Sales Tax ({fPercent(props.taxRate)})</ProductTitle>
              </TableCell>
              <TableCell colSpan={2} align="right"><ProductPrice>{MoneyToDisplayString(props.taxValue, false)}</ProductPrice></TableCell>
            </TableRow>}
          {props.tipValue && props.tipValue.amount > 0 &&
            <TableRow>
              <TableCell colSpan={3} >
                <ProductTitle>Gratuity</ProductTitle>
                <div>Gratuity is distributed in its entirety to all non-owner staff working front and back of house on the day of your order.</div>
              </TableCell>
              <TableCell colSpan={2} align="right"><ProductPrice>{MoneyToDisplayString(props.tipValue, false)}</ProductPrice></TableCell>
            </TableRow>}
          {props.total && <TableRow>
            <TableCell colSpan={3} >
              <ProductTitle>Total</ProductTitle>
            </TableCell>
            <TableCell colSpan={2} align="right"><ProductPrice>{MoneyToDisplayString(props.total, false)}</ProductPrice></TableCell>
          </TableRow>}
          {props.payments.map((payment, i) =>
            <TableRow key={`PAYMENT_${i.toString()}`}>
              <TableCell colSpan={3} >
                {generatePaymentLine(payment)}
              </TableCell>
              <TableCell colSpan={2} align="right">
                <ProductPrice >-{MoneyToDisplayString(payment.amount, false)}</ProductPrice>
              </TableCell>
            </TableRow>)}
          {balance &&
            <TableRow>
              <TableCell colSpan={3} >
                <ProductTitle>Balance</ProductTitle>
              </TableCell>
              <TableCell colSpan={2} align="right">
                <ProductPrice >{MoneyToDisplayString(balance, false)}</ProductPrice>
              </TableCell>
            </TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  </>
  )
}