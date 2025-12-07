/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useAuth0 } from '@auth0/auth0-react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';

import { ExpandMore } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControlLabel,
  Grid,
  Switch,
  Typography,
} from '@mui/material';

import {
  type CatalogProductEntry,
  type CreateProductBatchRequest,
  type UncommittedIProduct,
  type UncommittedIProductInstance,
} from '@wcp/wario-shared';
import { useCatalogSelectors, useProductEntryById } from '@wcp/wario-ux-shared/query';

import {
  fromProductEntity,
  productFormAtom,
  productFormProcessingAtom,
  toProductApiBody,
} from '@/atoms/forms/productFormAtoms';
import {
  fromProductInstanceEntity,
  productInstanceCopyFlagFamily,
  productInstanceExpandedFamily,
  productInstanceFormFamily,
  toProductInstanceApiBody,
} from '@/atoms/forms/productInstanceFormAtoms';
import { HOST_API } from '@/config';

import { ProductInstanceContainer } from './instance/product_instance.component';
import { ProductComponent } from './product.component';

export interface ProductCopyContainerProps {
  product_id: string;
  onCloseCallback: VoidFunction;
}

export const ProductCopyContainer = ({ product_id, onCloseCallback }: ProductCopyContainerProps) => {
  const productEntry = useProductEntryById(product_id);

  if (!productEntry) {
    return null;
  }

  return <ProductCopyContainerContent productEntry={productEntry} onCloseCallback={onCloseCallback} />;
};

const ProductCopyContainerContent = ({
  productEntry,
  onCloseCallback,
}: {
  productEntry: CatalogProductEntry;
  onCloseCallback: VoidFunction;
}) => {
  const catalogSelectors = useCatalogSelectors();

  // We don't need to manually create an array of atoms anymore.
  // We will initialize the atomFamilies in the Form component or here.

  if (!catalogSelectors) return null;

  return (
    <ProductCopyForm
      productEntry={productEntry}
      catalogSelectors={catalogSelectors}
      onCloseCallback={onCloseCallback}
    />
  );
};

interface ProductCopyFormProps {
  productEntry: CatalogProductEntry;
  catalogSelectors: NonNullable<ReturnType<typeof useCatalogSelectors>>;
  onCloseCallback: VoidFunction;
}

const ProductCopyForm = ({ productEntry, catalogSelectors, onCloseCallback }: ProductCopyFormProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const { getAccessTokenSilently } = useAuth0();

  const setProductForm = useSetAtom(productFormAtom);
  const [isProcessing, setIsProcessing] = useAtom(productFormProcessingAtom);
  const productForm = useAtomValue(productFormAtom);

  const [indexOfBase, setIndexOfBase] = useState(() => {
    const idx = productEntry.instances.indexOf(productEntry.product.baseProductId);
    return idx >= 0 ? idx : 0;
  });

  // Initialize Atoms
  useEffect(() => {
    // 1. Base Product Form
    setProductForm(fromProductEntity(productEntry.product));

    // 2. Instance Forms are initialized by ProductInstanceCopyRow components on mount.

    return () => {
      setProductForm(null);
      // Cleanup family atoms to prevent memory leaks
      productEntry.instances.forEach((id) => {
        productInstanceFormFamily.remove(id);
        productInstanceCopyFlagFamily.remove(id);
        productInstanceExpandedFamily.remove(id);
      });
    };
  }, [productEntry, catalogSelectors, setProductForm]);

  // Each ProductInstanceCopyRow initializes its own atom from `catalogSelectors` on mount.

  // Derived atom to read all instance values for submission.
  // We need to know which instances to read.
  const instanceIds = productEntry.instances;
  const allInstancesAtom = useMemo(
    () =>
      atom((get) =>
        instanceIds.map((id) => ({
          id,
          form: get(productInstanceFormFamily(id)),
          copy: get(productInstanceCopyFlagFamily(id)),
        })),
      ),
    [instanceIds],
  );
  const allInstances = useAtomValue(allInstancesAtom);

  const copyProduct = async () => {
    if (isProcessing || !productForm) return;

    setIsProcessing(true);
    try {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });

      // 1. Get Base Instance
      // `allInstances` is array of {id, form, copy}
      if (indexOfBase === -1 || !allInstances[indexOfBase]?.form) {
        throw new Error('Base Product Instance not selected or valid');
      }
      const baseInstanceData = allInstances[indexOfBase];
      if (!baseInstanceData.form) throw new Error('Base instance form missing');

      const baseInstanceBody = toProductInstanceApiBody(baseInstanceData.form);

      // 2. Get Additional Instances
      const additionalInstances: UncommittedIProductInstance[] = [];

      allInstances.forEach((item, i) => {
        if (i === indexOfBase) return;
        if (!item.copy) return;
        if (item.form) {
          additionalInstances.push(toProductInstanceApiBody(item.form));
        }
      });

      const batchInstances = [baseInstanceBody, ...additionalInstances];

      const productBody = toProductApiBody(productForm);

      const batchRequest: CreateProductBatchRequest = {
        product: productBody,
        instances: batchInstances,
      };

      const response = await fetch(`${HOST_API}/api/v1/menu/product/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchRequest),
      });

      if (response.status === 201) {
        enqueueSnackbar(`Copied product.`);
        onCloseCallback();
      } else {
        enqueueSnackbar('Failed to copy product.', { variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Error copying product', { variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!productForm) return null;

  return (
    <ProductComponent confirmText="Save" onCloseCallback={onCloseCallback} onConfirmClick={() => void copyProduct()}>
      {productEntry.instances.map((instanceId, i) => (
        <ProductInstanceCopyRow
          key={instanceId}
          instanceId={instanceId}
          catalogSelectors={catalogSelectors}
          isBase={indexOfBase === i}
          setAsBase={() => {
            setIndexOfBase(i);
          }}
          parentProduct={toProductApiBody(productForm)}
        />
      ))}
    </ProductComponent>
  );
};

// ===================================
// Row Component
// ===================================

const ProductInstanceCopyRow = ({
  instanceId,
  catalogSelectors,
  isBase,
  setAsBase,
  parentProduct,
}: {
  instanceId: string;
  catalogSelectors: NonNullable<ReturnType<typeof useCatalogSelectors>>;
  isBase: boolean;
  setAsBase: () => void;
  parentProduct: UncommittedIProduct;
}) => {
  // access atoms via family
  const [form, setForm] = useAtom(productInstanceFormFamily(instanceId));
  const [copy, setCopy] = useAtom(productInstanceCopyFlagFamily(instanceId));
  const [expanded, setExpanded] = useAtom(productInstanceExpandedFamily(instanceId));

  useEffect(() => {
    // Initialize form on mount if null
    // We check if form is null to avoid overwriting user changes if re-mounted (though keys should prevent that)
    // Actually, better to always init on mount to be safe, or check uniqueness.
    const ent = catalogSelectors.productInstance(instanceId);
    if (ent) {
      setForm(fromProductInstanceEntity(ent));
    }
    // Should we reset copy/expanded? Default is True/False.

    return () => {
      // We don't cleanup per row, we cleanup in parent or let them linger?
      // Parent cleans up.
    };
  }, [instanceId, catalogSelectors, setForm]);

  // Pass the specific atom to the container
  // We can't pass `productInstanceFormFamily(instanceId)` directly if the container expects `PrimitiveAtom<FormState>`
  // `atomFamily` returns a PrimitiveAtom (or WritableAtom).
  // Yes, `productInstanceFormFamily(instanceId)` returns the atom object which is stable.
  const rowAtom = useMemo(() => productInstanceFormFamily(instanceId), [instanceId]);

  return (
    <Accordion
      expanded={expanded && copy}
      onChange={() => {
        setExpanded(!expanded);
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Grid container>
          <Grid size="grow">
            <Typography>{form?.displayName || 'Loading...'}</Typography>
          </Grid>
          <Grid size={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={copy}
                  onChange={() => {
                    setCopy(!copy);
                  }}
                  disabled={isBase}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              }
              label="Copy"
            />
          </Grid>
          <Grid size={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={isBase}
                  onChange={() => {
                    setAsBase();
                  }}
                  disabled={!copy}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              }
              label="Base"
            />
          </Grid>
        </Grid>
      </AccordionSummary>
      <AccordionDetails>
        {/* Pass the atom directly to the container */}
        <ProductInstanceContainer parent_product={parentProduct} formAtom={rowAtom} />
      </AccordionDetails>
    </Accordion>
  );
};
