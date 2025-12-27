import { useSnackbar } from 'notistack';
import React, { forwardRef, useMemo } from 'react';

import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';

import type {
  ICatalogSelectors,
  IProduct,
  IProductDisplayFlags,
  WProduct,
  WProductMetadata,
} from '@wcp/wario-shared/types';
import { scrollToIdOffsetAfterDelay } from '@wcp/wario-ux-shared/common';
import {
  CustomerModifierTypeEditor,
  CustomizerProvider,
  useOrderModifierEditor,
} from '@wcp/wario-ux-shared/product-customizer';
import {
  useAllowAdvanced,
  useCatalogSelectors,
  useProductById,
  useValueFromProductById,
} from '@wcp/wario-ux-shared/query';
import { Separator, StageTitle, WarioButton } from '@wcp/wario-ux-shared/styled';

import { useProductMetadataWithCurrentFulfillmentData, useSelectedCartEntry } from '@/hooks/useDerivedState';

import { findDuplicateInCart, selectCart, useCartStore } from '@/stores/useCartStore';
import {
  selectCategoryId,
  selectSelectedWProduct,
  selectShowAdvanced,
  useCustomizerStore,
} from '@/stores/useCustomizerStore';
import { selectSelectedService, selectServiceDateTime, useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { useMetricsStore } from '@/stores/useMetricsStore';

import { ModifierOptionTooltip } from '../ModifierOptionTooltip';
import {
  OrderGuideErrorsComponent,
  OrderGuideMessagesComponent,
  OrderGuideWarningsComponent,
} from '../WOrderGuideMessages';
import { ProductDisplay } from '../WProductComponent';

import { WOptionDetailModal } from './WOptionDetailModal';

// =============================================================================
// Components
// =============================================================================

interface IProductCustomizerComponentProps {
  suppressGuide?: boolean;
  scrollToWhenDone: string;
}

export const WProductCustomizerComponent = forwardRef<HTMLDivElement, IProductCustomizerComponentProps>(
  ({ suppressGuide, scrollToWhenDone }, ref) => {
    const categoryId = useCustomizerStore(selectCategoryId);
    const selectedProduct = useCustomizerStore(selectSelectedWProduct);
    if (!selectedProduct || !categoryId) {
      return null;
    }
    return (
      <WProductCustomizerComponentInner
        product={selectedProduct}
        categoryId={categoryId}
        suppressGuide={suppressGuide}
        scrollToWhenDone={scrollToWhenDone}
        ref={ref}
      />
    );
  },
);

export const WProductCustomizerComponentInner = forwardRef<
  HTMLDivElement,
  IProductCustomizerComponentProps & { product: WProduct; categoryId: string }
>(({ product, categoryId, suppressGuide, scrollToWhenDone }, ref) => {
  const { enqueueSnackbar } = useSnackbar();
  const setTimeToFirstProductIfUnset = useMetricsStore((s) => s.setTimeToFirstProductIfUnset);
  const catalog = useCatalogSelectors() as ICatalogSelectors;
  const productType = useProductById(product.p.productId) as IProduct | undefined;
  const setShowAdvanced = useCustomizerStore((s) => s.setShowAdvanced);
  const clearCustomizer = useCustomizerStore((s) => s.clearCustomizer);
  const setAdvancedModifierOption = useCustomizerStore((s) => s.setAdvancedModifierOption);
  const addToCart = useCartStore((s) => s.addToCart);
  const updateCartQuantity = useCartStore((s) => s.updateCartQuantity);
  const updateCartProduct = useCartStore((s) => s.updateCartProduct);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const unlockCartEntry = useCartStore((s) => s.unlockCartEntry);
  const cart = useCartStore(selectCart);
  const selectedProductMetadata = useProductMetadataWithCurrentFulfillmentData(
    product.p.productId,
    product.p.modifiers,
  ) as WProductMetadata;
  const { singular_noun: selectedProductNoun } = useValueFromProductById(
    product.p.productId,
    'displayFlags',
  ) as IProductDisplayFlags;
  const customizerTitle = useMemo(
    () => (selectedProductNoun ? `your ${selectedProductNoun}` : 'it'),
    [selectedProductNoun],
  );

  // Use shared modifier editor hook
  const fulfillmentId = useFulfillmentStore(selectSelectedService) as string;
  const serviceDateTime = useFulfillmentStore(selectServiceDateTime) as Date;
  const updateCustomizerProduct = useCustomizerStore((s) => s.updateCustomizerProduct);
  const { selectRadio, toggleCheckbox, getOptionState, visibleModifiers } = useOrderModifierEditor({
    product,
    fulfillmentId,
    serviceDateTime,
    onProductChange: updateCustomizerProduct,
  });

  const cartEntry = useSelectedCartEntry();
  const allowAdvancedOptionPromptGlobalSetting = useAllowAdvanced() || false;
  const showAdvanced = useCustomizerStore(selectShowAdvanced);
  const mtid_moid = useCustomizerStore((s) => s.advancedModifierOption);
  const hasAdvancedOptionSelected = useMemo(
    () => selectedProductMetadata.advanced_option_selected,
    [selectedProductMetadata.advanced_option_selected],
  );

  const toggleAllowAdvancedOption = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowAdvanced(e.target.checked);
  };
  const unselectProduct = () => {
    scrollToIdOffsetAfterDelay(scrollToWhenDone, 200);
    if (cartEntry) {
      unlockCartEntry(cartEntry.id);
    }
    clearCustomizer();
  };
  const confirmCustomization = () => {
    const matchingCartEntry = findDuplicateInCart(
      cart,
      catalog.modifierEntry,
      catalog.productEntry,
      categoryId,
      product.p,
      cartEntry?.id,
    );
    if (matchingCartEntry) {
      const amountToAdd = cartEntry?.quantity ?? 1;
      const newQuantity = matchingCartEntry.quantity + amountToAdd;
      updateCartQuantity(matchingCartEntry.id, newQuantity);
      if (cartEntry) {
        removeFromCart(cartEntry.id);
        enqueueSnackbar(`Merged duplicate ${selectedProductMetadata.name} in your order.`, {
          variant: 'success',
          autoHideDuration: 3000,
        });
      } else {
        enqueueSnackbar(`Updated quantity of ${selectedProductMetadata.name} to ${newQuantity.toString()}`, {
          variant: 'success',
          autoHideDuration: 3000,
        });
      }
    } else {
      // cartEntry being undefined means it's an addition
      if (cartEntry === null) {
        setTimeToFirstProductIfUnset(Date.now());
        addToCart(categoryId, product);
        enqueueSnackbar(`Added ${selectedProductMetadata.name} to your order.`, {
          variant: 'success',
          autoHideDuration: 3000,
          disableWindowBlurListener: true,
        });
      } else {
        updateCartProduct(cartEntry.id, product);
        unlockCartEntry(cartEntry.id);
        enqueueSnackbar(`Updated ${selectedProductMetadata.name} in your order.`, {
          variant: 'success',
          autoHideDuration: 3000,
          disableWindowBlurListener: true,
        });
      }
    }
    unselectProduct();
  };

  if (!productType) {
    return null;
  }

  return (
    <div ref={ref}>
      {mtid_moid !== null && (
        <WOptionDetailModal mtid_moid={mtid_moid} toggleCheckbox={toggleCheckbox} getOptionState={getOptionState} />
      )}
      <StageTitle>Customize {customizerTitle}!</StageTitle>
      <Separator sx={{ pb: 3 }} />
      <ProductDisplay productMetadata={selectedProductMetadata} description price displayContext="order" />
      <Separator />
      <CustomizerProvider
        product={product}
        catalogSelectors={catalog}
        productType={productType}
        fulfillmentId={fulfillmentId}
        serviceDateTime={serviceDateTime}
      >
        <Grid container>
          {visibleModifiers.map((entry, i) => (
            <Grid container key={i} size={12}>
              <CustomerModifierTypeEditor
                mtid={entry.mtid}
                enableSplitMode={showAdvanced}
                onSelectRadio={selectRadio}
                onToggleCheckbox={toggleCheckbox}
                onOpenAdvanced={(mt, optId) => {
                  setAdvancedModifierOption([mt, optId]);
                }}
                renderOptionWrapper={(option, enableState, children) => (
                  <ModifierOptionTooltip product={product.p} option={option} enableState={enableState.enable_whole}>
                    {children}
                  </ModifierOptionTooltip>
                )}
              />
            </Grid>
          ))}
        </Grid>
      </CustomizerProvider>
      {suppressGuide === true ? (
        <></>
      ) : (
        <OrderGuideMessagesComponent productId={product.p.productId} productModifierEntries={product.p.modifiers} />
      )}
      <OrderGuideWarningsComponent productId={product.p.productId} productModifierEntries={product.p.modifiers} />
      <OrderGuideErrorsComponent modifierMap={selectedProductMetadata.modifier_map} />
      {allowAdvancedOptionPromptGlobalSetting && product.m.advanced_option_eligible ? (
        <FormControlLabel
          control={
            <Checkbox disabled={hasAdvancedOptionSelected} value={showAdvanced} onChange={toggleAllowAdvancedOption} />
          }
          label="I really, really want to do some advanced customization of my pizza. I absolutely know what I'm doing and won't complain if I later find out I didn't know what I was doing."
        />
      ) : (
        ''
      )}
      <Grid container sx={{ py: 3, flexDirection: 'row-reverse' }} size={12}>
        <Grid sx={{ display: 'flex', width: '200px', justifyContent: 'flex-end' }}>
          {/* We don't need to check for orderGuideErrors.length > 0 as selectedProduct.m.incomplete is the same check */}
          {}
          <WarioButton disabled={selectedProductMetadata.incomplete} onClick={confirmCustomization}>
            {cartEntry === null ? 'Add to order' : 'Save changes'}
          </WarioButton>
        </Grid>
        <Grid sx={{ display: 'flex', justifyContent: 'flex-end' }} size={4}>
          <WarioButton onClick={unselectProduct}>Cancel</WarioButton>
        </Grid>

        <Grid sx={{ display: 'flex' }} size="grow" />
      </Grid>
    </div>
  );
});
