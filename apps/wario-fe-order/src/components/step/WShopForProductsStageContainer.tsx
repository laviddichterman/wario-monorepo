import { useCallback, useMemo, useState } from 'react';

import { type CartEntry } from '@wcp/wario-shared';
import { scrollToIdOffsetAfterDelay } from '@wcp/wario-ux-shared/common';
import { Separator, StageTitle } from '@wcp/wario-ux-shared/styled';

import { SelectMainCategoryId, SelectMainProductCategoryCount, SelectSupplementalCategoryId } from '@/app/selectors';
import { useAppSelector } from '@/app/useHooks';
import { selectCart, selectSelectedWProduct, useCartStore, useCustomizerStore, useStepperStore } from '@/stores';

import { Navigation } from '../Navigation';
import { WOrderCart } from '../WOrderCartComponent';
import { WProductCustomizerComponent } from '../WProductCustomizerComponent';

import { WShopForProductsStage } from './WShopForProductsStageComponent';

export interface WShopForProductsStageProps {
  categoryId: string;
  setScrollToOnReturn: (value: React.SetStateAction<string>) => void
}

export function WShopForProductsContainer({ productSet }: { productSet: 'PRIMARY' | 'SECONDARY' }) {
  const [scrollToOnReturn, setScrollToOnReturn] = useState('WARIO_order');
  const numMainCategoryProducts = useAppSelector(SelectMainProductCategoryCount);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const mainCategoryId = useAppSelector(SelectMainCategoryId)!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const supplementalCategoryId = useAppSelector(SelectSupplementalCategoryId)!;
  const cart = useCartStore(selectCart);
  const selectedProduct = useCustomizerStore(selectSelectedWProduct);
  const lockCartEntry = useCartStore((s) => s.lockCartEntry);
  const editCartEntry = useCustomizerStore((s) => s.editCartEntry);
  const { nextStage, backStage } = useStepperStore();
  const titleString = useMemo(() => productSet === 'PRIMARY' ?
    (numMainCategoryProducts > 0 ? "Click a pizza below or next to continue." : "Click a pizza below to get started.") :
    'Add small plates and other stuff to your order.',
    [productSet, numMainCategoryProducts]);

  const setProductToEdit = useCallback((entry: CartEntry) => {
    lockCartEntry(entry.id);
    editCartEntry(entry);
    scrollToIdOffsetAfterDelay('WARIO_order', 100);
    setScrollToOnReturn('orderCart');
  }, [lockCartEntry, editCartEntry, setScrollToOnReturn]);

  return (
    <div>
      <div hidden={selectedProduct !== null}>
        <StageTitle>{titleString}</StageTitle>
        <Separator sx={{ pb: 3 }} />
        {productSet === 'PRIMARY' &&
          <WShopForProductsStage
            setScrollToOnReturn={setScrollToOnReturn}
            categoryId={mainCategoryId}
          />}
        {productSet === 'SECONDARY' &&
          <WShopForProductsStage
            setScrollToOnReturn={setScrollToOnReturn}
            categoryId={supplementalCategoryId}
          />}
      </div>
      {selectedProduct !== null && (<WProductCustomizerComponent scrollToWhenDone={scrollToOnReturn} />)}
      {cart.length > 0 && <Separator />}
      <WOrderCart isProductEditDialogOpen={selectedProduct !== null} setProductToEdit={setProductToEdit} />
      {selectedProduct === null && <Navigation canBack canNext={numMainCategoryProducts > 0} handleBack={backStage} handleNext={nextStage} />}
    </div>
  );
}