import { useMemo } from 'react';

import FormControl, { type FormControlProps } from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';

import { type IOptionType, type IProductInstance, type WCPProduct } from '@wcp/wario-shared';
import {
  useBaseProductByProductId,
  useModifierTypeNameById,
  useValueFromModifierEntryById,
} from '@wcp/wario-ux-shared/query';

import { useVisibleModifierOptions } from '@/hooks/useDerivedState';

import { WModifierOptionCheckboxComponent } from './WModifierOptionCheckboxComponent';
import { WModifierOptionToggle } from './WModifierOptionToggle';
import { WModifierRadioComponent } from './WModifierRadioComponent';

interface IModifierTypeCustomizerComponent {
  mtid: string;
  product: WCPProduct;
}

export function WModifierTypeCustomizerComponent({
  mtid,
  product,
  ...other
}: IModifierTypeCustomizerComponent & Omit<FormControlProps, 'children'>) {
  const baseProductInstance = useBaseProductByProductId(product.productId) as IProductInstance;
  const visibleOptions = useVisibleModifierOptions(product.productId, product.modifiers, mtid);
  const modifierType = useValueFromModifierEntryById(mtid, 'modifierType') as IOptionType;
  const modifierTypeName = useModifierTypeNameById(mtid);
  const modifierOptionsHtml = useMemo(() => {
    if (modifierType.max_selected === 1) {
      if (modifierType.min_selected === 1) {
        if (modifierType.displayFlags.use_toggle_if_only_two_options && visibleOptions.length === 2) {
          // if we've found the modifier assigned to the base product, and the modifier option assigned to the base product is visible
          const mtidx = baseProductInstance.modifiers.findIndex((x) => x.modifierTypeId === mtid);
          if (mtidx !== -1 && baseProductInstance.modifiers[mtidx].options.length === 1) {
            const baseOptionIndex = visibleOptions.findIndex(
              (x) => x.id === baseProductInstance.modifiers[mtidx].options[0].optionId,
            );
            if (baseOptionIndex !== -1) {
              // we togglin'!
              // since there are only two visible options, the base option is either at index 1 or 0
              return (
                <WModifierOptionToggle
                  toggleOptionChecked={visibleOptions[baseOptionIndex === 0 ? 1 : 0]}
                  toggleOptionUnchecked={visibleOptions[baseOptionIndex]}
                />
              );
            }
          }
          // the base product's option ${base_moid} isn't visible. switching to RADIO modifier display for ${this.mtid}`);
        }

        // return MODIFIER_DISPLAY.RADIO;
        return <WModifierRadioComponent options={visibleOptions} />;
      }
    }
    return (
      <FormGroup row aria-labelledby={`modifier_control_${mtid}`}>
        {visibleOptions.map((option, i: number) => (
          <WModifierOptionCheckboxComponent key={i} option={option} />
        ))}
      </FormGroup>
    );
  }, [modifierType, mtid, baseProductInstance.modifiers, visibleOptions]);
  return (
    <FormControl fullWidth {...other}>
      <FormLabel id={`modifier_control_${mtid}`}>{modifierTypeName}:</FormLabel>
      {modifierOptionsHtml}
    </FormControl>
  );
}
