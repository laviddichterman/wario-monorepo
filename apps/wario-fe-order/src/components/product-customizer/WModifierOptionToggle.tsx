import React, { useMemo } from 'react';

import Circle from '@mui/icons-material/Circle';
import CircleOutlined from '@mui/icons-material/CircleOutlined';
import Checkbox from '@mui/material/Checkbox';

import { DISABLE_REASON, type ICatalogSelectors, type IOption, OptionPlacement } from '@wcp/wario-shared';
import { useCatalogSelectors } from '@wcp/wario-ux-shared/query';
import { CustomizerFormControlLabel } from '@wcp/wario-ux-shared/styled';

import { selectOptionState, useCustomizerStore } from '@/stores/useCustomizerStore';
import { selectSelectedService, selectServiceDateTime, useFulfillmentStore } from '@/stores/useFulfillmentStore';

import { ModifierOptionTooltip } from '../ModifierOptionTooltip';

import { UpdateModifierOptionStateToggleOrRadio } from './WProductCustomizerLogic';

interface IModifierOptionToggle {
  modifierTypeId: string;
  toggleOptionChecked: IOption;
  toggleOptionUnchecked: IOption;
}

export function WModifierOptionToggle({
  modifierTypeId,
  toggleOptionChecked,
  toggleOptionUnchecked,
}: IModifierOptionToggle) {
  const updateCustomizerProduct = useCustomizerStore((s) => s.updateCustomizerProduct);
  const selectedProduct = useCustomizerStore((s) => s.selectedProduct);
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  const serviceDateTime = useFulfillmentStore(selectServiceDateTime);
  const fulfillmentId = useFulfillmentStore(selectSelectedService);
  const optionUncheckedState = useCustomizerStore((s) =>
    s.selectedProduct
      ? selectOptionState(s.selectedProduct.m.modifier_map, modifierTypeId, toggleOptionUnchecked.id)
      : undefined,
  );
  const optionCheckedState = useCustomizerStore((s) =>
    s.selectedProduct
      ? selectOptionState(s.selectedProduct.m.modifier_map, modifierTypeId, toggleOptionChecked.id)
      : undefined,
  );
  const optionValue = useMemo(
    () => optionCheckedState?.placement === OptionPlacement.WHOLE,
    [optionCheckedState?.placement],
  );
  if (!optionUncheckedState || !optionCheckedState || !serviceDateTime || !selectedProduct || !fulfillmentId) {
    return null;
  }
  const toggleOption = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    updateCustomizerProduct(
      UpdateModifierOptionStateToggleOrRadio(
        modifierTypeId,
        e.target.checked ? toggleOptionChecked.id : toggleOptionUnchecked.id,
        selectedProduct,
        catalogSelectors,
        serviceDateTime,
        fulfillmentId,
      ),
    );
  };
  return (
    <ModifierOptionTooltip
      product={selectedProduct.p}
      option={optionValue ? toggleOptionUnchecked : toggleOptionChecked}
      enableState={optionValue ? optionUncheckedState.enable_whole : optionUncheckedState.enable_whole}
    >
      <CustomizerFormControlLabel
        control={
          <Checkbox
            checkedIcon={<Circle />}
            icon={<CircleOutlined />}
            disableRipple
            disableFocusRipple
            disableTouchRipple
            disabled={
              (optionValue ? optionUncheckedState.enable_whole : optionUncheckedState.enable_whole).enable !==
              DISABLE_REASON.ENABLED
            }
            value={optionValue}
            onChange={toggleOption}
          />
        }
        label={toggleOptionChecked.displayName}
      />
    </ModifierOptionTooltip>
  );
}
