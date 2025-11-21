import type { BoxProps } from '@mui/material/Box';
import Box from '@mui/material/Box';
import { alpha as hexAlpha } from '@mui/material/styles';

import { spreadSx } from '@wcp/wario-ux-shared';

import type { SettingsState } from '../types';

import { OptionButton } from './styles';

// ----------------------------------------------------------------------

export type PresetsOptionsProps = BoxProps & {
  icon: React.ReactNode;
  value: SettingsState['primaryColor'];
  options: { name: SettingsState['primaryColor']; value: string }[];
  onChangeOption: (newOption: SettingsState['primaryColor']) => void;
};

export function PresetsOptions({
  sx,
  icon,
  value,
  options,
  onChangeOption,
  ...other
}: PresetsOptionsProps) {
  return (
    <Box
      sx={[
        {
          gap: 1.5,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
        },
        ...spreadSx(sx),
      ]}
      {...other}
    >
      {options.map((option) => {
        const selected = value === option.name;

        return (
          <OptionButton
            key={option.name}
            onClick={() => { onChangeOption(option.name); }}
            sx={{
              height: 64,
              color: option.value,
              ...(selected && {
                bgcolor: hexAlpha(option.value, 0.08),
              }),
            }}
          >
            {icon}
          </OptionButton>
        );
      })}
    </Box>
  );
}
