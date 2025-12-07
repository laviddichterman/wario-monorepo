import { m } from 'motion/react';
import { useCallback } from 'react';

import type { IconButtonProps } from '@mui/material/IconButton';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';

import { spreadSx } from '@wcp/wario-ux-shared/common';

import { usePopover } from '@/hooks/usePopover';

import { transitionTap, varHover, varTap } from '@/components/animate';
import { CustomPopover } from '@/components/custom-popover';
import { FlagIcon } from '@/components/flag-icon';

import type { LangCode } from '@/locales';
import { useTranslate } from '@/locales';

// ----------------------------------------------------------------------

export type LanguagePopoverProps = IconButtonProps & {
  data?: {
    value: string;
    label: string;
    countryCode: string;
  }[];
};

export function LanguagePopover({ data = [], sx, ...other }: LanguagePopoverProps) {
  const { open, anchorEl, onClose, onOpen } = usePopover();

  const { onChangeLang, currentLang } = useTranslate();

  const handleChangeLang = useCallback(
    (lang: LangCode) => {
      void onChangeLang(lang);
      onClose();
    },
    [onChangeLang, onClose],
  );

  const renderMenuList = () => (
    <CustomPopover open={open} anchorEl={anchorEl} onClose={onClose}>
      <MenuList sx={{ width: 160, minHeight: 72 }}>
        {data.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === currentLang.value}
            onClick={() => {
              handleChangeLang(option.value as LangCode);
            }}
          >
            <FlagIcon code={option.countryCode} />
            {option.label}
          </MenuItem>
        ))}
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label="Languages button"
        onClick={onOpen}
        sx={[
          (theme) => ({
            p: 0,
            width: 40,
            height: 40,
            ...(open && { bgcolor: theme.vars.palette.action.selected }),
          }),
          ...spreadSx(sx),
        ]}
        {...other}
      >
        <FlagIcon code={currentLang.countryCode} />
      </IconButton>

      {renderMenuList()}
    </>
  );
}
