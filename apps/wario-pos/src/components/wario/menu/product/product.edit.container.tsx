/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import type { IProduct } from "@wcp/wario-shared";
import { useBaseProductNameByProductId, useValueFromProductEntryById } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import { ProductComponent } from "./product.component";

export interface ProductEditContainerProps {
  product_id: string;
  onCloseCallback: VoidFunction;
};

const ProductEditContainer = ({ product_id, onCloseCallback }: ProductEditContainerProps) => {
  const productName = useBaseProductNameByProductId(product_id);
  const product = useValueFromProductEntryById(product_id, "product");

  if (!product || !productName) {
    return null;
  }

  return <ProductEditContainerInner product={product} productName={productName} onCloseCallback={onCloseCallback} />;
};

interface InnerProps {
  product: IProduct;
  productName: string;
  onCloseCallback: VoidFunction;
}

const ProductEditContainerInner = ({ product, productName, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const [price, setPrice] = useState(product.price);
  const [baseProductId, setBaseProductId] = useState(product.baseProductId);
  const [externalIds, setExternalIds] = useState(product.externalIDs);
  const [availability, setAvailability] = useState(product.availability ?? []);
  const [timing, setTiming] = useState(product.timing);
  const [disabled, setDisabled] = useState(product.disabled ?? null);
  const [serviceDisable, setServiceDisable] = useState(product.serviceDisable)
  const [flavorMax, setFlavorMax] = useState(product.displayFlags.flavor_max ?? 10);
  const [bakeMax, setBakeMax] = useState(product.displayFlags.bake_max ?? 10);
  const [bakeDifferentialMax, setBakeDifferentialMax] = useState(product.displayFlags.bake_differential ?? 100);
  const [is3p, setIs3p] = useState(product.displayFlags.is3p ?? false);
  const [orderGuideSuggestionFunctions, setOrderGuideSuggestionFunctions] = useState(product.displayFlags.order_guide.suggestions);
  const [orderGuideWarningFunctions, setOrderGuideWarningFunctions] = useState(product.displayFlags.order_guide.warnings);
  const [showNameOfBaseProduct, setShowNameOfBaseProduct] = useState(product.displayFlags.show_name_of_base_product ?? true);
  const [singularNoun, setSingularNoun] = useState(product.displayFlags.singular_noun ?? "");
  const [parentCategories, setParentCategories] = useState(product.category_ids);
  const [printerGroup, setPrinterGroup] = useState(product.printerGroup);
  const [modifiers, setModifiers] = useState(product.modifiers);
  // create an Object mapping MTID to enable function object
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();
  const editProduct = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<IProduct, 'id'> = {
          disabled,
          availability,
          timing,
          serviceDisable,
          price,
          externalIDs: externalIds,
          displayFlags: {
            is3p,
            bake_differential: bakeDifferentialMax,
            show_name_of_base_product: showNameOfBaseProduct,
            flavor_max: flavorMax,
            bake_max: bakeMax,
            singular_noun: singularNoun,
            order_guide: {
              suggestions: orderGuideSuggestionFunctions,
              warnings: orderGuideWarningFunctions
            }
          },
          category_ids: parentCategories,
          printerGroup,
          modifiers,
          baseProductId
        };
        const response = await fetch(`${HOST_API}/api/v1/menu/product/${product.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 200) {
          enqueueSnackbar(`Updated ${productName}.`)
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to update ${productName}. Got error: ${JSON.stringify(error, null, 2)}.`, { variant: "error" });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <ProductComponent
      confirmText="Save"
      isEdit
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void editProduct()}
      isProcessing={isProcessing}
      disableConfirmOn={price.amount < 0 || isProcessing}
      baseProductId={baseProductId}
      setBaseProductId={setBaseProductId}
      price={price}
      setPrice={setPrice}
      externalIds={externalIds}
      setExternalIds={setExternalIds}
      availability={availability}
      setAvailability={setAvailability}
      timing={timing}
      setTiming={setTiming}
      disabled={disabled}
      setDisabled={setDisabled}
      serviceDisable={serviceDisable}
      setServiceDisable={setServiceDisable}
      flavorMax={flavorMax}
      setFlavorMax={setFlavorMax}
      bakeMax={bakeMax}
      setBakeMax={setBakeMax}
      bakeDifferentialMax={bakeDifferentialMax}
      setBakeDifferentialMax={setBakeDifferentialMax}
      is3p={is3p}
      setIs3p={setIs3p}
      orderGuideSuggestionFunctions={orderGuideSuggestionFunctions}
      setOrderGuideSuggestionFunctions={setOrderGuideSuggestionFunctions}
      orderGuideWarningFunctions={orderGuideWarningFunctions}
      setOrderGuideWarningFunctions={setOrderGuideWarningFunctions}
      showNameOfBaseProduct={showNameOfBaseProduct}
      setShowNameOfBaseProduct={setShowNameOfBaseProduct}
      singularNoun={singularNoun}
      setSingularNoun={setSingularNoun}
      parentCategories={parentCategories}
      setParentCategories={setParentCategories}
      printerGroup={printerGroup}
      setPrinterGroup={setPrinterGroup}
      modifiers={modifiers}
      setModifiers={setModifiers}
    />
  );
};

export default ProductEditContainer;