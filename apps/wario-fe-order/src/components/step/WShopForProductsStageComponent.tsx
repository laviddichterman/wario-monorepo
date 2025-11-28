import { enqueueSnackbar } from 'notistack';
import React, { useCallback, useEffect, useState } from 'react';

import ExpandMore from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { type BoxProps } from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { CreateWCPProduct, type WProduct } from '@wcp/wario-shared';
import { scrollToElementOffsetAfterDelay, scrollToIdOffsetAfterDelay } from '@wcp/wario-ux-shared/common';
import { useProductInstanceById, useValueFromCategoryById } from '@wcp/wario-ux-shared/query';
import {
  SelectCatalogSelectors,
  SelectPopulatedSubcategoryIdsInCategory, SelectProductInstanceIdsInCategory
} from '@wcp/wario-ux-shared/redux';

import {
  SelectProductInstanceHasSelectableModifiersByProductInstanceId,
  SelectProductMetadataFromProductInstanceIdWithCurrentFulfillmentData
} from '@/app/selectors';
import { SelectServiceDateTime } from '@/app/slices/WFulfillmentSlice';
import { setTimeToFirstProductIfUnset } from '@/app/slices/WMetricsSlice';
import { useAppDispatch, useAppSelector } from '@/app/useHooks';
import { useMenuNameFromCategory } from '@/hooks';
import { findDuplicateInCart, selectCart, useCartStore, useCustomizerStore } from '@/stores';

import { ClickableProductDisplay } from '../WProductComponent';

import { type WShopForProductsStageProps } from './WShopForProductsStageContainer';

export interface ShopClickableProductDisplayProps {
  productInstanceId: string;
  returnToId: string;
  sourceCategoryId: string;
  setScrollToOnReturn: (value: React.SetStateAction<string>) => void
}


function ShopClickableProductDisplay({ productInstanceId, returnToId, sourceCategoryId, setScrollToOnReturn, ...props }: ShopClickableProductDisplayProps & BoxProps) {
  const dispatch = useAppDispatch();
  const productEntrySelector = useAppSelector(s => SelectCatalogSelectors(s.ws).productEntry);
  const modiferEntrySelector = useAppSelector(s => SelectCatalogSelectors(s.ws).modifierEntry);
  const cart = useCartStore(selectCart);
  const { addToCart, updateCartQuantity } = useCartStore();
  const customizeProduct = useCustomizerStore((s) => s.customizeProduct);
  const productInstance = useProductInstanceById(productInstanceId);
  const productMetadata = useAppSelector(s => SelectProductMetadataFromProductInstanceIdWithCurrentFulfillmentData(s, productInstanceId));
  const productHasSelectableModifiers = useAppSelector(s => SelectProductInstanceHasSelectableModifiersByProductInstanceId(s, productInstanceId));
  const onProductSelection = useCallback(() => {
    // either dispatch to the customizer or to the cart
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (productInstance && productMetadata) {
      const productCopy: WProduct = { p: CreateWCPProduct(productInstance.productId, productInstance.modifiers), m: structuredClone(productMetadata) };
      if ((!productCopy.m.incomplete && productInstance.displayFlags.order.skip_customization) || !productHasSelectableModifiers) {
        const matchInCart = findDuplicateInCart(cart, modiferEntrySelector, productEntrySelector, sourceCategoryId, productCopy.p);
        if (matchInCart !== null) {
          enqueueSnackbar(`Changed ${productCopy.m.name} quantity to ${(matchInCart.quantity + 1).toString()}.`, { variant: 'success' });
          updateCartQuantity(matchInCart.id, matchInCart.quantity + 1);
        }
        else {
          // it's a new entry!
          enqueueSnackbar(`Added ${productCopy.m.name} to order.`, { variant: 'success', autoHideDuration: 3000, disableWindowBlurListener: true });
          dispatch(setTimeToFirstProductIfUnset(Date.now()));
          addToCart(sourceCategoryId, productCopy);
        }
      }
      else {
        // add to the customizer
        customizeProduct(productCopy, sourceCategoryId);
        scrollToIdOffsetAfterDelay('WARIO_order', 0);
      }
      setScrollToOnReturn(returnToId);
    }
  }, [cart, dispatch, productEntrySelector, modiferEntrySelector, productInstance, productMetadata, productHasSelectableModifiers, sourceCategoryId, returnToId, setScrollToOnReturn, addToCart, updateCartQuantity, customizeProduct]);

  return <ClickableProductDisplay
    {...props}
    onClick={onProductSelection}
    productMetadata={productMetadata}
    allowAdornment
    description
    dots
    price
    displayContext="order"
  />
}

interface AccordionSubCategoryProps {
  activePanel: number;
  isExpanded: boolean;
  toggleAccordion: (event: React.SyntheticEvent, i: number) => void,
  index: number;
}

function AccordionSubCategory({ categoryId, activePanel, isExpanded, toggleAccordion, index, setScrollToOnReturn }: WShopForProductsStageProps & AccordionSubCategoryProps) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const selectedService = useAppSelector(s => s.fulfillment.selectedService!);
  const serviceDateTime = useAppSelector(s => SelectServiceDateTime(s.fulfillment));
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const productInstancesIdsInCategory = useAppSelector(s => SelectProductInstanceIdsInCategory(s.ws.categories, s.ws.products, s.ws.productInstances, s.ws.modifierOptions, categoryId, 'Order', serviceDateTime!, selectedService));
  const menuName = useMenuNameFromCategory(categoryId);
  const subtitle = useValueFromCategoryById(categoryId, 'subheading');
  return (
    <Accordion id={`accordion-${categoryId}`} key={index} expanded={activePanel === index && isExpanded} onChange={(e) => { toggleAccordion(e, index); }} >
      <AccordionSummary expandIcon={activePanel === index && isExpanded ? <ExpandMore /> : <ExpandMore />}>
        <Typography variant='h5' sx={{ ml: 4 }}><span dangerouslySetInnerHTML={{ __html: menuName }} /></Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container>
          {subtitle &&
            <Grid size={12}>
              <Typography variant='body1' dangerouslySetInnerHTML={{ __html: subtitle }}></Typography>
            </Grid>}
          {productInstancesIdsInCategory.map((pIId: string, j: number) =>
            <Grid sx={{ pt: 2.5, pb: 1, px: 0.25 }} key={j} size={12}>
              <ShopClickableProductDisplay
                returnToId={`accordion-${categoryId}`}
                setScrollToOnReturn={setScrollToOnReturn}
                sourceCategoryId={categoryId}
                productInstanceId={pIId}
              />
            </Grid>)}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

export function WShopForProductsStage({ categoryId, setScrollToOnReturn }: WShopForProductsStageProps) {
  // TODO: we need to handle if this is null by choice. how to we bypass this stage?
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const selectedService = useAppSelector(s => s.fulfillment.selectedService!);
  const serviceDateTime = useAppSelector(s => SelectServiceDateTime(s.fulfillment));
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const populatedSubcategories = useAppSelector(s => SelectPopulatedSubcategoryIdsInCategory(s.ws.categories, s.ws.products, s.ws.productInstances, s.ws.modifierOptions, categoryId, 'Order', serviceDateTime!, selectedService));
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const productInstancesIdsInCategory = useAppSelector(s => SelectProductInstanceIdsInCategory(s.ws.categories, s.ws.products, s.ws.productInstances, s.ws.modifierOptions, categoryId, 'Order', serviceDateTime!, selectedService));
  const [activePanel, setActivePanel] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // reinitialize the accordion if the expanded is still in range 
  useEffect(() => {
    if (activePanel >= populatedSubcategories.length) {
      setActivePanel(0);
    }
  }, [populatedSubcategories, activePanel]);

  const toggleAccordion = useCallback((event: React.SyntheticEvent, i: number) => {
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
  }, [activePanel, isExpanded]);

  return (
    <Grid container>
      {productInstancesIdsInCategory.map((pIId: string, i: number) =>
        <Grid
          key={i}
          size={{
            xs: 12,
            md: 6,
            lg: 4,
            xl: 3
          }}>
          <ShopClickableProductDisplay
            sx={{ mb: 3.75, mx: 2 }}
            returnToId={'WARIO_order'}
            setScrollToOnReturn={setScrollToOnReturn}
            sourceCategoryId={categoryId}
            productInstanceId={pIId}
          />
        </Grid>)}
      {populatedSubcategories.map((catId, i) =>
        <AccordionSubCategory
          key={i}
          categoryId={catId}
          setScrollToOnReturn={setScrollToOnReturn}
          activePanel={activePanel}
          index={i}
          isExpanded={isExpanded}
          toggleAccordion={toggleAccordion} />
      )}
    </Grid>
  );
}