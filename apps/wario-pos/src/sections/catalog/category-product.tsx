import { useAtom, useSetAtom } from 'jotai';
import { useMemo } from 'react';

import AddBox from '@mui/icons-material/AddBox';
import { FormControlLabel, IconButton, Switch, Tooltip } from '@mui/material';
import Grid from '@mui/material/Grid';
import type { SxProps, Theme } from '@mui/material/styles';

import { paths } from '@/routes/paths';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import CategoryDialoguesContainer from '@/components/wario/menu/category-dialogues.container';
import CategoryInterstitialContainer from '@/components/wario/menu/category-interstitial.container';
import CategoryTableContainer from '@/components/wario/menu/category/category_table.container';
import ProductDialoguesContainer from '@/components/wario/menu/product-dialogues.container';

import { hideDisabledProductsAtom, openCategoryInterstitialAtom } from '@/atoms/catalog';
import { DashboardContent } from '@/layouts/dashboard';

// ----------------------------------------------------------------------

type Props = {
  title?: string;
  description?: string;
  sx?: SxProps<Theme>;
};

export function CatalogCategoryProductView(_props: Props) {
  const [hideDisabled, setHideDisabled] = useAtom(hideDisabledProductsAtom);
  const openCategoryInterstitial = useSetAtom(openCategoryInterstitialAtom);

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
                openCategoryInterstitial();
              }}
            >
              <AddBox />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [setHideDisabled, openCategoryInterstitial, hideDisabled],
  );

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Category Product Tree"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Catalog Category Tree', href: paths.dashboard.catalog.root },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Grid container spacing={2}>
          <Grid size={12}>
            <CategoryTableContainer toolbarActions={toolbarActions} />
          </Grid>
        </Grid>
        <CategoryDialoguesContainer />
        <CategoryInterstitialContainer />
        <ProductDialoguesContainer />
      </DashboardContent>
    </>
  );
}
