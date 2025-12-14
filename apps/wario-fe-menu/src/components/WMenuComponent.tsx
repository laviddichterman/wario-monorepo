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

import { CategoryDisplay, ShowTemporarilyDisabledProducts, type VisibleProductItem } from '@wcp/wario-shared/logic';
import { scrollToElementOffsetAfterDelay } from '@wcp/wario-ux-shared/common';
import { LoadingScreen } from '@wcp/wario-ux-shared/components';
import {
  useCategoryNameFromCategoryById,
  useCategoryVisibility,
  useCategoryVisibilityMap,
  useDefaultFulfillmentId,
  useValueFromCategoryById,
  VisibilityMapProvider,
} from '@wcp/wario-ux-shared/query';
import { Separator } from '@wcp/wario-ux-shared/styled';

import { useCurrentTimeForDefaultFulfillment, useMenuCategoryId } from '@/hooks/useQuery';

import { WMenuDataGrid } from './WMenuTableComponent';
import { WModifiersComponent } from './WModifiersComponent';
import { ProductDisplay } from './WProductComponent';

interface WMenuDisplayProps {
  categoryId: string;
  fulfillmentId: string;
}

function MenuNameTypography({ categoryId, ...props }: WMenuDisplayProps & TypographyProps) {
  const menuName = useCategoryNameFromCategoryById(categoryId);
  return <Typography {...props} dangerouslySetInnerHTML={{ __html: menuName }} />;
}

function WMenuProductInstanceDisplay({ item, fulfillmentId }: { item: VisibleProductItem; fulfillmentId: string }) {
  return (
    <Box sx={{ pt: 4 }}>
      <ProductDisplay description allowAdornment dots displayContext="menu" price productMetadata={item.metadata} />
      {item.productInstance.displayFlags.menu.show_modifier_options && item.product.modifiers.length && (
        <WModifiersComponent item={item} fulfillmentId={fulfillmentId} />
      )}
    </Box>
  );
}

function WMenuSection({ categoryId, fulfillmentId }: WMenuDisplayProps) {
  const subtitle = useValueFromCategoryById(categoryId, 'subheading');
  const footnotes = useValueFromCategoryById(categoryId, 'footnotes');
  const { products } = useCategoryVisibility(categoryId);

  return (
    <Box sx={{ pt: 0 }}>
      {subtitle && <Typography variant="h6" dangerouslySetInnerHTML={{ __html: subtitle }} />}
      {products.map((item) => (
        <WMenuProductInstanceDisplay item={item} fulfillmentId={fulfillmentId} key={item.productInstance.id} />
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
let WMenuRecursive: ({ categoryId, fulfillmentId }: WMenuDisplayProps) => React.JSX.Element;

function WMenuAccordion({ categoryId, fulfillmentId }: WMenuDisplayProps) {
  const { products, populatedChildren: populatedSubcategories } = useCategoryVisibility(categoryId);

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
  const hasProductsToDisplay = products.length > 0;
  return (
    <Box>
      {hasProductsToDisplay && <WMenuSection categoryId={categoryId} fulfillmentId={fulfillmentId} />}
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
                <MenuNameTypography
                  variant="h4"
                  sx={{ ml: 2, py: 2 }}
                  categoryId={subSection}
                  fulfillmentId={fulfillmentId}
                />
              </AccordionSummary>
              <AccordionDetails>
                <WMenuRecursive categoryId={subSection} fulfillmentId={fulfillmentId} />
              </AccordionDetails>
            </Accordion>
          </Box>
        );
      })}
    </Box>
  );
}

function WMenuTabbed({ categoryId, fulfillmentId }: WMenuDisplayProps) {
  const { products, populatedChildren: populatedSubcategories } = useCategoryVisibility(categoryId);
  const hasProductsToDisplay = products.length > 0;

  const menuName = useCategoryNameFromCategoryById(categoryId);
  const [active, setActive] = useState<string>(populatedSubcategories[0]);
  return (
    <Box>
      {hasProductsToDisplay && <WMenuSection categoryId={categoryId} fulfillmentId={fulfillmentId} />}
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
                    fulfillmentId={fulfillmentId}
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
              <WMenuRecursive categoryId={subSection} fulfillmentId={fulfillmentId} />
            </TabPanel>
          );
        })}
      </TabContext>
    </Box>
  );
}

function WMenuFlat({ categoryId, fulfillmentId }: WMenuDisplayProps) {
  const { populatedChildren: populatedSubcategories } = useCategoryVisibility(categoryId);
  return (
    <Box>
      {populatedSubcategories.map((subSection) => (
        <Box key={subSection} sx={{ pt: 4 }}>
          <MenuNameTypography variant="h4" sx={{ ml: 2 }} categoryId={subSection} fulfillmentId={fulfillmentId} />
          <Separator />
          <WMenuRecursive categoryId={subSection} fulfillmentId={fulfillmentId} />
        </Box>
      ))}
      <WMenuSection categoryId={categoryId} fulfillmentId={fulfillmentId} />
    </Box>
  );
}

WMenuRecursive = ({ categoryId, fulfillmentId }: WMenuDisplayProps) => {
  const nesting = useValueFromCategoryById(categoryId, 'display_flags')?.nesting || CategoryDisplay.FLAT;
  const { populatedChildren: populatedSubcategories } = useCategoryVisibility(categoryId);

  const hasPopulatedSubcategories = populatedSubcategories.length > 0;
  switch (nesting) {
    case CategoryDisplay.TAB:
      return hasPopulatedSubcategories ? (
        <WMenuTabbed categoryId={categoryId} fulfillmentId={fulfillmentId} />
      ) : (
        <WMenuFlat categoryId={categoryId} fulfillmentId={fulfillmentId} />
      );
    case CategoryDisplay.ACCORDION:
      return hasPopulatedSubcategories ? (
        <WMenuAccordion categoryId={categoryId} fulfillmentId={fulfillmentId} />
      ) : (
        <WMenuFlat categoryId={categoryId} fulfillmentId={fulfillmentId} />
      );
    case CategoryDisplay.TABLE:
      return <WMenuDataGrid categoryId={categoryId} fulfillmentId={fulfillmentId} />;
    case CategoryDisplay.FLAT:
    default:
      return <WMenuFlat categoryId={categoryId} fulfillmentId={fulfillmentId} />;
  }
};

export default function WMenuComponent() {
  const MENU_DATA = useMenuCategoryId();
  const defaultFulfillmentId = useDefaultFulfillmentId();
  const nextAvailableTime = useCurrentTimeForDefaultFulfillment();

  // Pre-compute the entire visibility map once at the root level
  const visibilityMap = useCategoryVisibilityMap(
    MENU_DATA ?? '',
    defaultFulfillmentId ?? '',
    nextAvailableTime,
    'menu',
    ShowTemporarilyDisabledProducts,
  );

  if (!MENU_DATA || !defaultFulfillmentId || !visibilityMap) {
    return <LoadingScreen />;
  }

  return (
    <VisibilityMapProvider value={visibilityMap}>
      <WMenuRecursive categoryId={MENU_DATA} fulfillmentId={defaultFulfillmentId} />
    </VisibilityMapProvider>
  );
}
