import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useMemo } from 'react';

import { AddBox } from '@mui/icons-material';
import { FormControlLabel, IconButton, Switch, Tooltip } from '@mui/material';
import Grid from '@mui/material/Grid';
import type { SxProps, Theme } from '@mui/material/styles';

import { useCatalogQuery } from '@wcp/wario-ux-shared/query';

import { paths } from '@/routes/paths';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import ProductDialoguesContainer from '@/components/wario/menu/product-dialogues.container';
import ProductInterstitialContainer from '@/components/wario/menu/product-interstitial.container';
import ProductTableContainer from '@/components/wario/menu/product/product_table.container';

import { hideDisabledProductsAtom, openProductInterstitialAtom } from '@/atoms/catalog';
import { DashboardContent } from '@/layouts/dashboard';

// ----------------------------------------------------------------------

type Props = {
  title?: string;
  description?: string;
  sx?: SxProps<Theme>;
};

const useProductIdsAfterDisableFilter = () => {
  const hideDisabledProducts = useAtomValue(hideDisabledProductsAtom);
  const { data: catalog } = useCatalogQuery();

  return useMemo(() => {
    if (!catalog) return [];
    const products = Object.values(catalog.products);
    const filteredProducts = !hideDisabledProducts
      ? products
      : products.filter((x) => !x.disabled || x.disabled.start <= x.disabled.end);

    return filteredProducts.map((x) => x.id);
  }, [catalog, hideDisabledProducts]);
};

export function CatalogProductView(_props: Props) {
  const productsAfterDisableFilter = useProductIdsAfterDisableFilter();
  const [hideDisabled, setHideDisabled] = useAtom(hideDisabledProductsAtom);
  const openProductInterstitial = useSetAtom(openProductInterstitialAtom);

  const toolbarActions = useMemo(
    () => [
      {
        size: 4,
        elt: (
          <FormControlLabel
            sx={{ mx: 2 }}
            key="HIDE"
            control={
              <Switch
                checked={hideDisabled}
                onChange={(e) => {
                  setHideDisabled(e.target.checked);
                }}
                name="Hide Disabled"
              />
            }
            labelPlacement="end"
            label="Hide Disabled"
          />
        ),
      },
      {
        size: 1,
        elt: (
          <Tooltip key="AddNew" title="Add new...">
            <IconButton
              onClick={() => {
                openProductInterstitial();
              }}
            >
              <AddBox />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [setHideDisabled, openProductInterstitial, hideDisabled],
  );
  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Products"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Catalog', href: paths.dashboard.catalog.root },
            { name: 'Products' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Grid container spacing={2}>
          <Grid size={12}>
            <ProductTableContainer
              title="Product Table View"
              disableToolbar={false}
              pagination={true}
              toolbarActions={toolbarActions}
              product_ids={productsAfterDisableFilter}
              setPanelsExpandedSize={() => 0} // no need for the panels expanded size here... i don't think
            />
          </Grid>
        </Grid>
        <ProductDialoguesContainer />
        <ProductInterstitialContainer />
      </DashboardContent>
    </>
  );
}
