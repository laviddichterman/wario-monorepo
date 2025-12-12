import React, { useMemo } from 'react';

import Circle from '@mui/icons-material/Circle';
import CircleOutlined from '@mui/icons-material/CircleOutlined';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

import { DISABLE_REASON, type ICatalogSelectors, type IOption, type IOptionType } from '@wcp/wario-shared';
import { useCatalogSelectors } from '@wcp/wario-ux-shared/query';
import { CustomizerFormControlLabel } from '@wcp/wario-ux-shared/styled';

import { selectOptionState, useCustomizerStore } from '@/stores/useCustomizerStore';
import { selectSelectedService, selectServiceDateTime, useFulfillmentStore } from '@/stores/useFulfillmentStore';

import { ModifierOptionTooltip } from '../ModifierOptionTooltip';

import { UpdateModifierOptionStateToggleOrRadio } from './WProductCustomizerLogic';

interface IModifierRadioCustomizerComponent {
  options: IOption[];
  modifierType: IOptionType;
}

export function WModifierRadioComponent({ options, modifierType }: IModifierRadioCustomizerComponent) {
  const updateCustomizerProduct = useCustomizerStore((s) => s.updateCustomizerProduct);
  const selectedProduct = useCustomizerStore((s) => s.selectedProduct);
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  const fulfillmentId = useFulfillmentStore(selectSelectedService);
  const serviceDateTime = useFulfillmentStore(selectServiceDateTime);
  const modifierMap = useCustomizerStore((s) => s.selectedProduct?.m.modifier_map);
  const selectedOptionId = useCustomizerStore((s) => {
    const modEntry = s.selectedProduct?.p.modifiers.find((x) => x.modifierTypeId === modifierType.id);
    return modEntry?.options.length === 1 ? modEntry.options[0].optionId : null;
  });

  const getOptionState = useMemo(
    () => (moId: string) => (modifierMap ? selectOptionState(modifierMap, modifierType.id, moId) : undefined),
    [modifierMap, modifierType.id],
  );

  if (!serviceDateTime || !selectedProduct || !fulfillmentId) {
    return null;
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    updateCustomizerProduct(
      UpdateModifierOptionStateToggleOrRadio(
        modifierType.id,
        e.target.value,
        selectedProduct,
        catalogSelectors,
        serviceDateTime,
        fulfillmentId,
      ),
    );
  };
  return (
    <RadioGroup
      sx={{ width: '100%' }}
      onChange={onChange}
      value={selectedOptionId}
      aria-labelledby={`modifier_control_${modifierType.id}`}
    >
      <Grid container>
        {options.map((opt, i) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const optionState = getOptionState(opt.id)!;
          return (
            <Grid
              key={i}
              size={{
                xs: 12,
                sm: 6,
                md: 4,
                lg: 3,
              }}
            >
              <ModifierOptionTooltip product={selectedProduct.p} option={opt} enableState={optionState.enable_whole}>
                <CustomizerFormControlLabel
                  value={opt.id}
                  control={
                    <Radio
                      checkedIcon={<Circle />}
                      icon={<CircleOutlined />}
                      disableRipple
                      disableFocusRipple
                      disableTouchRipple
                      disabled={optionState.enable_whole.enable !== DISABLE_REASON.ENABLED}
                    />
                  }
                  label={opt.displayName}
                />
              </ModifierOptionTooltip>
            </Grid>
          );
        })}
      </Grid>
    </RadioGroup>
  );
}
