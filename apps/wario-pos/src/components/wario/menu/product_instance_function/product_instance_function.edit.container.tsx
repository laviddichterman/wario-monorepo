import { useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { TabContext, TabList } from '@mui/lab';
import { Button, Tab } from '@mui/material';

import type { IProductInstanceFunction } from '@wcp/wario-shared';
import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useProductInstanceFunctionById } from '@wcp/wario-ux-shared/query';

import { useEditProductInstanceFunctionMutation } from '@/hooks/useProductInstanceFunctionMutations';

import {
  fromProductInstanceFunctionEntity,
  productInstanceFunctionFormAtom,
  useProductInstanceFunctionForm,
} from '@/atoms/forms/productInstanceFunctionFormAtoms';

import { ProductInstanceFunctionFormBody } from './product_instance_function.component';

interface ProductInstanceFunctionEditContainerProps {
  pifId: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceFunctionEditContainer = ({
  pifId,
  onCloseCallback,
}: ProductInstanceFunctionEditContainerProps) => {
  const productInstanceFunction = useProductInstanceFunctionById(pifId);

  if (!productInstanceFunction) {
    return null;
  }

  return (
    <ProductInstanceFunctionEditContainerInner
      productInstanceFunction={productInstanceFunction}
      onCloseCallback={onCloseCallback}
    />
  );
};

const ProductInstanceFunctionEditContainerInner = ({
  productInstanceFunction,
  onCloseCallback,
}: {
  productInstanceFunction: IProductInstanceFunction;
  onCloseCallback: VoidFunction;
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const editMutation = useEditProductInstanceFunctionMutation();

  const setForm = useSetAtom(productInstanceFunctionFormAtom);
  const { form, isValid } = useProductInstanceFunctionForm();

  const [activeTab, setActiveTab] = useState('identity');

  // Initialize form on mount with entity data
  useEffect(() => {
    setForm(fromProductInstanceFunctionEntity(productInstanceFunction));
    return () => {
      setForm(null);
    };
  }, [productInstanceFunction, setForm]);

  const editProductInstanceFunction = () => {
    if (!form || !isValid || editMutation.isPending) return;

    editMutation.mutate(
      { id: productInstanceFunction.id, form },
      {
        onSuccess: () => {
          enqueueSnackbar(`Updated product instance function: ${form.functionName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(
            `Unable to edit product instance function: ${form.functionName}. Got error ${JSON.stringify(error, null, 2)}`,
            { variant: 'error' },
          );
          console.error(error);
        },
        onSettled: () => {
          onCloseCallback();
        },
      },
    );
  };

  if (!form) return null;

  return (
    <TabContext value={activeTab}>
      <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
        <AppDialog.Header onClose={onCloseCallback} title={`Edit ${form.functionName}`}>
          <TabList
            onChange={(_e, v: string) => {
              setActiveTab(v);
            }}
            aria-label="function tabs"
            textColor="inherit"
          >
            <Tab label="Identity" value="identity" />
            <Tab label="Logic" value="logic" />
          </TabList>
        </AppDialog.Header>
        <AppDialog.Content>
          <ProductInstanceFunctionFormBody />
        </AppDialog.Content>
        <AppDialog.Actions>
          <Button onClick={onCloseCallback} disabled={editMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={editProductInstanceFunction}
            disabled={!isValid || editMutation.isPending}
            variant="contained"
          >
            Save
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>
    </TabContext>
  );
};

export default ProductInstanceFunctionEditContainer;
