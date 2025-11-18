import { createEntityAdapter, createSlice, type EntityState, type PayloadAction } from "@reduxjs/toolkit";

import { type GridRowId } from "@mui/x-data-grid-premium";

type CatalogDialog = 'NONE' |
  'CategoryInterstitial' | 'CategoryAdd' | 'CategoryEdit' | 'CategoryDelete' |
  'ProductAdd' | 'ProductImport' | 'HierarchicalProductImport' | 'ProductEdit' | 'ProductDisableUntilEod' | 'ProductDisable' | 'ProductEnable' | 'ProductDelete' | 'ProductCopy' |
  'ProductInstanceAdd' | 'ProductInstanceDelete' | 'ProductInstanceEdit' |
  'ModifierTypeAdd' | 'ModifierTypeEdit' | 'ModifierTypeCopy' | 'ModifierTypeDelete' |
  'ModifierOptionAdd' | 'ModifierOptionEdit' | 'ModifierOptionDelete' | 'ModifierOptionEnable' | 'ModifierOptionDisable' | 'ModifierOptionDisableUntilEod'

export interface DetailPanelSize { id: GridRowId; size: number; };
const CatalogDetailPanelSizeAdapter = createEntityAdapter<DetailPanelSize>();
export interface CatalogManagerState {
  dialogueState: CatalogDialog;
  enableCategoryTreeView: boolean;
  hideDisabledProducts: boolean;
  selectedCategoryId: string | null;
  selectedProductClassId: string | null;
  selectedProductInstanceId: string | null;
  selectedModifierOptionId: string | null;
  selectedModifierTypeId: string | null;
  detailPanelSizes: EntityState<DetailPanelSize, GridRowId>;
}

const initialState: CatalogManagerState = {
  dialogueState: 'NONE',
  enableCategoryTreeView: true,
  selectedCategoryId: null,
  selectedModifierOptionId: null,
  selectedModifierTypeId: null,
  selectedProductClassId: null,
  selectedProductInstanceId: null,
  hideDisabledProducts: true,
  detailPanelSizes: CatalogDetailPanelSizeAdapter.getInitialState()
}



const CatalogManagerSlice = createSlice({
  name: 'catalogManager',
  initialState,
  reducers: {
    setHideDisabled(state, action: PayloadAction<boolean>) {
      state.hideDisabledProducts = action.payload;
    },
    setEnableCategoryTreeView(state, action: PayloadAction<boolean>) {
      state.enableCategoryTreeView = action.payload;
    },
    closeDialogue(state) {
      state.dialogueState = 'NONE';
      state.selectedCategoryId = null;
      state.selectedModifierOptionId = null;
      state.selectedModifierTypeId = null;
      state.selectedProductClassId = null;
      state.selectedProductInstanceId = null;
    },
    openCategoryInterstitial(state) {
      state.dialogueState = 'CategoryInterstitial';
    },
    openCategoryAdd(state) {
      state.dialogueState = 'CategoryAdd';
    },
    openCategoryEdit(state, action: PayloadAction<string>) {
      state.selectedCategoryId = action.payload;
      state.dialogueState = 'CategoryEdit';
    },
    openCategoryDelete(state, action: PayloadAction<string>) {
      state.selectedCategoryId = action.payload;
      state.dialogueState = 'CategoryDelete';
    },
    openProductClassAdd(state) {
      state.dialogueState = 'ProductAdd';
    },
    openProductClassEdit(state, action: PayloadAction<string>) {
      state.selectedProductClassId = action.payload;
      state.dialogueState = 'ProductEdit';
    },
    openProductClassDelete(state, action: PayloadAction<string>) {
      state.selectedProductClassId = action.payload;
      state.dialogueState = 'ProductDelete';
    },
    openProductClassDisableUntilEod(state, action: PayloadAction<string>) {
      state.selectedProductClassId = action.payload;
      state.dialogueState = 'ProductDisableUntilEod';
    },
    openProductClassDisable(state, action: PayloadAction<string>) {
      state.selectedProductClassId = action.payload;
      state.dialogueState = 'ProductDisable';
    },
    openProductClassEnable(state, action: PayloadAction<string>) {
      state.selectedProductClassId = action.payload;
      state.dialogueState = 'ProductEnable';
    },
    openProductClassCopy(state, action: PayloadAction<string>) {
      state.selectedProductClassId = action.payload;
      state.dialogueState = 'ProductCopy';
    },
    openProductImport(state) {
      state.dialogueState = 'ProductImport';
    },
    openHierarchicalProductImport(state) {
      state.dialogueState = 'HierarchicalProductImport';
    },
    openProductInstanceAdd(state, action: PayloadAction<string>) {
      state.selectedProductClassId = action.payload;
      state.dialogueState = 'ProductInstanceAdd';
    },
    openProductInstanceEdit(state, action: PayloadAction<string>) {
      state.selectedProductInstanceId = action.payload;
      state.dialogueState = 'ProductInstanceEdit';
    },
    openProductInstanceDelete(state, action: PayloadAction<string>) {
      state.selectedProductInstanceId = action.payload;
      state.dialogueState = 'ProductInstanceDelete';
    },
    openModifierTypeAdd(state) {
      state.dialogueState = 'ModifierTypeAdd';
    },
    openModifierTypeEdit(state, action: PayloadAction<string>) {
      state.selectedModifierTypeId = action.payload;
      state.dialogueState = 'ModifierTypeEdit';
    },
    openModifierTypeDelete(state, action: PayloadAction<string>) {
      state.selectedModifierTypeId = action.payload;
      state.dialogueState = 'ModifierTypeDelete';
    },
    openModifierTypeCopy(state, action: PayloadAction<string>) {
      state.selectedModifierTypeId = action.payload;
      state.dialogueState = 'ModifierTypeCopy';
    },
    openModifierOptionAdd(state, action: PayloadAction<string>) {
      state.selectedModifierTypeId = action.payload;
      state.dialogueState = 'ModifierOptionAdd';
    },
    openModifierOptionEdit(state, action: PayloadAction<string>) {
      state.selectedModifierOptionId = action.payload;
      state.dialogueState = 'ModifierOptionEdit';
    },
    openModifierOptionDelete(state, action: PayloadAction<string>) {
      state.selectedModifierOptionId = action.payload;
      state.dialogueState = 'ModifierOptionDelete';
    },
    openModifierOptionDisableUntilEod(state, action: PayloadAction<string>) {
      state.selectedModifierOptionId = action.payload;
      state.dialogueState = 'ModifierOptionDisableUntilEod';
    },
    openModifierOptionDisable(state, action: PayloadAction<string>) {
      state.selectedModifierOptionId = action.payload;
      state.dialogueState = 'ModifierOptionDisable';
    },
    openModifierOptionEnable(state, action: PayloadAction<string>) {
      state.selectedModifierOptionId = action.payload;
      state.dialogueState = 'ModifierOptionEnable';
    },
    setDetailPanelSizeForRowId(state, action: PayloadAction<DetailPanelSize>) {
      console.log({ action })
      CatalogDetailPanelSizeAdapter.upsertOne(state.detailPanelSizes, action.payload);
    }

  },

});

export const {
  setDetailPanelSizeForRowId,
  setHideDisabled, setEnableCategoryTreeView,
  closeDialogue, openCategoryInterstitial, openCategoryAdd, openCategoryDelete, openCategoryEdit,
  openProductClassAdd, openProductClassDelete, openProductClassEdit, openProductClassCopy, openProductClassDisable, openProductClassDisableUntilEod, openProductClassEnable,
  openHierarchicalProductImport, openProductImport,
  openProductInstanceAdd, openProductInstanceDelete, openProductInstanceEdit,
  openModifierOptionAdd, openModifierOptionDelete, openModifierOptionDisable, openModifierOptionDisableUntilEod, openModifierOptionEdit, openModifierOptionEnable,
  openModifierTypeAdd, openModifierTypeCopy, openModifierTypeDelete, openModifierTypeEdit } = CatalogManagerSlice.actions;
export const CatalogManagerReducer = CatalogManagerSlice.reducer;
export const { selectAll: getDetailPanelSizes, selectById: getDetailPanelSizeById, selectIds: getDetailPanelIds } =
  CatalogDetailPanelSizeAdapter.getSelectors();