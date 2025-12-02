import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { type IAbstractExpression, type IProductInstanceFunction } from "@wcp/wario-shared";
import { useProductInstanceFunctionById } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import ProductInstanceFunctionComponent from "./product_instance_function.component";

interface ProductInstanceFunctionEditContainerProps {
  pifId: string;
  onCloseCallback: VoidFunction;
}
const ProductInstanceFunctionEditContainer = ({ pifId, onCloseCallback }: ProductInstanceFunctionEditContainerProps) => {
  const productInstanceFunction = useProductInstanceFunctionById(pifId);
  if (!productInstanceFunction) {
    return null;
  }

  return <ProductInstanceFunctionEditContainerInner productInstanceFunction={productInstanceFunction} onCloseCallback={onCloseCallback} />;
}

const ProductInstanceFunctionEditContainerInner = ({ productInstanceFunction, onCloseCallback }: { productInstanceFunction: IProductInstanceFunction; onCloseCallback: VoidFunction }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [functionName, setFunctionName] = useState(productInstanceFunction.name);
  const [expression, setExpression] = useState<IAbstractExpression | null>(productInstanceFunction.expression);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const editProductInstanceFunction = async () => {
    if (!isProcessing && functionName && expression !== null) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<IProductInstanceFunction, "id"> = {
          name: functionName,
          expression
        };
        const response = await fetch(`${HOST_API}/api/v1/query/language/productinstancefunction/${productInstanceFunction.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 200) {
          enqueueSnackbar(`Updated product instance function: ${functionName}.`);
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to edit product instance function: ${functionName}. Got error ${JSON.stringify(error, null, 2)}`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <ProductInstanceFunctionComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void editProductInstanceFunction()}
      isProcessing={isProcessing}
      functionName={functionName}
      setFunctionName={setFunctionName}
      expression={expression}
      setExpression={setExpression}
    />
  );
};

export default ProductInstanceFunctionEditContainer;
