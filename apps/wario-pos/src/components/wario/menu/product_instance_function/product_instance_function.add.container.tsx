import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { type IAbstractExpression, type IProductInstanceFunction } from "@wcp/wario-shared";

import { HOST_API } from "@/config";

import ProductInstanceFunctionComponent from "./product_instance_function.component";

interface ProductInstanceFunctionAddContainerProps {
  onCloseCallback: VoidFunction;
}
const ProductInstanceFunctionAddContainer = ({ onCloseCallback }: ProductInstanceFunctionAddContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const [functionName, setFunctionName] = useState("");
  const [expression, setExpression] = useState<IAbstractExpression | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const addProductInstanceFunction = async () => {
    if (!isProcessing && expression != null) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<IProductInstanceFunction, "id"> = {
          name: functionName,
          expression
        };
        const response = await fetch(`${HOST_API}/api/v1/query/language/productinstancefunction/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 201) {
          enqueueSnackbar(`Added product instance function: ${functionName}.`);
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to add product instance function: ${functionName}. Got error ${JSON.stringify(error, null, 2)}`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <ProductInstanceFunctionComponent
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void addProductInstanceFunction()}
      isProcessing={isProcessing}
      functionName={functionName}
      setFunctionName={setFunctionName}
      expression={expression}
      setExpression={setExpression}
    />
  );
};

export default ProductInstanceFunctionAddContainer;
