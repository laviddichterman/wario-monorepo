import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';

import { TabContext, TabList } from '@mui/lab';
import { Button, Tab } from '@mui/material';

import type { IProduct, IProductInstance } from '@wcp/wario-shared/types';
import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useProductById, useProductInstanceById } from '@wcp/wario-ux-shared/query';

import { useEditProductInstanceMutation } from '@/hooks/useProductInstanceMutations';

import { toast } from '@/components/snackbar';

import {
  fromProductInstanceEntity,
  productInstanceFormAtom,
  productInstanceFormDirtyFieldsAtom,
  productInstanceFormProcessingAtom,
  useProductInstanceForm,
} from '@/atoms/forms/productInstanceFormAtoms';

import { ProductInstanceFormBody } from './product_instance.component';

interface ProductInstanceEditContainerProps {
  product_id: string;
  product_instance_id: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceEditContainer = ({
  product_id,
  product_instance_id,
  onCloseCallback,
}: ProductInstanceEditContainerProps) => {
  const product_instance = useProductInstanceById(product_instance_id);
  const parent_product = useProductById(product_id);

  if (!product_instance || !parent_product) {
    return null;
  }

  return (
    <ProductInstanceEditContainerInner
      product_instance={product_instance}
      parent_product={parent_product}
      onCloseCallback={onCloseCallback}
    />
  );
};

interface InnerProps {
  product_instance: IProductInstance;
  parent_product: IProduct;
  onCloseCallback: VoidFunction;
}

const ProductInstanceEditContainerInner = ({ product_instance, parent_product, onCloseCallback }: InnerProps) => {
  const setFormState = useSetAtom(productInstanceFormAtom);
  const setDirtyFields = useSetAtom(productInstanceFormDirtyFieldsAtom);
  const setIsProcessing = useSetAtom(productInstanceFormProcessingAtom);
  const formState = useAtomValue(productInstanceFormAtom);
  const dirtyFields = useAtomValue(productInstanceFormDirtyFieldsAtom);
  const [activeTab, setActiveTab] = useState('identity');
  const { isValid, isProcessing } = useProductInstanceForm();

  const editMutation = useEditProductInstanceMutation();

  useEffect(() => {
    setFormState(fromProductInstanceEntity(product_instance));
    setDirtyFields(new Set());
    return () => {
      setFormState(null);
      setDirtyFields(new Set());
    };
  }, [setFormState, setDirtyFields, product_instance]);

  const editProductInstance = () => {
    if (!formState || editMutation.isPending) return;

    setIsProcessing(true);
    editMutation.mutate(
      {
        productId: parent_product.id,
        instanceId: product_instance.id,
        form: formState,
      },
      {
        onSuccess: () => {
          toast.success(`Updated ${formState.displayName}.`);
        },
        onError: (error) => {
          toast.error(`Unable to update ${formState.displayName}. Got error: ${JSON.stringify(error)}.`);
          console.error(error);
        },
        onSettled: () => {
          setIsProcessing(false);
          onCloseCallback();
        },
      },
    );
  };

  if (!formState) return null;

  return (
    <TabContext value={activeTab}>
      <AppDialog
        open={true}
        onClose={onCloseCallback}
        maxWidth="xl"
        fullWidth
        slotProps={{
          paper: {
            sx: { height: '80vh' },
          },
        }}
      >
        <AppDialog.Header title="Edit Product Instance" onClose={onCloseCallback}>
          <TabList
            onChange={(_: unknown, v: string) => {
              setActiveTab(v);
            }}
            aria-label="product instance tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Identity" value="identity" />
            <Tab label="Display" value="display" />
            <Tab label="Modifiers" value="modifiers" />
          </TabList>
        </AppDialog.Header>

        <AppDialog.Content>
          <ProductInstanceFormBody parent_product={parent_product} />
        </AppDialog.Content>

        <AppDialog.Actions>
          <Button onClick={onCloseCallback} color="inherit" disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={editProductInstance}
            variant="contained"
            disabled={!isValid || isProcessing || dirtyFields.size === 0}
          >
            Save
          </Button>
        </AppDialog.Actions>
      </AppDialog>
    </TabContext>
  );
};

export default ProductInstanceEditContainer;
