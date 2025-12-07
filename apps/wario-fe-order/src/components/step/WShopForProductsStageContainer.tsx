import { useCallback, useMemo, useState } from 'react';

import { type CartEntry } from '@wcp/wario-shared';
import { scrollToIdOffsetAfterDelay } from '@wcp/wario-ux-shared/common';
import { useFulfillmentMainCategoryId, useFulfillmentSupplementalCategoryId } from '@wcp/wario-ux-shared/query';
import { Separator, StageTitle } from '@wcp/wario-ux-shared/styled';

import { useMainProductCategoryCount } from '@/hooks/useDerivedState';

import { selectCart, useCartStore } from '@/stores/useCartStore';
import { selectSelectedWProduct, useCustomizerStore } from '@/stores/useCustomizerStore';
import { selectSelectedService, useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { useStepperStore } from '@/stores/useStepperStore';

import { Navigation } from '../Navigation';
import { WProductCustomizerComponent } from '../product-customizer/WProductCustomizerComponent';
import { WOrderCart } from '../WOrderCartComponent';

import { WShopForProductsStage } from './WShopForProductsStageComponent';

export interface WShopForProductsStageProps {
  categoryId: string;
  setScrollToOnReturn: (value: React.SetStateAction<string>) => void;
}

export default function WShopForProductsContainer({ productSet }: { productSet: 'PRIMARY' | 'SECONDARY' }) {
  const [scrollToOnReturn, setScrollToOnReturn] = useState('WARIO_order');
  const selectedFulfillmentId = useFulfillmentStore(selectSelectedService) as string;
  const numMainCategoryProducts = useMainProductCategoryCount(selectedFulfillmentId);
  const mainCategoryId = useFulfillmentMainCategoryId(selectedFulfillmentId);
  const supplementalCategoryId = useFulfillmentSupplementalCategoryId(selectedFulfillmentId);
  const cart = useCartStore(selectCart);
  const selectedProduct = useCustomizerStore(selectSelectedWProduct);
  const lockCartEntry = useCartStore((s) => s.lockCartEntry);
  const editCartEntry = useCustomizerStore((s) => s.editCartEntry);
  const { nextStage, backStage } = useStepperStore();
  const titleString = useMemo(
    () =>
      productSet === 'PRIMARY'
        ? numMainCategoryProducts > 0
          ? 'Click a pizza below or next to continue.'
          : 'Click a pizza below to get started.'
        : 'Add small plates and other stuff to your order.',
    [productSet, numMainCategoryProducts],
  );

  const setProductToEdit = useCallback(
    (entry: CartEntry) => {
      lockCartEntry(entry.id);
      editCartEntry(entry);
      scrollToIdOffsetAfterDelay('WARIO_order', 100);
      setScrollToOnReturn('orderCart');
    },
    [lockCartEntry, editCartEntry, setScrollToOnReturn],
  );

  return (
    <div>
      <div hidden={selectedProduct !== null}>
        <StageTitle>{titleString}</StageTitle>
        <Separator sx={{ pb: 3 }} />
        {productSet === 'PRIMARY' && mainCategoryId && (
          <WShopForProductsStage setScrollToOnReturn={setScrollToOnReturn} categoryId={mainCategoryId} />
        )}
        {productSet === 'SECONDARY' && supplementalCategoryId && (
          <WShopForProductsStage setScrollToOnReturn={setScrollToOnReturn} categoryId={supplementalCategoryId} />
        )}
      </div>
      {selectedProduct !== null && <WProductCustomizerComponent scrollToWhenDone={scrollToOnReturn} />}
      {cart.length > 0 && <Separator />}
      <WOrderCart isProductEditDialogOpen={selectedProduct !== null} setProductToEdit={setProductToEdit} />
      {selectedProduct === null && (
        <Navigation canBack canNext={numMainCategoryProducts > 0} handleBack={backStage} handleNext={nextStage} />
      )}
    </div>
  );
}
