import { ProductDisplay as ProductDisplayShared, ClickableProductDisplay as ClickableProductDisplayShared, SelectCatalogSelectors } from '@wcp/wario-ux-shared';
import { WProductMetadata } from '@wcp/wcpshared';
import { useAppSelector } from '../app/useHooks';
import { BoxProps } from '@mui/material';

interface WProductComponentProps {
  productMetadata: WProductMetadata;
  description?: boolean;
  allowAdornment?: boolean;
  dots?: boolean;
  displayContext: "order" | "menu";
  price?: boolean;
};

export const ProductDisplay = (props: WProductComponentProps & BoxProps) => {
  const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));
  return <ProductDisplayShared
    catalogSelectors={catalogSelectors}
    {...props}
  />;
};

export const ClickableProductDisplay = (props: WProductComponentProps & BoxProps) => {
  const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));
  return <ClickableProductDisplayShared
    catalogSelectors={catalogSelectors}
    {...props}
  />;
};