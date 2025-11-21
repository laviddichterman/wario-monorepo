import { useMemo } from "react";

import { AddBox } from "@mui/icons-material";
import { FormControlLabel, IconButton, Switch, Tooltip } from "@mui/material";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";

import { openCategoryInterstitial, setEnableCategoryTreeView, setHideDisabled } from '@/redux/slices/CatalogSlice';
import { selectProductIdsAfterDisableFilter } from "@/redux/store";

import { type ToolbarAction } from "../../table_wrapper.component";
import ProductTableContainer from "../product/product_table.container";

import CategoryTableContainer from "./category_table.container";

interface CategoryTableContainerProps {
  toolbarActions?: ToolbarAction[];
}
const AllProductsTableContainer = (props: CategoryTableContainerProps) => {
  const productsAfterDisableFilter = useAppSelector(selectProductIdsAfterDisableFilter);
  return <ProductTableContainer
    title="Product Table View"
    disableToolbar={false}
    pagination={true}
    toolbarActions={props.toolbarActions}
    product_ids={productsAfterDisableFilter}
    setPanelsExpandedSize={() => (0)} // no need for the panels expanded size here... i don't think
  />
}


const CatalogTableContainer = () => {
  const dispatch = useAppDispatch();
  const hideDisabled = useAppSelector(s => s.catalog.hideDisabledProducts);
  const enableCategoryTreeView = useAppSelector(s => s.catalog.enableCategoryTreeView);
  const toolbarActions = useMemo(() => [
    {
      size: 4,
      elt: <FormControlLabel
        sx={{ mx: 2 }}
        key="HIDE"
        control={<Switch
          checked={hideDisabled}
          onChange={e => dispatch(setHideDisabled(e.target.checked))}
          name="Hide Disabled" />}
        labelPlacement="end"
        label="Hide Disabled" />
    },
    {
      size: 4,
      elt: <FormControlLabel
        sx={{ mx: 2 }}
        key="TOGGLECAT"
        control={<Switch
          checked={enableCategoryTreeView}
          onChange={e => dispatch(setEnableCategoryTreeView(e.target.checked))}
          name="Category Tree View" />}
        labelPlacement="end"
        label="Category Tree View" />
    },
    {
      size: 1,
      elt: <Tooltip key="AddNew" title="Add new..."><IconButton onClick={() => dispatch(openCategoryInterstitial())}><AddBox /></IconButton></Tooltip>
    }
  ], [dispatch, enableCategoryTreeView, hideDisabled]);

  return (enableCategoryTreeView ?
    <CategoryTableContainer toolbarActions={toolbarActions} /> :
    <AllProductsTableContainer toolbarActions={toolbarActions} />
  );
};

export default CatalogTableContainer;
