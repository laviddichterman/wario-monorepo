import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { Add } from '@mui/icons-material';
import { Box, Button } from '@mui/material';

import { type IProduct } from '@wcp/wario-shared/types';
import { useBaseProductNameByProductId, useCatalogSelectors, useProductById } from '@wcp/wario-ux-shared/query';

import {
  useCreateProductInstanceMutation,
  useEditProductMutation,
  useUpdateProductInstanceMutation,
} from '@/hooks/useProductMutations';

import {
  fromProductEntity,
  productFormAtom,
  productFormDirtyFieldsAtom,
  productFormProcessingAtom,
  toProductApiBody,
} from '@/atoms/forms/productFormAtoms';
import {
  DEFAULT_PRODUCT_INSTANCE_FORM,
  productInstanceExpandedFamily,
  productInstanceFormFamily,
  toProductInstanceApiBody,
} from '@/atoms/forms/productInstanceFormAtoms';

import { ProductInstanceRow } from './instance/product_instance.row';
import { ProductComponent } from './product.component';

export interface ProductEditContainerProps {
  product_id: string;
  onCloseCallback: VoidFunction;
}

const ProductEditContainer = ({ product_id, onCloseCallback }: ProductEditContainerProps) => {
  const productName = useBaseProductNameByProductId(product_id);
  const productEntry = useProductById(product_id);

  if (!productEntry || !productName) {
    return null;
  }

  return (
    <ProductEditContainerInner
      productEntry={productEntry}
      productName={productName}
      onCloseCallback={onCloseCallback}
    />
  );
};

interface InnerProps {
  productEntry: IProduct;
  productName: string;
  onCloseCallback: VoidFunction;
}

const ProductEditContainerInner = ({ productEntry, productName, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const store = useStore();
  const catalogSelectors = useCatalogSelectors();

  const setProductForm = useSetAtom(productFormAtom);
  const setDirtyFields = useSetAtom(productFormDirtyFieldsAtom);
  const setIsProcessing = useSetAtom(productFormProcessingAtom);
  const productForm = useAtomValue(productFormAtom);
  const dirtyFields = useAtomValue(productFormDirtyFieldsAtom);

  const editMutation = useEditProductMutation();
  const createInstanceMutation = useCreateProductInstanceMutation();
  const updateInstanceMutation = useUpdateProductInstanceMutation();

  const [instanceIds, setInstanceIds] = useState<string[]>([]);

  useEffect(() => {
    setProductForm(fromProductEntity(productEntry));
    setDirtyFields(new Set());
    setInstanceIds(productEntry.instances);
    return () => {
      setProductForm(null);
      setDirtyFields(new Set());
      // Cleanup family atoms
      // Cleanup loaded instances
      productEntry.instances.forEach((id) => {
        productInstanceFormFamily.remove(id);
        productInstanceExpandedFamily.remove(id);
      });
    };
  }, [productEntry, setProductForm, setDirtyFields]);

  const handleAddVariation = () => {
    const tempId = `temp_${String(Date.now())}`;
    const newInstance = { ...DEFAULT_PRODUCT_INSTANCE_FORM };
    store.set(productInstanceFormFamily(tempId), newInstance);
    // Expand the new row
    store.set(productInstanceExpandedFamily(tempId), true);

    setInstanceIds((prev) => [...prev, tempId]);
  };

  const editProduct = async () => {
    if (!productForm || editMutation.isPending) return;

    setIsProcessing(true);

    try {
      // 1. Update Product (instances are handled separately below)
      await editMutation.mutateAsync({ id: productEntry.id, instances: [], ...toProductApiBody(productForm) });

      // 2. Process Instances
      const instancePromises = instanceIds.map(async (id) => {
        const instanceForm = store.get(productInstanceFormFamily(id));
        if (!instanceForm) return; // Not loaded/modified

        const apiBody = toProductInstanceApiBody(instanceForm);

        if (id.startsWith('temp_')) {
          await createInstanceMutation.mutateAsync({
            productId: productEntry.id,
            body: apiBody,
          });
        } else {
          await updateInstanceMutation.mutateAsync({
            productId: productEntry.id,
            instanceId: id,
            body: { ...apiBody, id },
          });
        }
      });

      await Promise.all(instancePromises);

      enqueueSnackbar(`Updated ${productName}.`);
      onCloseCallback();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(`Unable to update ${productName}. Error details in console.`, {
        variant: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!productForm || !catalogSelectors) return null;

  return (
    <ProductComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => {
        void editProduct();
      }}
      disableConfirm={dirtyFields.size === 0}
      productInstancesContent={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            {instanceIds.map((instanceId, index) => (
              <ProductInstanceRow
                key={instanceId}
                instanceId={instanceId}
                parentProduct={toProductApiBody(productForm)}
                catalogSelectors={catalogSelectors}
                defaultExpanded={index === 0}
              />
            ))}
          </Box>
          <Button startIcon={<Add />} onClick={handleAddVariation} fullWidth variant="outlined">
            Add Variation
          </Button>
        </Box>
      }
    />
  );
};

export default ProductEditContainer;
