import { useAtom } from 'jotai';
import { useEffect, useMemo } from 'react';

import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Grid, Typography } from '@mui/material';

import { type IProduct } from '@wcp/wario-shared/types';
import type { useCatalogSelectors } from '@wcp/wario-ux-shared/query';

import {
  fromProductInstanceEntity,
  productInstanceExpandedFamily,
  productInstanceFormFamily,
} from '@/atoms/forms/productInstanceFormAtoms';

import { ProductInstanceContainer } from './product_instance.component';

type UncommittedIProduct = Omit<IProduct, 'id' | 'instances'>;

export interface ProductInstanceRowProps {
  instanceId: string;
  parentProduct: UncommittedIProduct;
  catalogSelectors: NonNullable<ReturnType<typeof useCatalogSelectors>>;
  actions?: React.ReactNode;
  defaultExpanded?: boolean;
}

export const ProductInstanceRow = ({
  instanceId,
  parentProduct,
  catalogSelectors,
  actions,
  defaultExpanded = false,
}: ProductInstanceRowProps) => {
  const [form, setForm] = useAtom(productInstanceFormFamily(instanceId));
  // We can reuse the expanded family or just use local state?
  // The copy container used a family, probably to control it programmatically if needed.
  // We'll stick to the family for consistency.
  const [expanded, setExpanded] = useAtom(productInstanceExpandedFamily(instanceId));

  useEffect(() => {
    // Initialize form from entity if not already set
    if (!form) {
      const ent = catalogSelectors.productInstance(instanceId);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (ent) {
        setForm(fromProductInstanceEntity(ent));
      }
    }
  }, [instanceId, catalogSelectors, setForm, form]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (defaultExpanded && expanded === null) {
      setExpanded(true);
    }
  }, [defaultExpanded, expanded, setExpanded]);

  const rowAtom = useMemo(() => productInstanceFormFamily(instanceId), [instanceId]);

  return (
    <Accordion
      expanded={expanded}
      onChange={() => {
        setExpanded(!expanded);
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Grid container alignItems="center">
          <Grid size="grow">
            <Typography variant="subtitle1">{form?.displayName || 'Loading...'}</Typography>
            {form?.posName && form.posName !== form.displayName && (
              <Typography variant="caption" color="text.secondary">
                POS: {form.posName}
              </Typography>
            )}
          </Grid>
          {actions && <Grid size="auto">{actions}</Grid>}
        </Grid>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        {/* Pass the atom directly to the container */}
        <ProductInstanceContainer parent_product={parentProduct} formAtom={rowAtom} />
      </AccordionDetails>
    </Accordion>
  );
};
