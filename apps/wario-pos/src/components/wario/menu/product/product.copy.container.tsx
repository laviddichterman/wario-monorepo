
import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useCallback, useState } from "react";

import { ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, FormControlLabel, Grid, Switch, Typography } from "@mui/material";

import { type CatalogProductEntry, type CreateProductBatch, type ICatalogSelectors, type IProductInstance } from "@wcp/wario-shared";
import { useIndexedState } from '@wcp/wario-ux-shared/common';
import { useCatalogSelectors, useProductEntryById } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import { ProductInstanceContainer } from "./instance/product_instance.component";
import { ProductComponent } from "./product.component";

export interface ProductCopyContainerProps {
  product_id: string;
  onCloseCallback: VoidFunction;
};
const ProductCopyContainer = ({ product_id, onCloseCallback }: ProductCopyContainerProps) => {
  const productEntry = useProductEntryById(product_id);
  if (!productEntry) {
    return null;
  }
  return <ProductCopyContainerInner productEntry={productEntry} onCloseCallback={onCloseCallback} />;
};

const ProductCopyContainerInner = ({ productEntry, onCloseCallback }: { productEntry: CatalogProductEntry, onCloseCallback: VoidFunction }) => {
  const { enqueueSnackbar } = useSnackbar();

  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;

  const [price, setPrice] = useState(productEntry.product.price);
  const [availability, setAvailability] = useState(productEntry.product.availability);
  const [timing, setTiming] = useState(productEntry.product.timing);
  const [disabled, setDisabled] = useState(productEntry.product.disabled ?? null);
  const [externalIds, setExternalIds] = useState(productEntry.product.externalIDs);
  const [serviceDisable, setServiceDisable] = useState(productEntry.product.serviceDisable)
  const [flavorMax, setFlavorMax] = useState(productEntry.product.displayFlags.flavor_max);
  const [bakeMax, setBakeMax] = useState(productEntry.product.displayFlags.bake_max);
  const [bakeDifferentialMax, setBakeDifferentialMax] = useState(productEntry.product.displayFlags.bake_differential);
  const [is3p, setIs3p] = useState(productEntry.product.displayFlags.is3p);
  const [orderGuideSuggestionFunctions, setOrderGuideSuggestionFunctions] = useState(productEntry.product.displayFlags.order_guide.suggestions);
  const [orderGuideWarningFunctions, setOrderGuideWarningFunctions] = useState(productEntry.product.displayFlags.order_guide.warnings);
  const [showNameOfBaseProduct, setShowNameOfBaseProduct] = useState(productEntry.product.displayFlags.show_name_of_base_product);
  const [singularNoun, setSingularNoun] = useState(productEntry.product.displayFlags.singular_noun);
  const [parentCategories, setParentCategories] = useState(productEntry.product.category_ids);
  const [printerGroup, setPrinterGroup] = useState(productEntry.product.printerGroup);
  const [modifiers, setModifiers] = useState(productEntry.product.modifiers);

  // product instance indexed state
  const [expandedPanels, setExpandedPanel] = useIndexedState(useState(Array<boolean>(productEntry.instances.length).fill(false)));
  const [indexOfBase, setIndexOfBase] = useState(productEntry.instances.indexOf(productEntry.product.baseProductId))
  const [copyPIFlags, setCopyPIFlag] = useIndexedState(useState(Array<boolean>(productEntry.instances.length).fill(true)));
  const [piDisplayNames, setPiDisplayName] = useIndexedState(useState(productEntry.instances.map(pi => (catalogSelectors.productInstance(pi) as IProductInstance).displayName)));
  const [piDescriptions, setPiDescription] = useIndexedState(useState(productEntry.instances.map(pi => (catalogSelectors.productInstance(pi) as IProductInstance).description)));
  const [piShortcodes, setPiShortcode] = useIndexedState(useState(productEntry.instances.map(pi => (catalogSelectors.productInstance(pi) as IProductInstance).shortcode)));
  const [piOrdinals, setPiOrdinal] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).ordinal || 0))));
  const [piModifierss, setPiModifiers] = useIndexedState(useState(productEntry.instances.map(pi => (catalogSelectors.productInstance(pi) as IProductInstance).modifiers)));
  const [piExteralIdss, setPiExternalIds] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).externalIDs))));
  const [piHideFromPoses, setPiHideFromPos] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.pos.hide))));
  const [piPosNames, setPiPosNames] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.pos.name))));
  const [piPosSkipCustomizations, setPiPosSkipCustomization] = useIndexedState(useState(productEntry.instances.map(pi => (catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.pos.skip_customization)));
  const [piMenuOrdinals, setPiMenuOrdinal] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.menu.ordinal))));
  const [piMenuHides, setPiMenuHide] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.menu.hide))));
  const [piMenuPriceDisplays, setPiMenuPriceDisplay] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.menu.price_display))));
  const [piMenuAdornments, setPiMenuAdornment] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.menu.adornment))));
  const [piMenuSuppressExhaustiveModifierLists, setPiMenuSuppressExhaustiveModifierList] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.menu.suppress_exhaustive_modifier_list))));
  const [piMenuShowModifierOptionss, setPiMenuShowModifierOptions] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.menu.show_modifier_options))));
  const [piOrderOrdinals, setPiOrderOrdinal] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.order.ordinal || 0))));
  const [piOrderMenuHides, setPiOrderMenuHide] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.order.hide))));
  const [piOrderSkipCustomizations, setPiOrderSkipCustomization] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.order.skip_customization))));
  const [piOrderPriceDisplays, setPiOrderPriceDisplay] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.order.price_display))));
  const [piOrderAdornments, setPiOrderAdornment] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.order.adornment))));
  const [piOrderSuppressExhaustiveModifierLists, setPiOrderSuppressExhaustiveModifierList] = useIndexedState(useState(productEntry.instances.map(pi => ((catalogSelectors.productInstance(pi) as IProductInstance).displayFlags.order.suppress_exhaustive_modifier_list))));
  // API state
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const getProductInstanceEditor = useCallback((i: number) => (
    <Accordion sx={{ p: 2 }} key={i} expanded={expandedPanels[i] && copyPIFlags[i]} onChange={(_e, ex) => { setExpandedPanel(i)(ex); }}  >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Grid container>
          <Grid size="grow">
            <Typography sx={{ ml: 4 }}>{piDisplayNames[i]}</Typography>
          </Grid>
          <Grid size={2}>
            <FormControlLabel sx={{ float: "right" }} control={
              <Switch
                disabled={indexOfBase === i}
                checked={copyPIFlags[i]}
                onChange={(e) => { setCopyPIFlag(i)(e.target.checked); }}
                name="Copy"
              />
            }
              label="Copy"
            />
          </Grid>
          <Grid size={2}>
            <FormControlLabel sx={{ float: "right" }} control={
              <Switch
                disabled={!copyPIFlags[i] || indexOfBase === i}
                checked={indexOfBase === i}
                onChange={(_e) => { setIndexOfBase(i); }}
                name="Base Product"
              />
            }
              label="Base Product"
            />
          </Grid>
        </Grid>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3} justifyContent="center">
          <ProductInstanceContainer
            isProcessing={isProcessing}
            parent_product={{
              category_ids: parentCategories,
              printerGroup,
              disabled,
              availability,
              timing,
              displayFlags: {
                is3p,
                bake_differential: bakeDifferentialMax,
                bake_max: bakeMax,
                flavor_max: flavorMax,
                order_guide: {
                  suggestions: orderGuideSuggestionFunctions,
                  warnings: orderGuideWarningFunctions,
                },
                show_name_of_base_product: showNameOfBaseProduct,
                singular_noun: singularNoun,
              },
              externalIDs: externalIds,
              modifiers,
              price,
              serviceDisable
            }}
            displayName={piDisplayNames[i]}
            setDisplayName={setPiDisplayName(i)}
            description={piDescriptions[i]}
            setDescription={setPiDescription(i)}
            shortcode={piShortcodes[i]}
            setShortcode={setPiShortcode(i)}
            ordinal={piOrdinals[i]}
            setOrdinal={setPiOrdinal(i)}
            externalIds={piExteralIdss[i]}
            setExternalIds={setPiExternalIds(i)}
            modifiers={piModifierss[i]}
            setModifiers={setPiModifiers(i)}
            //pos
            hideFromPos={piHideFromPoses[i]}
            setHideFromPos={setPiHideFromPos(i)}
            posName={piPosNames[i]}
            setPosName={setPiPosNames(i)}
            posSkipCustomization={piPosSkipCustomizations[i]}
            setPosSkipCustomization={setPiPosSkipCustomization(i)}
            // menu
            menuOrdinal={piMenuOrdinals[i]}
            setMenuOrdinal={setPiMenuOrdinal(i)}
            menuHide={piMenuHides[i]}
            setMenuHide={setPiMenuHide(i)}
            menuPriceDisplay={piMenuPriceDisplays[i]}
            setMenuPriceDisplay={setPiMenuPriceDisplay(i)}
            menuAdornment={piMenuAdornments[i]}
            setMenuAdornment={setPiMenuAdornment(i)}
            menuSuppressExhaustiveModifierList={piMenuSuppressExhaustiveModifierLists[i]}
            setMenuSuppressExhaustiveModifierList={setPiMenuSuppressExhaustiveModifierList(i)}
            menuShowModifierOptions={piMenuShowModifierOptionss[i]}
            setMenuShowModifierOptions={setPiMenuShowModifierOptions(i)}
            // order
            orderOrdinal={piOrderOrdinals[i]}
            setOrderOrdinal={setPiOrderOrdinal(i)}
            orderMenuHide={piOrderMenuHides[i]}
            setOrderMenuHide={setPiOrderMenuHide(i)}
            orderSkipCustomization={piOrderSkipCustomizations[i]}
            setOrderSkipCustomization={setPiOrderSkipCustomization(i)}
            orderPriceDisplay={piOrderPriceDisplays[i]}
            setOrderPriceDisplay={setPiOrderPriceDisplay(i)}
            orderAdornment={piOrderAdornments[i]}
            setOrderAdornment={setPiOrderAdornment(i)}
            orderSuppressExhaustiveModifierList={piOrderSuppressExhaustiveModifierLists[i]}
            setOrderSuppressExhaustiveModifierList={setPiOrderSuppressExhaustiveModifierList(i)}
          />
        </Grid>
      </AccordionDetails>
    </Accordion>), [isProcessing, copyPIFlags, indexOfBase, setIndexOfBase, expandedPanels, piDescriptions, piDisplayNames, piExteralIdss, piMenuAdornments, piMenuHides, piMenuOrdinals, piMenuPriceDisplays, piMenuShowModifierOptionss, piMenuSuppressExhaustiveModifierLists, piModifierss, piOrderAdornments, piOrderMenuHides, piOrderOrdinals, piOrderPriceDisplays, piOrderSuppressExhaustiveModifierLists, piOrdinals, piShortcodes, piOrderSkipCustomizations, setCopyPIFlag, setExpandedPanel, setPiDescription, setPiDisplayName, setPiExternalIds, setPiMenuAdornment, setPiMenuHide, setPiMenuOrdinal, setPiMenuPriceDisplay, setPiMenuShowModifierOptions, setPiMenuSuppressExhaustiveModifierList, setPiModifiers, setPiOrderAdornment, setPiOrderMenuHide, setPiOrderOrdinal, setPiOrderPriceDisplay, setPiOrderSuppressExhaustiveModifierList, setPiOrdinal, setPiShortcode, setPiOrderSkipCustomization, bakeDifferentialMax, bakeMax, disabled, externalIds, flavorMax, is3p, modifiers, orderGuideSuggestionFunctions, orderGuideWarningFunctions, parentCategories, price, printerGroup, serviceDisable, showNameOfBaseProduct, singularNoun, piHideFromPoses, setPiHideFromPos, piPosNames, setPiPosNames, availability, timing, piPosSkipCustomizations, setPiPosSkipCustomization])

  const getUncommittedProductInstanceForIndex = (i: number) => ({
    displayName: piDisplayNames[i],
    description: piDescriptions[i],
    shortcode: piShortcodes[i],
    ordinal: piOrdinals[i],
    modifiers: piModifierss[i],
    externalIDs: piExteralIdss[i],
    displayFlags: {
      pos: {
        name: piPosNames[i],
        hide: piHideFromPoses[i],
        skip_customization: modifiers.length === 0 || piPosSkipCustomizations[i],
      },
      menu: {
        ordinal: piMenuOrdinals[i],
        hide: piMenuHides[i],
        price_display: piMenuPriceDisplays[i],
        adornment: piMenuAdornments[i],
        suppress_exhaustive_modifier_list: piMenuSuppressExhaustiveModifierLists[i],
        show_modifier_options: piMenuShowModifierOptionss[i]
      },
      order: {
        ordinal: piOrderOrdinals[i],
        hide: piOrderMenuHides[i],
        skip_customization: modifiers.length === 0 || piOrderSkipCustomizations[i],
        price_display: piOrderPriceDisplays[i],
        adornment: piOrderAdornments[i],
        suppress_exhaustive_modifier_list: piOrderSuppressExhaustiveModifierLists[i]
      }
    }
  });
  const copyProduct = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const productCopyBody: CreateProductBatch = {
          product: {
            price,
            serviceDisable,
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
            disabled,
            availability,
            timing
          },
          instances: [
            getUncommittedProductInstanceForIndex(indexOfBase),
            ...productEntry.instances.flatMap((_x, i) => copyPIFlags[i] && indexOfBase !== i ?
              [getUncommittedProductInstanceForIndex(i)] : [])],
        };
        const response = await fetch(`${HOST_API}/api/v1/menu/product/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(productCopyBody),
        });
        if (response.status === 201) {
          enqueueSnackbar(`Created product instances: ${productEntry.instances.flatMap((_, i) => copyPIFlags[i] ? [piDisplayNames[i]] : []).join(', ')}.`);
          setIsProcessing(false);
          onCloseCallback();
        }
      } catch (error) {
        enqueueSnackbar(`Unable to create products, got error ${JSON.stringify(error, null, 2)}`, { variant: "error" });
        console.error(error);
      }
      setIsProcessing(false);
    }
  };

  return (
    <ProductComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void copyProduct()}
      isProcessing={isProcessing}
      disableConfirmOn={price.amount < 0 || indexOfBase === -1 || isProcessing}
      isEdit={false}
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
      children={productEntry.instances.map((_, i) => getProductInstanceEditor(i)
      )}
    />
  );
};

export default ProductCopyContainer;