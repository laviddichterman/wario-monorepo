import { useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';

import { TabContext, TabList } from '@mui/lab';
import { Button, Tab } from '@mui/material';

import { AppDialog } from '@wcp/wario-ux-shared/containers';

import { useAddProductInstanceFunctionMutation } from '@/hooks/useProductInstanceFunctionMutations';

import { toast } from '@/components/snackbar';

import {
  DEFAULT_PRODUCT_INSTANCE_FUNCTION_FORM,
  productInstanceFunctionFormAtom,
  useProductInstanceFunctionForm,
} from '@/atoms/forms/productInstanceFunctionFormAtoms';

import { ProductInstanceFunctionFormBody } from './product_instance_function.component';

interface ProductInstanceFunctionAddContainerProps {
  onCloseCallback: VoidFunction;
}

const ProductInstanceFunctionAddContainer = ({ onCloseCallback }: ProductInstanceFunctionAddContainerProps) => {
  const addMutation = useAddProductInstanceFunctionMutation();

  const setForm = useSetAtom(productInstanceFunctionFormAtom);
  const { form, isValid } = useProductInstanceFunctionForm();

  const [activeTab, setActiveTab] = useState('identity');

  // Initialize form on mount
  useEffect(() => {
    setForm(DEFAULT_PRODUCT_INSTANCE_FUNCTION_FORM);
    return () => {
      setForm(null);
    };
  }, [setForm]);

  const addProductInstanceFunction = () => {
    if (!form || !isValid || addMutation.isPending) return;

    addMutation.mutate(
      { form },
      {
        onSuccess: () => {
          toast.success(`Added product instance function: ${form.functionName}.`);
        },
        onError: (error) => {
          toast.error(
            `Unable to add product instance function: ${form.functionName}. Got error ${JSON.stringify(error, null, 2)}`,
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
        <AppDialog.Header onClose={onCloseCallback} title="Add Function">
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
          <Button onClick={onCloseCallback} disabled={addMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={addProductInstanceFunction} disabled={!isValid || addMutation.isPending} variant="contained">
            Add
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>
    </TabContext>
  );
};

export default ProductInstanceFunctionAddContainer;
