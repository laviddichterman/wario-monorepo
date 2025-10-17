import { useCallback, useMemo, useState } from 'react';
import { type CartEntry } from '@wcp/wario-shared';
import { editCartEntry } from '../../app/slices/WCustomizerSlice';
import { useAppDispatch, useAppSelector } from '../../app/useHooks';
import { WProductCustomizerComponent } from '../WProductCustomizerComponent';
import { SelectMainCategoryId, SelectMainProductCategoryCount, selectSelectedWProduct, SelectSupplementalCategoryId } from '../../app/store';
import { getCart, lockCartEntry } from '../../app/slices/WCartSlice';
import { nextStage, backStage } from '../../app/slices/StepperSlice';
import { Navigation } from '../Navigation';
import { WOrderCart } from '../WOrderCartComponent';
import { WShopForProductsStage } from './WShopForProductsStageComponent';
import { Separator, scrollToIdOffsetAfterDelay, StageTitle } from '@wcp/wario-ux-shared';

export interface WShopForProductsStageProps {
  categoryId: string;
  setScrollToOnReturn: (value: React.SetStateAction<string>) => void
}

export function WShopForProductsContainer({ productSet }: { productSet: 'PRIMARY' | 'SECONDARY' }) {
  const [scrollToOnReturn, setScrollToOnReturn] = useState('WARIO_order');
  const numMainCategoryProducts = useAppSelector(SelectMainProductCategoryCount);
  const mainCategoryId = useAppSelector(SelectMainCategoryId)!;
  const supplementalCategoryId = useAppSelector(SelectSupplementalCategoryId)!;
  const cart = useAppSelector(s => getCart(s.cart.cart));
  const selectedProduct = useAppSelector(selectSelectedWProduct);
  const dispatch = useAppDispatch();
  const titleString = useMemo(() => productSet === 'PRIMARY' ?
    (numMainCategoryProducts > 0 ? "Click a pizza below or next to continue." : "Click a pizza below to get started.") :
    'Add small plates and other stuff to your order.',
    [productSet, numMainCategoryProducts]);

  const setProductToEdit = useCallback((entry: CartEntry) => {
    dispatch(lockCartEntry(entry.id));
    dispatch(editCartEntry(entry));
    scrollToIdOffsetAfterDelay('WARIO_order', 100);
    setScrollToOnReturn('orderCart');
  }, [dispatch, setScrollToOnReturn]);

  return (
    <div>
      <div hidden={selectedProduct !== null}>
        <StageTitle>{titleString}</StageTitle>
        <Separator sx={{ pb: 3 }} />
        {productSet === 'PRIMARY' ?
          <WShopForProductsStage
            setScrollToOnReturn={setScrollToOnReturn}
            categoryId={mainCategoryId}
          /> :
          <WShopForProductsStage
            setScrollToOnReturn={setScrollToOnReturn}
            categoryId={supplementalCategoryId!}
          />}
      </div>
      {selectedProduct !== null && (<WProductCustomizerComponent scrollToWhenDone={scrollToOnReturn} />)}
      {cart.length > 0 && <Separator />}
      <WOrderCart isProductEditDialogOpen={selectedProduct !== null} setProductToEdit={setProductToEdit} />
      {selectedProduct === null && <Navigation canBack canNext={numMainCategoryProducts > 0} handleBack={() => dispatch(backStage())} handleNext={() => dispatch(nextStage())} />}
    </div>
  );
}