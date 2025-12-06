import { useAtomValue, useSetAtom } from 'jotai';

import { DialogContainer } from '@wcp/wario-ux-shared/containers';
import { useBaseProductNameByProductId } from '@wcp/wario-ux-shared/query';

import {
  closeDialogueAtom,
  dialogueStateAtom,
  openCategoryAddAtom,
  openHierarchicalProductImportAtom,
  openProductClassAddAtom,
  openProductImportAtom,
  selectedCategoryIdAtom,
  selectedProductClassIdAtom,
  selectedProductInstanceIdAtom,
} from '@/atoms/catalog';

import InterstitialDialog from '../interstitial.dialog.component';

import CategoryAddContainer from './category/category.add.container';
import CategoryDeleteContainer from './category/category.delete.container';
import CategoryEditContainer from './category/category.edit.container';
import HierarchicalProductImportContainer from './product/hierarchical_product.import.container';
import ProductInstanceAddContainer from './product/instance/product_instance.add.container';
import ProductInstanceDeleteContainer from './product/instance/product_instance.delete.container';
import ProductInstanceEditContainer from './product/instance/product_instance.edit.container';
import ProductAddContainer from './product/product.add.container';
import { ProductCopyContainer } from './product/product.copy.container';
import ProductDeleteContainer from './product/product.delete.container';
import ProductDisableContainer from './product/product.disable.container';
import ProductDisableUntilEodContainer from './product/product.disable_until_eod.container';
import ProductEditContainer from './product/product.edit.container';
import ProductEnableContainer from './product/product.enable.container';
import ProductImportContainer from './product/product.import.container';

const CategoryDialoguesContainer = () => {
  const dialogueState = useAtomValue(dialogueStateAtom);
  const selectedCategoryId = useAtomValue(selectedCategoryIdAtom);
  const selectedProductClassId = useAtomValue(selectedProductClassIdAtom);
  const selectedProductInstanceId = useAtomValue(selectedProductInstanceIdAtom);

  const baseProductName = useBaseProductNameByProductId(selectedProductClassId || '');
  const selectedProductClassBaseProductInstanceName = selectedProductClassId ? baseProductName : '';

  const closeDialogue = useSetAtom(closeDialogueAtom);
  const openCategoryAdd = useSetAtom(openCategoryAddAtom);
  const openProductClassAdd = useSetAtom(openProductClassAddAtom);
  const openProductImport = useSetAtom(openProductImportAtom);
  const openHierarchicalProductImport = useSetAtom(openHierarchicalProductImportAtom);

  return (
    <>
      <InterstitialDialog
        dialogTitle={'Add new...'}
        options={[
          {
            title: 'Add Category',
            cb: () => {
              openCategoryAdd();
            },
            open: dialogueState === 'CategoryAdd',
            onClose: () => {
              closeDialogue();
            },
            component: (
              <CategoryAddContainer
                onCloseCallback={() => {
                  closeDialogue();
                }}
              />
            ),
          },
          {
            title: 'Add Product',
            cb: () => {
              openProductClassAdd();
            },
            open: dialogueState === 'ProductAdd',
            onClose: () => {
              closeDialogue();
            },
            component: (
              <ProductAddContainer
                onCloseCallback={() => {
                  closeDialogue();
                }}
              />
            ),
          },
          {
            title: 'Import Products',
            cb: () => {
              openProductImport();
            },
            open: dialogueState === 'ProductImport',
            onClose: () => {
              closeDialogue();
            },
            component: (
              <ProductImportContainer
                onCloseCallback={() => {
                  closeDialogue();
                }}
              />
            ),
          },
          {
            title: 'Import Hierarchical Products',
            cb: () => {
              openHierarchicalProductImport();
            },
            open: dialogueState === 'HierarchicalProductImport',
            onClose: () => {
              closeDialogue();
            },
            component: (
              <HierarchicalProductImportContainer
                onCloseCallback={() => {
                  closeDialogue();
                }}
              />
            ),
          },
        ]}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'CategoryInterstitial'}
      />
      <DialogContainer
        title={'Edit Category'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'CategoryEdit'}
        innerComponent={
          selectedCategoryId !== null && (
            <CategoryEditContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              categoryId={selectedCategoryId}
            />
          )
        }
      />
      <DialogContainer
        title={'Delete Category'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'CategoryDelete'}
        innerComponent={
          selectedCategoryId !== null && (
            <CategoryDeleteContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              categoryId={selectedCategoryId}
            />
          )
        }
      />
      <DialogContainer
        maxWidth={'xl'}
        title={'Edit Product'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ProductEdit'}
        innerComponent={
          selectedProductClassId !== null && (
            <ProductEditContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              product_id={selectedProductClassId}
            />
          )
        }
      />
      <DialogContainer
        title={'Disable Product Until End-of-Day'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ProductDisableUntilEod'}
        innerComponent={
          selectedProductClassId !== null && (
            <ProductDisableUntilEodContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              product_id={selectedProductClassId}
            />
          )
        }
      />
      <DialogContainer
        title={'Disable Product'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ProductDisable'}
        innerComponent={
          selectedProductClassId !== null && (
            <ProductDisableContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              product_id={selectedProductClassId}
            />
          )
        }
      />
      <DialogContainer
        title={'Enable Product'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ProductEnable'}
        innerComponent={
          selectedProductClassId !== null && (
            <ProductEnableContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              product_id={selectedProductClassId}
            />
          )
        }
      />
      <DialogContainer
        maxWidth={'xl'}
        title={'Copy Product'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ProductCopy'}
        innerComponent={
          selectedProductClassId !== null && (
            <ProductCopyContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              product_id={selectedProductClassId}
            />
          )
        }
      />
      <DialogContainer
        title={'Delete Product'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ProductDelete'}
        innerComponent={
          selectedProductClassId !== null && (
            <ProductDeleteContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              product_id={selectedProductClassId}
            />
          )
        }
      />
      <DialogContainer
        maxWidth={'xl'}
        title={`Add Product Instance for: ${selectedProductClassBaseProductInstanceName}`}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ProductInstanceAdd'}
        innerComponent={
          selectedProductClassId !== null && (
            <ProductInstanceAddContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              parent_product_id={selectedProductClassId}
            />
          )
        }
      />
      <DialogContainer
        maxWidth={'xl'}
        title={'Edit Product Instance'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ProductInstanceEdit'}
        innerComponent={
          selectedProductInstanceId !== null && (
            <ProductInstanceEditContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              product_instance_id={selectedProductInstanceId}
            />
          )
        }
      />
      <DialogContainer
        title={'Delete Product Instance'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ProductInstanceDelete'}
        innerComponent={
          selectedProductInstanceId !== null && (
            <ProductInstanceDeleteContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              product_instance_id={selectedProductInstanceId}
            />
          )
        }
      />
    </>
  );
};

export default CategoryDialoguesContainer;
