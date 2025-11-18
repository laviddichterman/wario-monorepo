import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

import type { ButtonProps } from '@mui/material/Button';
import Button from '@mui/material/Button';

import { toast } from '@/components/snackbar';

// ----------------------------------------------------------------------

type Props = ButtonProps & {
  onClose?: () => void;
};

export function SignOutButton({ onClose, sx, ...other }: Props) {
  const { logout: signOutAuth0 } = useAuth0();

  const handleLogoutAuth0 = useCallback(() => {
    signOutAuth0({
      logoutParams: {
        returnTo: window.location.origin,
      },
    }).then(() => {
      onClose?.();
    }).catch((error: unknown) => {
      console.error(error);
      toast.error('Unable to logout!');
    })
  }, [onClose, signOutAuth0]);

  return (
    <Button
      fullWidth
      variant="soft"
      size="large"
      color="error"
      onClick={handleLogoutAuth0}
      sx={sx}
      {...other}
    >
      Logout
    </Button>
  );
};
