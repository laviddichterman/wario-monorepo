import { useAtomValue, useSetAtom } from 'jotai';

import { DialogContainer } from '@wcp/wario-ux-shared/containers';
import { useBaseProductNameByProductId } from '@wcp/wario-ux-shared/query';

import {
  closeDialogueAtom,
  dialogueStateAtom,
  selectedProductClassIdAtom,
  selectedProductInstanceIdAtom,
} from '@/atoms/catalog';

import ProductInstanceAddContainer from './product/instance/product_instance.add.container';
import ProductInstanceDeleteContainer from './product/instance/product_instance.delete.container';
import ProductInstanceEditContainer from './product/instance/product_instance.edit.container';
import { ProductCopyContainer } from './product/product.copy.container';
import ProductDeleteContainer from './product/product.delete.container';
import ProductDisableContainer from './product/product.disable.container';
import ProductDisableUntilEodContainer from './product/product.disable_until_eod.container';
import ProductEditContainer from './product/product.edit.container';
import ProductEnableContainer from './product/product.enable.container';

const ProductInstanceAddDialogue = () => {
  const selectedProductClassId = useAtomValue(selectedProductClassIdAtom);
  const closeDialogue = useSetAtom(closeDialogueAtom);
  const dialogueState = useAtomValue(dialogueStateAtom);

  // Only fetch base name when dialog is open and we have a valid ID
  const isOpen = dialogueState === 'ProductInstanceAdd' && selectedProductClassId !== null;
  const baseName = useBaseProductNameByProductId(isOpen ? selectedProductClassId : '');

  if (!isOpen) {
    return null;
  }

  return (
    <DialogContainer
      maxWidth={'xl'}
      title={`Add Product Instance for: ${baseName}`}
      onClose={() => {
        closeDialogue();
      }}
      open={true}
      innerComponent={
        <ProductInstanceAddContainer
          onCloseCallback={() => {
            closeDialogue();
          }}
          parent_product_id={selectedProductClassId}
        />
      }
    />
  );
};

const ProductDialoguesContainer = () => {
  const dialogueState = useAtomValue(dialogueStateAtom);
  const selectedProductClassId = useAtomValue(selectedProductClassIdAtom);
  const selectedProductInstanceId = useAtomValue(selectedProductInstanceIdAtom);

  const closeDialogue = useSetAtom(closeDialogueAtom);

  return (
    <>
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
      <ProductInstanceAddDialogue />
      {dialogueState === 'ProductInstanceEdit' &&
        selectedProductInstanceId !== null &&
        selectedProductClassId !== null && (
          <ProductInstanceEditContainer
            onCloseCallback={() => {
              closeDialogue();
            }}
            product_id={selectedProductClassId}
            product_instance_id={selectedProductInstanceId}
          />
        )}
      <DialogContainer
        title={'Delete Product Instance'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ProductInstanceDelete'}
        innerComponent={
          selectedProductInstanceId !== null &&
          selectedProductClassId !== null && (
            <ProductInstanceDeleteContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              product_id={selectedProductClassId}
              product_instance_id={selectedProductInstanceId}
            />
          )
        }
      />
    </>
  );
};

export default ProductDialoguesContainer;
