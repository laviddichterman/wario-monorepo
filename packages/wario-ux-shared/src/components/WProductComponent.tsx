import { Box } from '@mui/material';
import type { BoxProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ComputePotentialPrices, MoneyToDisplayString, PriceDisplay, WProductDisplayOptions } from '@wcp/wario-shared';
import type { ICatalogSelectors, WProductMetadata } from '@wcp/wario-shared';
import { useMemo } from 'react';
import { AdornedSxProps, Dots, ProductAdornment, ProductDescription, ProductPrice, ProductTitle } from '../styled/styled';

interface WProductComponentProps {
  catalogSelectors: ICatalogSelectors;
  productMetadata: WProductMetadata;
  description?: boolean;
  allowAdornment?: boolean;
  dots?: boolean;
  displayContext: "order" | "menu";
  price?: boolean;
};

function WProductComponent({ catalogSelectors, productMetadata, description, allowAdornment, dots, displayContext, price, sx, ...other }: WProductComponentProps & BoxProps) {
  const productInstance = useMemo(() => catalogSelectors.productInstance(productMetadata.pi[0]), [catalogSelectors.productInstance, productMetadata.pi])
  const adornmentHTML = useMemo(() => allowAdornment && productInstance && productInstance.displayFlags[displayContext].adornment ? productInstance.displayFlags[displayContext].adornment : "", [allowAdornment, productInstance, displayContext]);
  const descriptionHTML = useMemo(() => description && productMetadata.description ? productMetadata.description : "", [description, productMetadata.description]);
  const optionsSections = useMemo(() => {
    if (!description || !productInstance || productInstance.displayFlags[displayContext].suppress_exhaustive_modifier_list) {
      return [[]];
    }
    const options = WProductDisplayOptions(catalogSelectors, productMetadata.exhaustive_modifiers);
    return !(options.length === 1 && options[0][1] === productMetadata.name) ? options : [[]];
  }, [description, displayContext, productInstance, productMetadata.exhaustive_modifiers, productMetadata.name]);
  const priceText = useMemo(() => {
    if (productInstance && productMetadata.incomplete) {
      switch (productInstance.displayFlags[displayContext].price_display) {
        case PriceDisplay.FROM_X: return `from ${MoneyToDisplayString(productMetadata.price, false)}`;
        case PriceDisplay.VARIES: return "MP";
        case PriceDisplay.MIN_TO_MAX: {
          const prices = ComputePotentialPrices(productMetadata, catalogSelectors);
          return prices.length > 1 && prices[0] !== prices[prices.length - 1] ? `from ${MoneyToDisplayString(prices[0], false)} to ${MoneyToDisplayString(prices[prices.length - 1], false)}` : `${prices[0]}`;
        }
        case PriceDisplay.LIST: return ComputePotentialPrices(productMetadata, catalogSelectors).map(x => MoneyToDisplayString(x, false)).join("/");
        case PriceDisplay.ALWAYS: default: return `${MoneyToDisplayString(productMetadata.price, false)}`;
      }
    }
    return MoneyToDisplayString(productMetadata.price, false);
  }, [productInstance, productMetadata, displayContext, catalogSelectors]);
  return (
    <Box component='div' {...other} sx={adornmentHTML ? {
      ...sx,
      ...AdornedSxProps
    } : { ...sx }} >
      {adornmentHTML ? <ProductAdornment dangerouslySetInnerHTML={{ __html: adornmentHTML }} /> : ""}
      {/* margin right is determined based on the length of the price text "from 21.00" takes up 6em, thus the priceText.length * .6 calculation */}
      <Box sx={{ position: "relative", ...(price ? { mr: `${priceText.length * .6}em` } : {}) }}><ProductTitle sx={dots ? { bgcolor: "#fff" } : {}}>{productMetadata.name}</ProductTitle></Box>
      {price && <ProductPrice sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 1, float: 'right', ...(dots ? { bgcolor: "#fff", zIndex: 9 } : {})
      }}>{priceText}</ProductPrice>}
      {dots && <Dots />}
      {descriptionHTML &&
        <span><ProductDescription dangerouslySetInnerHTML={{ __html: descriptionHTML }} /></span>}
      {/* split up pre-set description and the selected options, if both exist */}
      {descriptionHTML && description && optionsSections ? <br /> : ""}
      {description && optionsSections && optionsSections.map((option_section, l) =>
        <ProductDescription key={l} >
          <>
            {productMetadata.is_split ? <span ><strong>{option_section[0]}: </strong></span> : ""}
            <span>{option_section[1]}</span>
          </>
        </ProductDescription>)}

    </Box>)
};


export const ProductDisplay = styled(WProductComponent)(() => ({
  position: 'relative',
}));

export const ClickableProductDisplay = styled(ProductDisplay)(() => ({
  cursor: "pointer",
  "&:hover": {
    color: "#c59d5f",
    '& span > span': {
      color: "#c59d5f"
    }
  },
  '& span > span': {
    fontSize: "0.85em",
  }
}));