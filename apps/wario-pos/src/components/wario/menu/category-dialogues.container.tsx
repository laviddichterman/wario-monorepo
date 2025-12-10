import { useAtomValue, useSetAtom } from 'jotai';

import { DialogContainer } from '@wcp/wario-ux-shared/containers';

import { closeDialogueAtom, dialogueStateAtom, selectedCategoryIdAtom } from '@/atoms/catalog';

import CategoryDeleteContainer from './category/category.delete.container';
import CategoryEditContainer from './category/category.edit.container';

const CategoryDialoguesContainer = () => {
  const dialogueState = useAtomValue(dialogueStateAtom);
  const selectedCategoryId = useAtomValue(selectedCategoryIdAtom);

  const closeDialogue = useSetAtom(closeDialogueAtom);

  return (
    <>
      {dialogueState === 'CategoryEdit' && selectedCategoryId !== null && (
        <CategoryEditContainer
          onCloseCallback={() => {
            closeDialogue();
          }}
          categoryId={selectedCategoryId}
        />
      )}
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
    </>
  );
};

export default CategoryDialoguesContainer;
