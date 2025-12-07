import React, { useCallback, useState } from 'react';

import ExpandMore from '@mui/icons-material/ExpandMore';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Typography, { type TypographyProps } from '@mui/material/Typography';

import { CategoryDisplay, type IProductInstanceDto } from '@wcp/wario-shared';
import { scrollToElementOffsetAfterDelay } from '@wcp/wario-ux-shared/common';
import { LoadingScreen } from '@wcp/wario-ux-shared/components';
import {
  useCategoryNameFromCategoryById,
  useProductEntryById,
  useProductInstanceById,
  useValueFromCategoryById,
} from '@wcp/wario-ux-shared/query';
import { Separator } from '@wcp/wario-ux-shared/styled';

import {
  useMenuCategoryId,
  usePopulatedSubcategoryIdsInCategoryForNextAvailableTime,
  useProductInstanceIdsInCategoryForNextAvailableTime,
  useProductMetadataForMenu,
} from '@/hooks/useQuery';

import { WMenuDataGrid } from './WMenuTableComponent';
import { WModifiersComponent } from './WModifiersComponent';
import { ProductDisplay } from './WProductComponent';

interface WMenuDisplayProps {
  categoryId: string;
}

function MenuNameTypography({ categoryId, ...props }: WMenuDisplayProps & TypographyProps) {
  const menuName = useCategoryNameFromCategoryById(categoryId);
  return <Typography {...props} dangerouslySetInnerHTML={{ __html: menuName }} />;
}

function WMenuProductInstanceDisplay({ productInstanceId }: { productInstanceId: string }) {
  const product = useProductInstanceById(productInstanceId) as IProductInstanceDto;
  const productClass = useProductEntryById(product.productId);
  const productMetadata = useProductMetadataForMenu(productInstanceId);

  return productClass && productMetadata ? (
    <Box sx={{ pt: 4 }}>
      <ProductDisplay description allowAdornment dots displayContext="menu" price productMetadata={productMetadata} />
      {product.displayFlags.menu.show_modifier_options && productClass.product.modifiers.length && (
        <WModifiersComponent productInstanceId={productInstanceId} />
      )}
    </Box>
  ) : (
    <></>
  );
}

function WMenuSection({ categoryId }: WMenuDisplayProps) {
  const subtitle = useValueFromCategoryById(categoryId, 'subheading');
  const footnotes = useValueFromCategoryById(categoryId, 'footnotes');
  const productsInstanceIds = useProductInstanceIdsInCategoryForNextAvailableTime(categoryId, 'Menu');
  return (
    // TODO: need to fix the location of the menu subtitle
    <Box sx={{ pt: 0 }}>
      {subtitle !== null && <Typography variant="h6" dangerouslySetInnerHTML={{ __html: subtitle }} />}
      {productsInstanceIds.map((pIId, k) => (
        <WMenuProductInstanceDisplay productInstanceId={pIId} key={k} />
      ))}
      {footnotes && (
        <small>
          <span dangerouslySetInnerHTML={{ __html: footnotes }} />
        </small>
      )}
    </Box>
  );
}

// eslint-disable-next-line prefer-const
let WMenuRecursive: ({ categoryId }: WMenuDisplayProps) => React.JSX.Element;

function WMenuAccordion({ categoryId }: WMenuDisplayProps) {
  const productsToDisplay = useProductInstanceIdsInCategoryForNextAvailableTime(categoryId, 'Menu');
  const populatedSubcategories = usePopulatedSubcategoryIdsInCategoryForNextAvailableTime(categoryId, 'Menu');
  const [activePanel, setActivePanel] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
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
  const hasProductsToDisplay = productsToDisplay.length > 0;
  return (
    <Box>
      {hasProductsToDisplay && <WMenuSection categoryId={categoryId} />}
      {populatedSubcategories.map((subSection, i) => {
        return (
          <Box sx={{ pt: 1 }} key={i}>
            <Accordion
              expanded={isExpanded && activePanel === i}
              onChange={(e, _) => {
                toggleAccordion(e, i);
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <MenuNameTypography variant="h4" sx={{ ml: 2, py: 2 }} categoryId={subSection} />
              </AccordionSummary>
              <AccordionDetails>
                <WMenuRecursive categoryId={subSection} />
              </AccordionDetails>
            </Accordion>
          </Box>
        );
      })}
    </Box>
  );
}

function WMenuTabbed({ categoryId }: WMenuDisplayProps) {
  const populatedSubcategories = usePopulatedSubcategoryIdsInCategoryForNextAvailableTime(categoryId, 'Menu');
  const productsToDisplay = useProductInstanceIdsInCategoryForNextAvailableTime(categoryId, 'Menu');
  const hasProductsToDisplay = productsToDisplay.length > 0;

  const menuName = useCategoryNameFromCategoryById(categoryId);
  const [active, setActive] = useState<string>(populatedSubcategories[0]);
  return (
    <Box>
      {hasProductsToDisplay && <WMenuSection categoryId={categoryId} />}
      <TabContext value={active}>
        <Box
          sx={{
            padding: '10px 0px 0px 0',
            border: '0px solid rgba(81, 81, 80, 0.67)',
            borderBottom: 1,
            color: '#515150',
          }}
        >
          <TabList
            slotProps={{ indicator: { hidden: true } }}
            scrollButtons={false}
            centered
            onChange={(_, v: string) => {
              setActive(v);
            }}
            aria-label={`${menuName} tab navigation`}
          >
            {populatedSubcategories.map((section, i) => (
              <Tab
                sx={[
                  {
                    '&.Mui-selected': {
                      color: 'white',
                    },
                  },
                  {
                    '&:hover': {
                      color: 'white',
                      backgroundColor: '#c59d5f',
                    },
                  },
                  {
                    fontFamily: 'Cabin',
                    color: '#fff',
                    backgroundColor: '#252525',
                    mx: 0.5,
                    my: 0.5,
                    transition: 'all .15s',
                    padding: '6px 5px',
                    fontSize: '12px',
                    letterSpacing: '.15em',
                    borderRadius: '3px',
                    fontWeight: 400,
                    textSizeAdjust: '100%',
                  },
                ]}
                wrapped
                key={i}
                label={
                  <MenuNameTypography
                    variant="h6"
                    categoryId={section}
                    sx={{ fontWeight: 400, fontSize: '12px', color: '#fff' }}
                  />
                }
                value={section}
              />
            ))}
          </TabList>
        </Box>
        {populatedSubcategories.map((subSection) => {
          return (
            <TabPanel sx={{ p: 0 }} key={subSection} value={subSection}>
              <WMenuRecursive categoryId={subSection} />
            </TabPanel>
          );
        })}
      </TabContext>
    </Box>
  );
}

function WMenuFlat({ categoryId }: WMenuDisplayProps) {
  const populatedSubcategories = usePopulatedSubcategoryIdsInCategoryForNextAvailableTime(categoryId, 'Menu');
  return (
    <Box>
      {populatedSubcategories.map((subSection) => (
        <Box key={subSection} sx={{ pt: 4 }}>
          <MenuNameTypography variant="h4" sx={{ ml: 2 }} categoryId={subSection} />
          <Separator />
          <WMenuRecursive categoryId={subSection} />
        </Box>
      ))}
      <WMenuSection categoryId={categoryId} />
    </Box>
  );
}

WMenuRecursive = ({ categoryId }: WMenuDisplayProps) => {
  const nesting = useValueFromCategoryById(categoryId, 'display_flags')?.nesting || CategoryDisplay.FLAT;
  const populatedSubcategories = usePopulatedSubcategoryIdsInCategoryForNextAvailableTime(categoryId, 'Menu');

  const hasPopulatedSubcategories = populatedSubcategories.length > 0;
  switch (nesting) {
    case CategoryDisplay.TAB:
      return hasPopulatedSubcategories ? (
        <WMenuTabbed categoryId={categoryId} />
      ) : (
        <WMenuFlat categoryId={categoryId} />
      );
    case CategoryDisplay.ACCORDION:
      return hasPopulatedSubcategories ? (
        <WMenuAccordion categoryId={categoryId} />
      ) : (
        <WMenuFlat categoryId={categoryId} />
      );
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
};

export default function WMenuComponent() {
  const MENU_DATA = useMenuCategoryId();

  if (!MENU_DATA) {
    return <LoadingScreen />;
  }
  // console.log(`${WDateUtils.formatISODate(currentTime)} ${WDateUtils.MinutesToPrintTime(WDateUtils.ComputeFulfillmentTime(currentTime).selectedTime)}`);
  return <WMenuRecursive categoryId={MENU_DATA} />;
}
