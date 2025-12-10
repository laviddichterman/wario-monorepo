import { Box, IconButton, Stack, SvgIcon, type SvgIconProps, Typography } from '@mui/material';
import Dialog, { type DialogProps } from '@mui/material/Dialog';
import DialogActions, { type DialogActionsProps } from '@mui/material/DialogActions';
import DialogContent, { type DialogContentProps } from '@mui/material/DialogContent';
import DialogTitle, { type DialogTitleProps } from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';

import { spreadSx } from '@/common';

const CloseIcon = (props: SvgIconProps) => (
  <SvgIcon {...props}>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </SvgIcon>
);

// ===================================
// Root
// ===================================
export type AppDialogRootProps = DialogProps;

const Root = (props: AppDialogRootProps) => {
  return <Dialog {...props} />;
};

// ===================================
// Header
// ===================================
export interface AppDialogHeaderProps extends Omit<DialogTitleProps, 'title'> {
  title: React.ReactNode;
  onClose?: VoidFunction;
}

const Header = ({ title, onClose, children, sx, ...props }: AppDialogHeaderProps) => {
  return (
    <>
      <DialogTitle sx={[{ m: 0, p: 2 }, ...spreadSx(sx)]} {...props}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Typography variant="h6" component="div" sx={{ whiteSpace: 'nowrap' }}>
            {title}
          </Typography>

          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>{children}</Box>

          {onClose ? (
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{
                color: (theme) => theme.palette.grey[500],
                flexShrink: 0,
              }}
            >
              <CloseIcon />
            </IconButton>
          ) : null}
        </Stack>
      </DialogTitle>
      <Divider />
    </>
  );
};

// ===================================
// Content
// ===================================
export type AppDialogContentProps = DialogContentProps;

const Content = (props: AppDialogContentProps) => {
  return <DialogContent dividers {...props} />;
};

// ===================================
// Actions
// ===================================
export type AppDialogActionsProps = DialogActionsProps;

const Actions = (props: AppDialogActionsProps) => {
  return <DialogActions {...props} />;
};

// ===================================
// Export
// ===================================

export const AppDialog = Object.assign(Root, {
  Root: Root,
  Header: Header,
  Content: Content,
  Actions: Actions,
});
