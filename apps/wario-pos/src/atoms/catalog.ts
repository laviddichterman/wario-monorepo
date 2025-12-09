import { atom } from 'jotai';

import { type GridRowId } from '@mui/x-data-grid-premium';

export interface DetailPanelSize {
  id: GridRowId;
  size: number;
}

export type CatalogDialog =
  | 'NONE'
  | 'CategoryInterstitial'
  | 'CategoryAdd'
  | 'CategoryEdit'
  | 'CategoryDelete'
  | 'ProductInterstitial'
  | 'ProductAdd'
  | 'ProductImport'
  | 'HierarchicalProductImport'
  | 'ProductEdit'
  | 'ProductDisableUntilEod'
  | 'ProductDisable'
  | 'ProductEnable'
  | 'ProductCopy'
  | 'ProductDelete'
  | 'ProductInstanceAdd'
  | 'ProductInstanceEdit'
  | 'ProductInstanceDelete'
  | 'ModifierTypeAdd'
  | 'ModifierTypeEdit'
  | 'ModifierTypeCopy'
  | 'ModifierTypeDelete'
  | 'ModifierOptionAdd'
  | 'ModifierOptionEdit'
  | 'ModifierOptionDelete'
  | 'ModifierOptionEnable'
  | 'ModifierOptionDisable'
  | 'ModifierOptionDisableUntilEod';

// Atoms
export const dialogueStateAtom = atom<CatalogDialog>('NONE');
export const hideDisabledProductsAtom = atom<boolean>(true);
export const selectedCategoryIdAtom = atom<string | null>(null);
export const selectedProductClassIdAtom = atom<string | null>(null);
export const selectedProductInstanceIdAtom = atom<string | null>(null);
export const selectedModifierOptionIdAtom = atom<string | null>(null);
export const selectedModifierTypeIdAtom = atom<string | null>(null);
export const detailPanelSizesAtom = atom<Record<GridRowId, DetailPanelSize>>({});

// Actions
export const closeDialogueAtom = atom(null, (_get, set) => {
  set(dialogueStateAtom, 'NONE');
  set(selectedCategoryIdAtom, null);
  set(selectedModifierOptionIdAtom, null);
  set(selectedModifierTypeIdAtom, null);
  set(selectedProductClassIdAtom, null);
  set(selectedProductInstanceIdAtom, null);
});

export const openProductInterstitialAtom = atom(null, (_get, set) => {
  set(dialogueStateAtom, 'ProductInterstitial');
});


export const openCategoryInterstitialAtom = atom(null, (_get, set) => {
  set(dialogueStateAtom, 'CategoryInterstitial');
});

export const openCategoryAddAtom = atom(null, (_get, set) => {
  set(dialogueStateAtom, 'CategoryAdd');
});

export const openCategoryEditAtom = atom(null, (_get, set, categoryId: string) => {
  set(selectedCategoryIdAtom, categoryId);
  set(dialogueStateAtom, 'CategoryEdit');
});

export const openCategoryDeleteAtom = atom(null, (_get, set, categoryId: string) => {
  set(selectedCategoryIdAtom, categoryId);
  set(dialogueStateAtom, 'CategoryDelete');
});

export const openProductClassAddAtom = atom(null, (_get, set) => {
  set(dialogueStateAtom, 'ProductAdd');
});

export const openProductImportAtom = atom(null, (_get, set) => {
  set(dialogueStateAtom, 'ProductImport');
});

export const openHierarchicalProductImportAtom = atom(null, (_get, set) => {
  set(dialogueStateAtom, 'HierarchicalProductImport');
});

export const openProductEditAtom = atom(null, (_get, set, productId: string) => {
  set(selectedProductClassIdAtom, productId);
  set(dialogueStateAtom, 'ProductEdit');
});

export const openProductDisableUntilEodAtom = atom(null, (_get, set, productId: string) => {
  set(selectedProductClassIdAtom, productId);
  set(dialogueStateAtom, 'ProductDisableUntilEod');
});

export const openProductDisableAtom = atom(null, (_get, set, productId: string) => {
  set(selectedProductClassIdAtom, productId);
  set(dialogueStateAtom, 'ProductDisable');
});

export const openProductEnableAtom = atom(null, (_get, set, productId: string) => {
  set(selectedProductClassIdAtom, productId);
  set(dialogueStateAtom, 'ProductEnable');
});

export const openProductCopyAtom = atom(null, (_get, set, productId: string) => {
  set(selectedProductClassIdAtom, productId);
  set(dialogueStateAtom, 'ProductCopy');
});

export const openProductDeleteAtom = atom(null, (_get, set, productId: string) => {
  set(selectedProductClassIdAtom, productId);
  set(dialogueStateAtom, 'ProductDelete');
});

export const openProductInstanceAddAtom = atom(null, (_get, set, parentProductId: string) => {
  set(selectedProductClassIdAtom, parentProductId);
  set(dialogueStateAtom, 'ProductInstanceAdd');
});

export const openProductInstanceEditAtom = atom(null, (_get, set, productInstanceId: string) => {
  set(selectedProductInstanceIdAtom, productInstanceId);
  set(dialogueStateAtom, 'ProductInstanceEdit');
});

export const openProductInstanceDeleteAtom = atom(null, (_get, set, productInstanceId: string) => {
  set(selectedProductInstanceIdAtom, productInstanceId);
  set(dialogueStateAtom, 'ProductInstanceDelete');
});

export const setDetailPanelSizeForRowIdAtom = atom(null, (get, set, { id, size }: { id: GridRowId; size: number }) => {
  const current = get(detailPanelSizesAtom);
  set(detailPanelSizesAtom, { ...current, [id]: { id: id, size: size } });
});

// Modifier Type Actions
export const openModifierTypeAddAtom = atom(null, (_get, set) => {
  set(dialogueStateAtom, 'ModifierTypeAdd');
});

export const openModifierTypeEditAtom = atom(null, (_get, set, modifierTypeId: string) => {
  set(selectedModifierTypeIdAtom, modifierTypeId);
  set(dialogueStateAtom, 'ModifierTypeEdit');
});

export const openModifierTypeCopyAtom = atom(null, (_get, set, modifierTypeId: string) => {
  set(selectedModifierTypeIdAtom, modifierTypeId);
  set(dialogueStateAtom, 'ModifierTypeCopy');
});

export const openModifierTypeDeleteAtom = atom(null, (_get, set, modifierTypeId: string) => {
  set(selectedModifierTypeIdAtom, modifierTypeId);
  set(dialogueStateAtom, 'ModifierTypeDelete');
});

// Modifier Option Actions
export const openModifierOptionAddAtom = atom(null, (_get, set, modifierTypeId: string) => {
  set(selectedModifierTypeIdAtom, modifierTypeId);
  set(dialogueStateAtom, 'ModifierOptionAdd');
});

export const openModifierOptionEditAtom = atom(null, (_get, set, modifierOptionId: string) => {
  set(selectedModifierOptionIdAtom, modifierOptionId);
  set(dialogueStateAtom, 'ModifierOptionEdit');
});

export const openModifierOptionDeleteAtom = atom(null, (_get, set, modifierOptionId: string) => {
  set(selectedModifierOptionIdAtom, modifierOptionId);
  set(dialogueStateAtom, 'ModifierOptionDelete');
});

export const openModifierOptionDisableUntilEodAtom = atom(null, (_get, set, modifierOptionId: string) => {
  set(selectedModifierOptionIdAtom, modifierOptionId);
  set(dialogueStateAtom, 'ModifierOptionDisableUntilEod');
});

export const openModifierOptionDisableAtom = atom(null, (_get, set, modifierOptionId: string) => {
  set(selectedModifierOptionIdAtom, modifierOptionId);
  set(dialogueStateAtom, 'ModifierOptionDisable');
});

export const openModifierOptionEnableAtom = atom(null, (_get, set, modifierOptionId: string) => {
  set(selectedModifierOptionIdAtom, modifierOptionId);
  set(dialogueStateAtom, 'ModifierOptionEnable');
});
