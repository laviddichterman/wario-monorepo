import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import type { IProductInstance, KeyValue, ProductModifierEntry } from "@wcp/wario-shared";
import { PriceDisplay } from "@wcp/wario-shared";
import { getProductEntryById } from "@wcp/wario-ux-shared";

import { useAppSelector } from "@/hooks/useRedux";

import { HOST_API } from "@/config";

import { ProductInstanceActionContainer } from "./product_instance.component";

interface ProductInstanceAddContainerProps {
  parent_product_id: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceAddContainer = ({ parent_product_id, onCloseCallback }: ProductInstanceAddContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const parent_product = useAppSelector(s => getProductEntryById(s.ws.products, parent_product_id).product);
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [shortcode, setShortcode] = useState("");
  const [ordinal, setOrdinal] = useState(0);
  const [modifiers, setModifiers] = useState<ProductModifierEntry[]>([]);
  const [externalIds, setExternalIds] = useState<KeyValue[]>([]);
  // pos
  const [hideFromPos, setHideFromPos] = useState(false);
  const [posName, setPosName] = useState("");
  const [posSkipCustomization, setPosSkipCustomization] = useState(true);
  // menu
  const [menuOrdinal, setMenuOrdinal] = useState(0);
  const [menuHide, setMenuHide] = useState(false);
  const [menuPriceDisplay, setMenuPriceDisplay] = useState<PriceDisplay>(PriceDisplay.ALWAYS);
  const [menuAdornment, setMenuAdornment] = useState("");
  const [menuSuppressExhaustiveModifierList, setMenuSuppressExhaustiveModifierList] = useState(false);
  const [menuShowModifierOptions, setMenuShowModifierOptions] = useState(false);

  // order
  const [orderOrdinal, setOrderOrdinal] = useState(0);
  const [orderMenuHide, setOrderMenuHide] = useState(false);
  const [orderSkipCustomization, setOrderSkipCustomization] = useState(true);
  const [orderPriceDisplay, setOrderPriceDisplay] = useState<PriceDisplay>(PriceDisplay.ALWAYS);
  const [orderAdornment, setOrderAdornment] = useState("");
  const [orderSuppressExhaustiveModifierList, setOrderSuppressExhaustiveModifierList] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();
  const addProductInstance = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<IProductInstance, 'id' | 'productId'> = {
          displayName,
          description,
          shortcode,
          ordinal,
          modifiers,
          externalIDs: externalIds,
          displayFlags: {
            pos: {
              hide: hideFromPos,
              name: posName,
              skip_customization: parent_product.modifiers.length === 0 || posSkipCustomization
            },
            menu: {
              ordinal: menuOrdinal,
              hide: menuHide,
              price_display: menuPriceDisplay,
              adornment: menuAdornment,
              suppress_exhaustive_modifier_list: menuSuppressExhaustiveModifierList,
              show_modifier_options: menuShowModifierOptions
            },
            order: {
              ordinal: orderOrdinal,
              hide: orderMenuHide,
              skip_customization: parent_product.modifiers.length === 0 || orderSkipCustomization,
              price_display: orderPriceDisplay,
              adornment: orderAdornment,
              suppress_exhaustive_modifier_list: orderSuppressExhaustiveModifierList
            }
          }
        };
        const response = await fetch(`${HOST_API}/api/v1/menu/product/${parent_product.id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body)
        });
        if (response.status === 201) {
          enqueueSnackbar(`Added ${displayName}.`)
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to add product instance: ${displayName}. Got error ${JSON.stringify(error)}`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <ProductInstanceActionContainer
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void addProductInstance()}
      isProcessing={isProcessing}
      parent_product={parent_product}
      displayName={displayName}
      setDisplayName={setDisplayName}
      description={description}
      setDescription={setDescription}
      shortcode={shortcode}
      setShortcode={setShortcode}
      ordinal={ordinal}
      setOrdinal={setOrdinal}
      modifiers={modifiers}
      setModifiers={setModifiers}
      externalIds={externalIds}
      setExternalIds={setExternalIds}
      //pos
      hideFromPos={hideFromPos}
      setHideFromPos={setHideFromPos}
      posName={posName}
      setPosName={setPosName}
      posSkipCustomization={posSkipCustomization}
      setPosSkipCustomization={setPosSkipCustomization}
      // menu
      menuOrdinal={menuOrdinal}
      setMenuOrdinal={setMenuOrdinal}
      menuHide={menuHide}
      setMenuHide={setMenuHide}
      menuPriceDisplay={menuPriceDisplay}
      setMenuPriceDisplay={setMenuPriceDisplay}
      menuAdornment={menuAdornment}
      setMenuAdornment={setMenuAdornment}
      menuSuppressExhaustiveModifierList={menuSuppressExhaustiveModifierList}
      setMenuSuppressExhaustiveModifierList={setMenuSuppressExhaustiveModifierList}
      menuShowModifierOptions={menuShowModifierOptions}
      setMenuShowModifierOptions={setMenuShowModifierOptions}
      // order
      orderOrdinal={orderOrdinal}
      setOrderOrdinal={setOrderOrdinal}
      orderMenuHide={orderMenuHide}
      setOrderMenuHide={setOrderMenuHide}
      orderSkipCustomization={orderSkipCustomization}
      setOrderSkipCustomization={setOrderSkipCustomization}
      orderPriceDisplay={orderPriceDisplay}
      setOrderPriceDisplay={setOrderPriceDisplay}
      orderAdornment={orderAdornment}
      setOrderAdornment={setOrderAdornment}
      orderSuppressExhaustiveModifierList={orderSuppressExhaustiveModifierList}
      setOrderSuppressExhaustiveModifierList={setOrderSuppressExhaustiveModifierList}
    />
  );
};

export default ProductInstanceAddContainer;
