import React, { useState, useEffect, useCallback } from 'react';
import { ProductDisplay } from './WProductComponent';
import { WModifiersComponent } from './WModifiersComponent';
import { useAppDispatch, useAppSelector } from "../app/useHooks";
import { Box, Tab, Typography, Accordion, AccordionSummary, AccordionDetails, type TypographyProps } from '@mui/material';
import { TabList, TabPanel, TabContext } from '@mui/lab'
import { WDateUtils, CategoryDisplay } from '@wcp/wario-shared';
import { GetNextAvailableServiceDateTimeForMenu, type RootState, SelectMenuCategoryId, SelectMenuFooterFromCategoryById, SelectMenuNameFromCategoryById, SelectMenuNestingFromCategoryById, SelectMenuSubtitleFromCategoryById } from '../app/store';
import { getProductInstanceById, LoadingScreen, type ProductCategoryFilter, scrollToElementOffsetAfterDelay, SelectDefaultFulfillmentId, SelectParentProductEntryFromProductInstanceId, SelectPopulatedSubcategoryIdsInCategory, SelectProductInstanceIdsInCategory, SelectProductMetadata, Separator } from '@wcp/wario-ux-shared';

import { ExpandMore } from '@mui/icons-material';
import { createSelector } from '@reduxjs/toolkit';
import { setService } from '../app/slices/WFulfillmentSlice';
import { WMenuDataGrid } from './WMenuTableComponent';

export const SelectProductMetadataForMenu = createSelector(
  (s: RootState, productInstanceId: string) => getProductInstanceById(s.ws.productInstances, productInstanceId),
  (s: RootState, _: string) => WDateUtils.ComputeServiceDateTime(GetNextAvailableServiceDateTimeForMenu(s)),
  (s: RootState, _: string) => SelectDefaultFulfillmentId(s),
  (s: RootState, _: string) => s.ws,
  (_s: RootState, productInstanceId: string) => productInstanceId,
  (productInstance, service_time, fulfillmentId, socketState, _productInstanceId) => {
    return SelectProductMetadata(socketState, productInstance.productId, productInstance.modifiers, service_time, fulfillmentId);
  }
)

export const SelectPopulatedSubcategoryIdsInCategoryForNextAvailableTime = createSelector(
  (s: RootState, _categoryId: string, _filter: ProductCategoryFilter) => s,
  (_s: RootState, categoryId: string, _filter: ProductCategoryFilter) => categoryId,
  (_s: RootState, _categoryId: string, filter: ProductCategoryFilter) => filter,
  (s: RootState, _categoryId: string, _filter: ProductCategoryFilter) => SelectDefaultFulfillmentId(s),
  (s: RootState, _: string, _filter: ProductCategoryFilter) => WDateUtils.ComputeServiceDateTime(GetNextAvailableServiceDateTimeForMenu(s)),
  (s, categoryId, filter, fulfillmentId, nextAvailableTime) => {
    return SelectPopulatedSubcategoryIdsInCategory(s.ws.categories, s.ws.products, s.ws.productInstances, s.ws.modifierOptions, categoryId, filter, nextAvailableTime, fulfillmentId);
  }
);

export const SelectProductInstanceIdsInCategoryForNextAvailableTime = createSelector(
  (s: RootState, _categoryId: string, _filter: ProductCategoryFilter) => s,
  (_s: RootState, categoryId: string, _filter: ProductCategoryFilter) => categoryId,
  (_s: RootState, _categoryId: string, filter: ProductCategoryFilter) => filter,
  (s: RootState, _categoryId: string, _filter: ProductCategoryFilter) => SelectDefaultFulfillmentId(s),
  (s: RootState, _: string, _filter: ProductCategoryFilter) => WDateUtils.ComputeServiceDateTime(GetNextAvailableServiceDateTimeForMenu(s)),
  (s, categoryId, filter, fulfillmentId, nextAvailableTime) => {
    return SelectProductInstanceIdsInCategory(s.ws.categories, s.ws.products, s.ws.productInstances, s.ws.modifierOptions, categoryId, filter, nextAvailableTime, fulfillmentId);
  }
);


interface WMenuDisplayProps { categoryId: string; };


function MenuNameTypography({ categoryId, ...props }: WMenuDisplayProps & TypographyProps) {
  const menuName = useAppSelector(s => SelectMenuNameFromCategoryById(s.ws.categories, categoryId));
  return <Typography {...props} dangerouslySetInnerHTML={{ __html: menuName }} />
}

function WMenuProductInstanceDisplay({ productInstanceId }: { productInstanceId: string; }) {
  const product = useAppSelector(s => getProductInstanceById(s.ws.productInstances, productInstanceId));
  const productClass = useAppSelector(s => SelectParentProductEntryFromProductInstanceId(s.ws, productInstanceId));
  const productMetadata = useAppSelector(s => SelectProductMetadataForMenu(s, productInstanceId));

  return productClass ?
    <Box sx={{ pt: 4 }}>
      <ProductDisplay
        description
        allowAdornment
        dots
        displayContext="menu"
        price
        productMetadata={productMetadata}
      />
      {product.displayFlags.menu.show_modifier_options && productClass.product.modifiers.length &&
        <WModifiersComponent productInstanceId={productInstanceId} />}
    </Box> : <></>
}

function WMenuSection({ categoryId }: WMenuDisplayProps) {
  const subtitle = useAppSelector(s => SelectMenuSubtitleFromCategoryById(s.ws.categories, categoryId));
  const footnotes = useAppSelector(s => SelectMenuFooterFromCategoryById(s.ws.categories, categoryId));
  const productsInstanceIds = useAppSelector(s => SelectProductInstanceIdsInCategoryForNextAvailableTime(s, categoryId, 'Menu'));
  return (
    // TODO: need to fix the location of the menu subtitle
    <Box sx={{ pt: 0 }}>
      {subtitle !== null &&
        <Typography variant="h6" dangerouslySetInnerHTML={{ __html: subtitle }} />
      }
      {productsInstanceIds.map((pIId, k) => <WMenuProductInstanceDisplay productInstanceId={pIId} key={k} />)}
      {footnotes && (
        <small>
          <span dangerouslySetInnerHTML={{ __html: footnotes }} />
        </small>
      )}
    </Box>
  );
};

let WMenuRecursive: ({ categoryId }: WMenuDisplayProps) => React.JSX.Element;

function WMenuAccordion({ categoryId }: WMenuDisplayProps) {
  const hasProductsToDisplay = useAppSelector(s => SelectProductInstanceIdsInCategoryForNextAvailableTime(s, categoryId, 'Menu').length > 0);
  const populatedSubcategories = useAppSelector(s => SelectPopulatedSubcategoryIdsInCategoryForNextAvailableTime(s, categoryId, 'Menu'));
  const [activePanel, setActivePanel] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const toggleAccordion = useCallback((event: React.SyntheticEvent<Element, Event>, i: number) => {
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
    <Box>
      {hasProductsToDisplay && (
        <WMenuSection categoryId={categoryId} />
      )}
      {populatedSubcategories.map((subSection, i) => {
        return (
          <Box sx={{ pt: 1 }} key={i}>
            <Accordion expanded={isExpanded && activePanel === i} onChange={(e, _) => toggleAccordion(e, i)}  >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <MenuNameTypography variant='h4' sx={{ ml: 2, py: 2 }} categoryId={subSection} />
              </AccordionSummary>
              <AccordionDetails>
                <WMenuRecursive categoryId={subSection} />
              </AccordionDetails>
            </Accordion>
          </Box>);
      }
      )}
    </Box>);
}


function WMenuTabbed({ categoryId }: WMenuDisplayProps) {
  const populatedSubcategories = useAppSelector(s => SelectPopulatedSubcategoryIdsInCategoryForNextAvailableTime(s, categoryId, 'Menu'));
  const hasProductsToDisplay = useAppSelector(s => SelectProductInstanceIdsInCategoryForNextAvailableTime(s, categoryId, 'Menu').length > 0);
  const menuName = useAppSelector(s => SelectMenuNameFromCategoryById(s.ws.categories, categoryId));
  const [active, setActive] = useState<string>(populatedSubcategories[0]);
  return (
    <Box>
      {hasProductsToDisplay && (
        <WMenuSection categoryId={categoryId} />
      )}
      <TabContext value={active}>
        <Box sx={{
          padding: "10px 0px 0px 0",
          border: '0px solid rgba(81, 81, 80, 0.67)',
          borderBottom: 1,
          color: "#515150",
        }}>
          <TabList
            TabIndicatorProps={{ hidden: true }}
            scrollButtons={false}
            centered
            onChange={(_, v) => setActive(v)}
            aria-label={`${menuName} tab navigation`}
          >
            {populatedSubcategories.map((section, i) => (
              <Tab sx={[
                {
                  '&.Mui-selected': {
                    color: "white",
                  },
                },
                {
                  '&:hover': {
                    color: "white",
                    backgroundColor: "#c59d5f"
                  },
                }, {
                  fontFamily: 'Cabin',
                  color: "#fff",
                  backgroundColor: "#252525",
                  mx: 0.5,
                  my: .5,
                  transition: 'all .15s',
                  padding: "6px 5px",
                  fontSize: "12px",
                  letterSpacing: '.15em',
                  borderRadius: '3px',
                  fontWeight: 400,
                  textSizeAdjust: "100%"
                }]} wrapped key={i} label={<MenuNameTypography variant='h6' categoryId={section} sx={{ fontWeight: 400, fontSize: "12px", color: '#fff' }} />} value={section} />
            ))}
          </TabList>
        </Box>
        {populatedSubcategories.map((subSection) => {
          return (
            <TabPanel sx={{ p: 0 }} key={subSection} value={subSection}>
              <WMenuRecursive categoryId={subSection} />
            </TabPanel>);
        }
        )}
      </TabContext>
    </Box>);
}

function WMenuFlat({ categoryId }: WMenuDisplayProps) {
  const populatedSubcategories = useAppSelector(s => SelectPopulatedSubcategoryIdsInCategoryForNextAvailableTime(s, categoryId, 'Menu'));
  return (
    <Box>
      {populatedSubcategories.map((subSection) => (
        <Box key={subSection} sx={{ pt: 4 }}>
          <MenuNameTypography variant="h4" sx={{ ml: 2 }} categoryId={subSection} />
          <Separator />
          <WMenuRecursive categoryId={subSection} />
        </Box>)
      )}
      <WMenuSection categoryId={categoryId} />
    </Box>);
}

WMenuRecursive = ({ categoryId }: WMenuDisplayProps) => {
  const nesting = useAppSelector(s => SelectMenuNestingFromCategoryById(s.ws.categories, categoryId));
  const hasPopulatedSubcategories = useAppSelector(s => SelectPopulatedSubcategoryIdsInCategoryForNextAvailableTime(s, categoryId, 'Menu').length > 0);
  switch (nesting) {
    case CategoryDisplay.TAB:
      return hasPopulatedSubcategories ? <WMenuTabbed categoryId={categoryId} /> : <WMenuFlat categoryId={categoryId} />;
    case CategoryDisplay.ACCORDION:
      return hasPopulatedSubcategories ? <WMenuAccordion categoryId={categoryId} /> : <WMenuFlat categoryId={categoryId} />;
    case CategoryDisplay.TABLE:
      // expected catalog structure:
      // either 0 child categories and many contained products OR no contained products to many child categories
      // child categories have no child categories
      // metadata fields used to populate columns
      // description used to 
      return <WMenuDataGrid categoryId={categoryId} />;
    case CategoryDisplay.FLAT:
    default:
      return <WMenuFlat categoryId={categoryId} />;
  }
}

export default function WMenuComponent() {
  const dispatch = useAppDispatch();

  const FulfillmentId = useAppSelector(SelectDefaultFulfillmentId);
  // const currentTime = useAppSelector(s=>WDateUtils.ComputeServiceDateTime(GetNextAvailableServiceDateTimeForMenu(s)));
  // NOTE THIS WILL BE NULL UNTIL WE ASSIGN A FULFILLMENT
  const MENU_CATID = useAppSelector(SelectMenuCategoryId);
  useEffect(() => {
    dispatch(setService(FulfillmentId));
  }, [dispatch, FulfillmentId]);

  if (!MENU_CATID) {
    return <LoadingScreen />;
  }
  // console.log(`${WDateUtils.formatISODate(currentTime)} ${WDateUtils.MinutesToPrintTime(WDateUtils.ComputeFulfillmentTime(currentTime).selectedTime)}`);
  return (<WMenuRecursive categoryId={MENU_CATID} />);
}