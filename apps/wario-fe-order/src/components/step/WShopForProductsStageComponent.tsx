import { enqueueSnackbar } from 'notistack';
import React, { type JSX, useCallback, useEffect, useMemo, useState } from 'react';

import ExpandMore from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { type BoxProps } from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import {
  CreateWCPProduct,
  type ICatalogSelectors,
  ShowCurrentlyAvailableProducts,
  type WProduct,
} from '@wcp/wario-shared';
import { scrollToElementOffsetAfterDelay, scrollToIdOffsetAfterDelay } from '@wcp/wario-ux-shared/common';
import {
  createCategoryShopper,
  type ProductDisplayBaseProps,
  useCatalogSelectors,
  useCategoryNameFromCategoryById,
  useValueFromCategoryById,
  useVisibleProductsInCategory,
} from '@wcp/wario-ux-shared/query';

import { useProductHasSelectableModifiersByProductInstanceId } from '@/hooks/useDerivedState';

import { findDuplicateInCart, selectCart, useCartStore } from '@/stores/useCartStore';
import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { selectSelectedService, selectServiceDateTime, useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { useMetricsStore } from '@/stores/useMetricsStore';

import { ClickableProductDisplay } from '../WProductComponent';

export interface WShopForProductsStageProps {
  categoryId: string;
  setScrollToOnReturn: (value: React.SetStateAction<string>) => void;
}

/**
 * Extra props needed by ShopClickableProductDisplay beyond the base props
 */
interface ShopClickableExtraProps {
  returnToId: string;
  sourceCategoryId: string;
  setScrollToOnReturn: (value: React.SetStateAction<string>) => void;
}

/**
 * Full props for ShopClickableProductDisplay
 */
type ShopClickableProductDisplayProps = ProductDisplayBaseProps & ShopClickableExtraProps & BoxProps;

/**
 * Product display component that handles click-to-add-to-cart or customize logic
 */
function ShopClickableProductDisplay({
  product,
  productInstance,
  metadata,
  returnToId,
  sourceCategoryId,
  setScrollToOnReturn,
  ...props
}: ShopClickableProductDisplayProps) {
  const { productEntry: productEntrySelector, modifierEntry: modiferEntrySelector } =
    useCatalogSelectors() as ICatalogSelectors;
  const cart = useCartStore(selectCart);
  const { setTimeToFirstProductIfUnset } = useMetricsStore();

  const { addToCart, updateCartQuantity } = useCartStore();
  const customizeProduct = useCustomizerStore((s) => s.customizeProduct);
  const productHasSelectableModifiers = useProductHasSelectableModifiersByProductInstanceId(
    product.id,
    productInstance.id,
  );

  const onProductSelection = useCallback(() => {
    const productCopy: WProduct = {
      p: CreateWCPProduct(product.id, productInstance.modifiers),
      m: structuredClone(metadata),
    };
    if (
      (!productCopy.m.incomplete && productInstance.displayFlags.order.skip_customization) ||
      !productHasSelectableModifiers
    ) {
      const matchInCart = findDuplicateInCart(
        cart,
        modiferEntrySelector,
        productEntrySelector,
        sourceCategoryId,
        productCopy.p,
      );
      if (matchInCart !== null) {
        enqueueSnackbar(`Changed ${productCopy.m.name} quantity to ${(matchInCart.quantity + 1).toString()}.`, {
          variant: 'success',
        });
        updateCartQuantity(matchInCart.id, matchInCart.quantity + 1);
      } else {
        enqueueSnackbar(`Added ${productCopy.m.name} to order.`, {
          variant: 'success',
          autoHideDuration: 3000,
          disableWindowBlurListener: true,
        });
        setTimeToFirstProductIfUnset(Date.now());
        addToCart(sourceCategoryId, productCopy);
      }
    } else {
      customizeProduct(productCopy, sourceCategoryId);
      scrollToIdOffsetAfterDelay('WARIO_order', 0);
    }
    setScrollToOnReturn(returnToId);
  }, [
    productInstance,
    product.id,
    metadata,
    productHasSelectableModifiers,
    setScrollToOnReturn,
    returnToId,
    cart,
    modiferEntrySelector,
    productEntrySelector,
    sourceCategoryId,
    updateCartQuantity,
    setTimeToFirstProductIfUnset,
    addToCart,
    customizeProduct,
  ]);

  return (
    <ClickableProductDisplay
      {...props}
      onClick={onProductSelection}
      productMetadata={metadata}
      allowAdornment
      description
      dots
      price
      displayContext="order"
    />
  );
}

/**
 * Create the CategoryShopper component with ShopClickableProductDisplay
 */
const ShopCategoryShopper = createCategoryShopper<ShopClickableExtraProps & BoxProps>(
  ShopClickableProductDisplay,
  'order',
  ShowCurrentlyAvailableProducts,
);

interface AccordionSubCategoryProps {
  fulfillmentId: string;
  orderTime: Date;
  activePanel: number;
  isExpanded: boolean;
  toggleAccordion: (event: React.SyntheticEvent, i: number) => void;
  index: number;
}

function AccordionSubCategory({
  categoryId,
  fulfillmentId,
  orderTime,
  activePanel,
  isExpanded,
  toggleAccordion,
  index,
  setScrollToOnReturn,
}: WShopForProductsStageProps & AccordionSubCategoryProps) {
  const menuName = useCategoryNameFromCategoryById(categoryId);
  const subtitle = useValueFromCategoryById(categoryId, 'subheading');
  const visibleProducts = useVisibleProductsInCategory(
    categoryId,
    fulfillmentId,
    orderTime,
    'order',
    ShowCurrentlyAvailableProducts,
  );

  // Don't render accordion if no visible products
  if (visibleProducts.length === 0) return null;

  return (
    <Accordion
      id={`accordion-${categoryId}`}
      key={index}
      expanded={activePanel === index && isExpanded}
      onChange={(e) => {
        toggleAccordion(e, index);
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="h5" sx={{ ml: 4 }}>
          <span dangerouslySetInnerHTML={{ __html: menuName }} />
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container>
          {subtitle && (
            <Grid size={12}>
              <Typography variant="body1" dangerouslySetInnerHTML={{ __html: subtitle }}></Typography>
            </Grid>
          )}
          <ShopCategoryShopper
            categoryId={categoryId}
            fulfillmentId={fulfillmentId}
            orderTime={orderTime}
            returnToId="WARIO_order"
            sourceCategoryId={categoryId}
            setScrollToOnReturn={setScrollToOnReturn}
            sx={{ mb: 3.75, mx: 2 }}
          />
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

export function WShopForProductsStage({ categoryId, setScrollToOnReturn }: WShopForProductsStageProps) {
  const fulfillmentId = useFulfillmentStore(selectSelectedService) as string;
  const orderTime = useFulfillmentStore(selectServiceDateTime) as Date;
  const subcategoryIds = useValueFromCategoryById(categoryId, 'children');
  const [activePanel, setActivePanel] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // Check if main category has visible products
  const toggleAccordion = useCallback(
    (event: React.SyntheticEvent, i: number) => {
      event.preventDefault();
      const ref = event.currentTarget;
      if (activePanel === i) {
        if (isExpanded) {
          setIsExpanded(false);
          scrollToElementOffsetAfterDelay(ref, 200, 'center');
          return;
        }
      }
      setActivePanel(i);
      setIsExpanded(true);
      scrollToElementOffsetAfterDelay(ref, 450, 'start');
    },
    [activePanel, isExpanded],
  );

  // Build list of subcategory accordions - filtering happens inside AccordionSubCategory
  const populatedSubcategories: JSX.Element[] = useMemo(() => {
    return (
      subcategoryIds?.map((catId, i) => (
        <AccordionSubCategory
          key={catId}
          categoryId={catId}
          fulfillmentId={fulfillmentId}
          orderTime={orderTime}
          setScrollToOnReturn={setScrollToOnReturn}
          activePanel={activePanel}
          index={i}
          isExpanded={isExpanded}
          toggleAccordion={toggleAccordion}
        />
      )) || []
    );
  }, [subcategoryIds, fulfillmentId, orderTime, activePanel, isExpanded, toggleAccordion, setScrollToOnReturn]);

  // Reinitialize the accordion if expanded is out of range
  useEffect(() => {
    if (activePanel >= populatedSubcategories.length) {
      setActivePanel(0);
    }
  }, [populatedSubcategories.length, activePanel]);

  return (
    <Grid container>
      {
        <ShopCategoryShopper
          categoryId={categoryId}
          fulfillmentId={fulfillmentId}
          orderTime={orderTime}
          returnToId="WARIO_order"
          sourceCategoryId={categoryId}
          setScrollToOnReturn={setScrollToOnReturn}
          sx={{ mb: 3.75, mx: 2 }}
        />
      }
      {populatedSubcategories}
    </Grid>
  );
}
