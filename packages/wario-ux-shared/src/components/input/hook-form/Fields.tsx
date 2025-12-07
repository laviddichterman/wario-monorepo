import { RHFAutocomplete } from './RHFAutocomplete';
import { RHFCheckbox, RHFMultiCheckbox } from './RHFCheckbox';
// import { RHFCode } from './RHFCode';
// import { RHFCountrySelect } from './RHFCountrySelect';
import { RHFDatePicker, RHFDateTimePicker, RHFTimePicker } from './RHFDatePicker';
// import { RHFNumberInput } from './RHFNumberInput';
// import { RHFPhoneInput } from './rhf-phone-input';
// import { RHFRadioGroup } from './rhf-radio-group';
// import { RHFMultiSelect, RHFSelect } from './rhf-select';
// import { RHFSlider } from './rhf-slider';
// import { RHFMultiSwitch, RHFSwitch } from './rhf-switch';
import { RHFTextField } from './RHFTextField';

// ----------------------------------------------------------------------

export const Field = {
  // Code: RHFCode,
  // Select: RHFSelect,
  // Switch: RHFSwitch,
  // Slider: RHFSlider,
  Text: RHFTextField,
  // Phone: RHFPhoneInput,
  Checkbox: RHFCheckbox,
  // RadioGroup: RHFRadioGroup,
  // NumberInput: RHFNumberInput,
  // MultiSelect: RHFMultiSelect,
  // MultiSwitch: RHFMultiSwitch,
  Autocomplete: RHFAutocomplete,
  MultiCheckbox: RHFMultiCheckbox,
  // CountrySelect: RHFCountrySelect,
  // Pickers
  DatePicker: RHFDatePicker,
  TimePicker: RHFTimePicker,
  DateTimePicker: RHFDateTimePicker,
};
