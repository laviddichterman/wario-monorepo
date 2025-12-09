import { useAtomValue, useSetAtom } from 'jotai';

import {
  closeDialogueAtom,
  dialogueStateAtom,
  openHierarchicalProductImportAtom,
  openProductClassAddAtom,
  openProductImportAtom,
} from '@/atoms/catalog';

import InterstitialDialog from '../interstitial.dialog.component';

import HierarchicalProductImportContainer from './product/hierarchical_product.import.container';
import ProductAddContainer from './product/product.add.container';
import ProductImportContainer from './product/product.import.container';

const ProductInterstitialContainer = () => {
  const dialogueState = useAtomValue(dialogueStateAtom);

  const closeDialogue = useSetAtom(closeDialogueAtom);
  const openProductClassAdd = useSetAtom(openProductClassAddAtom);
  const openProductImport = useSetAtom(openProductImportAtom);
  const openHierarchicalProductImport = useSetAtom(openHierarchicalProductImportAtom);

  return (
    <InterstitialDialog
      dialogTitle={'Add new...'}
      options={[
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
      open={dialogueState === 'ProductInterstitial'}
    />
  );
};

export default ProductInterstitialContainer;
