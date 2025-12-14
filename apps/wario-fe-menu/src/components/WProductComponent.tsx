import { type BoxProps } from '@mui/material/Box';

import { type ICatalogSelectors, type WProductMetadata } from '@wcp/wario-shared/types';
import {
  ClickableProductDisplay as ClickableProductDisplayShared,
  ProductDisplay as ProductDisplayShared,
} from '@wcp/wario-ux-shared/components';
import { useCatalogSelectors } from '@wcp/wario-ux-shared/query';

interface WProductComponentProps {
  productMetadata: WProductMetadata;
  description?: boolean;
  allowAdornment?: boolean;
  dots?: boolean;
  displayContext: 'order' | 'menu';
  price?: boolean;
}

export const ProductDisplay = (props: WProductComponentProps & BoxProps) => {
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  return <ProductDisplayShared catalogSelectors={catalogSelectors} {...props} />;
};

export const ClickableProductDisplay = (props: WProductComponentProps & BoxProps) => {
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  return <ClickableProductDisplayShared catalogSelectors={catalogSelectors} {...props} />;
};
