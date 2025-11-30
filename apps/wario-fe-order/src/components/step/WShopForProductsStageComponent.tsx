import { enqueueSnackbar } from 'notistack';
import React, { useCallback, useEffect, useState } from 'react';

import ExpandMore from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { type BoxProps } from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { CreateWCPProduct, type ICatalogSelectors, type WProduct } from '@wcp/wario-shared';
import { scrollToElementOffsetAfterDelay, scrollToIdOffsetAfterDelay } from '@wcp/wario-ux-shared/common';
import { useCatalogSelectors, useCategoryNameFromCategoryById, usePopulatedSubcategoryIdsInCategory, useProductInstanceById, useProductInstancesInCategory, useValueFromCategoryById } from '@wcp/wario-ux-shared/query';

import { useProductHasSelectableModifiersByProductInstanceId, useProductMetadataFromProductInstanceIdWithCurrentFulfillmentData } from '@/hooks/useDerivedState';

import { setTimeToFirstProductIfUnset } from '@/app/slices/WMetricsSlice';
import { findDuplicateInCart, selectCart, useCartStore } from '@/stores/useCartStore';
import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { selectSelectedService, selectServiceDateTime, useFulfillmentStore } from '@/stores/useFulfillmentStore';

import { ClickableProductDisplay } from '../WProductComponent';

import { type WShopForProductsStageProps } from './WShopForProductsStageContainer';

export interface ShopClickableProductDisplayProps {
  productInstanceId: string;
  returnToId: string;
  sourceCategoryId: string;
  setScrollToOnReturn: (value: React.SetStateAction<string>) => void
}


function ShopClickableProductDisplay({ productInstanceId, returnToId, sourceCategoryId, setScrollToOnReturn, ...props }: ShopClickableProductDisplayProps & BoxProps) {
  const { productEntry: productEntrySelector, modifierEntry: modiferEntrySelector } = useCatalogSelectors() as ICatalogSelectors;
  const cart = useCartStore(selectCart);
  const { addToCart, updateCartQuantity } = useCartStore();
  const customizeProduct = useCustomizerStore((s) => s.customizeProduct);
  const productInstance = useProductInstanceById(productInstanceId);
  const productMetadata = useProductMetadataFromProductInstanceIdWithCurrentFulfillmentData(productInstanceId);
  const productHasSelectableModifiers = useProductHasSelectableModifiersByProductInstanceId(productInstanceId);
  const onProductSelection = useCallback(() => {
    // either dispatch to the customizer or to the cart

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
          setTimeToFirstProductIfUnset(Date.now());
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
  }, [cart, productEntrySelector, modiferEntrySelector, productInstance, productMetadata, productHasSelectableModifiers, sourceCategoryId, returnToId, setScrollToOnReturn, addToCart, updateCartQuantity, customizeProduct]);

  return productMetadata && <ClickableProductDisplay
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

  const selectedService = useFulfillmentStore(selectSelectedService) as string;
  const serviceDateTime = useFulfillmentStore(selectServiceDateTime) as Date;
  const productInstancesIdsInCategory = useProductInstancesInCategory(categoryId, 'Order', serviceDateTime, selectedService);
  const menuName = useCategoryNameFromCategoryById(categoryId);
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
  const selectedService = useFulfillmentStore(selectSelectedService) as string;
  const serviceDateTime = useFulfillmentStore(selectServiceDateTime) as Date;
  const populatedSubcategories = usePopulatedSubcategoryIdsInCategory(categoryId, 'Order', serviceDateTime, selectedService);
  const productInstancesIdsInCategory = useProductInstancesInCategory(categoryId, 'Order', serviceDateTime, selectedService);
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