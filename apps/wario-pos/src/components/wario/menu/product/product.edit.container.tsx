import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useEffect, useRef, useState } from 'react';

import type { IProduct, UpsertIProductInstanceRequest } from '@wcp/wario-shared/types';
import { useBaseProductNameByProductId, useCatalogSelectors, useProductById } from '@wcp/wario-ux-shared/query';

import { useEditProductMutation } from '@/hooks/useProductMutations';

import { toast } from '@/components/snackbar';

import {
  fromProductEntity,
  productFormAtom,
  productFormDirtyFieldsAtom,
  productFormProcessingAtom,
  productInstanceIdsAtom,
  productInstancesDirtyAtom,
  toProductApiBody,
} from '@/atoms/forms/productFormAtoms';
import {
  allProductInstancesValidAtom,
  productInstanceExpandedFamily,
  productInstanceFormFamily,
  toProductInstanceApiBody,
} from '@/atoms/forms/productInstanceFormAtoms';

import { ProductInstancesDataGrid } from './instance/product_instances_datagrid.component';
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
  const store = useStore();
  const catalogSelectors = useCatalogSelectors();

  const setProductForm = useSetAtom(productFormAtom);
  const setDirtyFields = useSetAtom(productFormDirtyFieldsAtom);
  const setIsProcessing = useSetAtom(productFormProcessingAtom);
  const setInstancesDirty = useSetAtom(productInstancesDirtyAtom);
  const setInstanceIdsAtom = useSetAtom(productInstanceIdsAtom);
  const productForm = useAtomValue(productFormAtom);
  const dirtyFields = useAtomValue(productFormDirtyFieldsAtom);
  const instancesDirty = useAtomValue(productInstancesDirtyAtom);
  const allInstancesValid = useAtomValue(allProductInstancesValidAtom);

  const editMutation = useEditProductMutation();

  const [instanceIds, setInstanceIds] = useState<string[]>([]);
  // Track original instance IDs to detect reordering/additions
  const originalInstanceIdsRef = useRef<string[]>([]);

  useEffect(() => {
    setProductForm(fromProductEntity(productEntry));
    setDirtyFields(new Set());
    setInstancesDirty(false);
    setInstanceIds(productEntry.instances);
    setInstanceIdsAtom(productEntry.instances);
    originalInstanceIdsRef.current = productEntry.instances;
    return () => {
      setProductForm(null);
      setDirtyFields(new Set());
      setInstancesDirty(false);
      setInstanceIdsAtom([]);
      // Cleanup family atoms
      productEntry.instances.forEach((id) => {
        productInstanceFormFamily.remove(id);
        productInstanceExpandedFamily.remove(id);
      });
    };
  }, [productEntry, setProductForm, setDirtyFields, setInstancesDirty, setInstanceIdsAtom]);

  // Sync local instanceIds state with the atom for validation
  useEffect(() => {
    setInstanceIdsAtom(instanceIds);
  }, [instanceIds, setInstanceIdsAtom]);

  // Determine if there are any changes to save
  const hasProductChanges = dirtyFields.size > 0;
  const hasInstanceChanges = instancesDirty;
  const hasOrderChanges =
    instanceIds.length !== originalInstanceIdsRef.current.length ||
    instanceIds.some((id, idx) => originalInstanceIdsRef.current[idx] !== id);
  const hasAnyChanges = hasProductChanges || hasInstanceChanges || hasOrderChanges;

  const editProduct = async () => {
    if (!productForm || editMutation.isPending) return;

    setIsProcessing(true);

    try {
      // Build the instances array if there are any instance changes
      // The API accepts: bare string (existing unchanged), CreateIProductInstanceRequest (new), or UpdateIProductInstanceRequest (update)
      let instancesPayload: (string | UpsertIProductInstanceRequest)[] | undefined;

      if (hasInstanceChanges || hasOrderChanges) {
        instancesPayload = instanceIds.map((id): string | UpsertIProductInstanceRequest => {
          const instanceForm = store.get(productInstanceFormFamily(id));

          if (id.startsWith('temp_')) {
            // New instance - must have a form and use CreateIProductInstanceRequest
            if (!instanceForm) {
              throw new Error(`Missing form for new instance ${id}`);
            }
            return toProductInstanceApiBody(instanceForm);
          } else {
            // Existing instance
            if (!instanceForm) {
              // Instance wasn't expanded/loaded, just pass the ID to preserve it
              return id;
            }
            // Return update format with ID
            return {
              id,
              ...toProductInstanceApiBody(instanceForm),
            };
          }
        });
      }

      // Build the product update request
      const productPayload = {
        id: productEntry.id,
        ...toProductApiBody(productForm, dirtyFields),
        ...(instancesPayload !== undefined ? { instances: instancesPayload } : {}),
      };

      await editMutation.mutateAsync(productPayload);

      toast.success(`Updated ${productName}.`);
      onCloseCallback();
    } catch (error) {
      console.error(error);
      toast.error(`Unable to update ${productName}. Error details in console.`);
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
      disableConfirm={!hasAnyChanges || !allInstancesValid}
      productInstancesContent={
        <ProductInstancesDataGrid
          instanceIds={instanceIds}
          setInstanceIds={setInstanceIds}
          parentProduct={toProductApiBody(productForm)}
          catalogSelectors={catalogSelectors}
        />
      }
    />
  );
};

export default ProductEditContainer;
