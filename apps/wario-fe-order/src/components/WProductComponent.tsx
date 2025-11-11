import { type BoxProps } from '@mui/material/Box';

import { type WProductMetadata } from '@wcp/wario-shared';
import {
  ClickableProductDisplay as ClickableProductDisplayShared,
  ProductDisplay as ProductDisplayShared,
  SelectCatalogSelectors
} from '@wcp/wario-ux-shared';

import { useAppSelector } from '../app/useHooks';

interface WProductComponentProps {
  productMetadata: WProductMetadata;
  description?: boolean;
  allowAdornment?: boolean;
  dots?: boolean;
  displayContext: "order" | "menu";
  price?: boolean;
}

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