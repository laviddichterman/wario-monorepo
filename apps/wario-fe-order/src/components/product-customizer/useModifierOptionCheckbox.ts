import { useMemo } from 'react';

import {
  type ICatalogSelectors,
  type IOption,
  type IOptionState,
  type IOptionType,
  OptionPlacement,
} from '@wcp/wario-shared';
import { useCatalogSelectors, useModifierTypeById } from '@wcp/wario-ux-shared/query';

import { selectOptionState, useCustomizerStore } from '@/stores/useCustomizerStore';
import { selectSelectedService, selectServiceDateTime, useFulfillmentStore } from '@/stores/useFulfillmentStore';

import { UpdateModifierOptionStateCheckbox } from './WProductCustomizerLogic';

export function useModifierOptionCheckbox({ option, modifierTypeId }: { option: IOption, modifierTypeId: string }) {
  const updateCustomizerProduct = useCustomizerStore((s) => s.updateCustomizerProduct);
  const optionState = useCustomizerStore((s) =>
    s.selectedProduct
      ? selectOptionState(s.selectedProduct.m.modifier_map, modifierTypeId, option.id)
      : undefined,
  );
  const modifierTypeEntry = useModifierTypeById(modifierTypeId) as IOptionType;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const isWhole = useMemo(() => optionState!.placement === OptionPlacement.WHOLE, [optionState]);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const isLeft = useMemo(() => optionState!.placement === OptionPlacement.LEFT, [optionState]);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const isRight = useMemo(() => optionState!.placement === OptionPlacement.RIGHT, [optionState]);
  const selectedProduct = useCustomizerStore((s) => s.selectedProduct);
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  const serviceDateTime = useFulfillmentStore(selectServiceDateTime);
  const fulfillmentId = useFulfillmentStore(selectSelectedService);

  const onUpdateOption = (newState: IOptionState) => {
    if (selectedProduct && serviceDateTime && fulfillmentId) {
      updateCustomizerProduct(
        UpdateModifierOptionStateCheckbox(
          modifierTypeEntry,
          option,
          newState,
          selectedProduct,
          catalogSelectors,
          serviceDateTime,
          fulfillmentId,
        ),
      );
    }
  };
  const onClickWhole = () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    onUpdateOption({ placement: +!isWhole * OptionPlacement.WHOLE, qualifier: optionState!.qualifier });
  };
  const onClickLeft = () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    onUpdateOption({ placement: +!isLeft * OptionPlacement.LEFT, qualifier: optionState!.qualifier });
  };
  const onClickRight = () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    onUpdateOption({ placement: +!isRight * OptionPlacement.RIGHT, qualifier: optionState!.qualifier });
  };
  return {
    onClickWhole,
    onClickLeft,
    onClickRight,
    onUpdateOption,
    isWhole,
    isLeft,
    isRight,
    optionState,
  };
}
