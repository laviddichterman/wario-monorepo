import { DialogContainer } from "@wcp/wario-ux-shared";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";

import { closeDialogue, openCategoryAdd, openHierarchicalProductImport, openProductClassAdd, openProductImport } from '@/redux/slices/CatalogSlice';
import { selectBaseProductName } from "@/redux/store";

import InterstitialDialog from "../interstitial.dialog.component";

import CategoryAddContainer from "./category/category.add.container";
import CategoryDeleteContainer from "./category/category.delete.container";
import CategoryEditContainer from "./category/category.edit.container";
import HierarchicalProductImportContainer from "./product/hierarchical_product.import.container";
import ProductInstanceAddContainer from "./product/instance/product_instance.add.container";
import ProductInstanceDeleteContainer from "./product/instance/product_instance.delete.container";
import ProductInstanceEditContainer from "./product/instance/product_instance.edit.container";
import ProductAddContainer from "./product/product.add.container";
import ProductCopyContainer from "./product/product.copy.container";
import ProductDeleteContainer from "./product/product.delete.container";
import ProductDisableContainer from "./product/product.disable.container";
import ProductDisableUntilEodContainer from "./product/product.disable_until_eod.container";
import ProductEditContainer from "./product/product.edit.container";
import ProductEnableContainer from "./product/product.enable.container";
import ProductImportContainer from "./product/product.import.container";

const CategoryDialoguesContainer = () => {
  const dispatch = useAppDispatch();
  const dialogueState = useAppSelector(s => s.catalog.dialogueState);
  const selectedCategoryId = useAppSelector(s => s.catalog.selectedCategoryId);
  const selectedProductClassId = useAppSelector(s => s.catalog.selectedProductClassId);
  const selectedProductInstanceId = useAppSelector(s => s.catalog.selectedProductInstanceId);
  const selectedProductClassBaseProductInstanceName = useAppSelector(s => s.catalog.selectedProductClassId ? selectBaseProductName(s, s.catalog.selectedProductClassId) : "");
  return (
    <>
      <InterstitialDialog
        dialogTitle={"Add new..."}
        options={[
          {
            title: "Add Category",
            cb: () => { dispatch(openCategoryAdd()) },
            open: dialogueState === 'CategoryAdd',
            onClose: () => dispatch(closeDialogue()),
            component: (
              <CategoryAddContainer
                onCloseCallback={() => { dispatch(closeDialogue()) }}
              />
            ),
          },
          {
            title: "Add Product",
            cb: () => { dispatch(openProductClassAdd()) },
            open: dialogueState === 'ProductAdd',
            onClose: () => dispatch(closeDialogue()),
            component: (
              <ProductAddContainer
                onCloseCallback={() => { dispatch(closeDialogue()) }}
              />
            ),
          },
          {
            title: "Import Products",
            cb: () => { dispatch(openProductImport()) },
            open: dialogueState === 'ProductImport',
            onClose: () => dispatch(closeDialogue()),
            component: (
              <ProductImportContainer
                onCloseCallback={() => { dispatch(closeDialogue()) }}
              />
            ),
          },
          {
            title: "Import Hierarchical Products",
            cb: () => { dispatch(openHierarchicalProductImport()) },
            open: dialogueState === 'HierarchicalProductImport',
            onClose: () => dispatch(closeDialogue()),
            component: (
              <HierarchicalProductImportContainer
                onCloseCallback={() => { dispatch(closeDialogue()) }}
              />
            ),
          },
        ]}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'CategoryInterstitial'}
      />
      <DialogContainer
        title={"Edit Category"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'CategoryEdit'}
        innerComponent={
          selectedCategoryId !== null && <CategoryEditContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            categoryId={selectedCategoryId}
          />
        }
      />
      <DialogContainer
        title={"Delete Category"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'CategoryDelete'}
        innerComponent={
          selectedCategoryId !== null && <CategoryDeleteContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            categoryId={selectedCategoryId}
          />
        }
      />
      <DialogContainer
        maxWidth={"xl"}
        title={"Edit Product"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ProductEdit'}
        innerComponent={
          selectedProductClassId !== null &&
          <ProductEditContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            product_id={selectedProductClassId}
          />
        }
      />
      <DialogContainer
        title={"Disable Product Until End-of-Day"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ProductDisableUntilEod'}
        innerComponent={
          selectedProductClassId !== null &&
          <ProductDisableUntilEodContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            product_id={selectedProductClassId}
          />
        }
      />
      <DialogContainer
        title={"Disable Product"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ProductDisable'}
        innerComponent={
          selectedProductClassId !== null &&
          <ProductDisableContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            product_id={selectedProductClassId}
          />
        }
      />
      <DialogContainer
        title={"Enable Product"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ProductEnable'}
        innerComponent={
          selectedProductClassId !== null &&
          <ProductEnableContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            product_id={selectedProductClassId}
          />
        }
      />
      <DialogContainer
        maxWidth={"xl"}
        title={"Copy Product"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ProductCopy'}
        innerComponent={
          selectedProductClassId !== null &&
          <ProductCopyContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            product_id={selectedProductClassId}
          />
        }
      />
      <DialogContainer
        title={"Delete Product"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ProductDelete'}
        innerComponent={
          selectedProductClassId !== null &&
          <ProductDeleteContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            product_id={selectedProductClassId}
          />
        }
      />
      <DialogContainer
        maxWidth={"xl"}
        title={`Add Product Instance for: ${selectedProductClassBaseProductInstanceName}`}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ProductInstanceAdd'}
        innerComponent={
          selectedProductClassId !== null &&
          <ProductInstanceAddContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            parent_product_id={selectedProductClassId}
          />
        }
      />
      <DialogContainer
        maxWidth={"xl"}
        title={"Edit Product Instance"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ProductInstanceEdit'}
        innerComponent={
          selectedProductInstanceId !== null &&
          <ProductInstanceEditContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            product_instance_id={selectedProductInstanceId}
          />
        }
      />
      <DialogContainer
        title={"Delete Product Instance"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ProductInstanceDelete'}
        innerComponent={
          selectedProductInstanceId !== null &&
          <ProductInstanceDeleteContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            product_instance_id={selectedProductInstanceId}
          />
        }
      />
    </>
  );
};

export default CategoryDialoguesContainer;
