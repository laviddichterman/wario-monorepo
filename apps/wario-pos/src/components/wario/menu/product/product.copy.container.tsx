import { useAuth0 } from '@auth0/auth0-react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';

import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Box, Button, FormControlLabel, Grid, Switch, Tab } from '@mui/material';

import {
  type CatalogProductEntry,
  type CreateProductBatchRequest,
  type UncommittedIProduct,
  type UncommittedIProductInstance,
} from '@wcp/wario-shared';
import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useCatalogSelectors, useProductEntryById } from '@wcp/wario-ux-shared/query';

import {
  fromProductEntity,
  productFormAtom,
  productFormProcessingAtom,
  toProductApiBody,
} from '@/atoms/forms/productFormAtoms';
import {
  productInstanceCopyFlagFamily,
  productInstanceExpandedFamily,
  productInstanceFormFamily,
  toProductInstanceApiBody,
} from '@/atoms/forms/productInstanceFormAtoms';
import { HOST_API } from '@/config';

import { ProductInstanceRow } from './instance/product_instance.row';
import { ProductFormBody } from './product.component';

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

  const [activeTab, setActiveTab] = useState('settings');

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
    <TabContext value={activeTab}>
      <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
        <AppDialog.Header onClose={onCloseCallback} title="Copy Product">
          <TabList
            onChange={(_e, v: string) => {
              setActiveTab(v);
            }}
            aria-label="Product copy tabs"
          >
            <Tab label="Settings" value="settings" />
            <Tab label="Variations" value="variations" />
          </TabList>
        </AppDialog.Header>
        <AppDialog.Content>
          <TabPanel value="settings" sx={{ p: 0, pt: 2 }}>
            <ProductFormBody />
          </TabPanel>
          <TabPanel value="variations" sx={{ p: 0, pt: 2 }}>
            <Box>
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
            </Box>
          </TabPanel>
        </AppDialog.Content>
        <AppDialog.Actions>
          <Button onClick={onCloseCallback} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={() => void copyProduct()} disabled={isProcessing} variant="contained">
            Copy
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>
    </TabContext>
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
  const [copy, setCopy] = useAtom(productInstanceCopyFlagFamily(instanceId));

  return (
    <ProductInstanceRow
      instanceId={instanceId}
      parentProduct={parentProduct}
      catalogSelectors={catalogSelectors}
      actions={
        <Grid container spacing={2} alignItems="center">
          <Grid size="auto">
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
          <Grid size="auto">
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
      }
    />
  );
};
