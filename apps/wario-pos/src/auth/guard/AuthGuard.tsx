import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';

import { LoadingScreen } from '@wcp/wario-ux-shared';

import { usePathname } from '@/routes/hooks';

import { useAuthContext } from '@/hooks/useAuthContext';

// ----------------------------------------------------------------------

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { loginWithRedirect } = useAuth0();
  const pathname = usePathname();

  const { authenticated, loading } = useAuthContext();

  const [isChecking, setIsChecking] = useState(true);

  const checkPermissions = async (): Promise<void> => {
    if (loading) {
      return;
    }

    if (!authenticated) {
      // Redirect directly to Auth0 login
      await loginWithRedirect({
        appState: { returnTo: pathname },
      });
      return;
    }

    setIsChecking(false);
  };

  useEffect(() => {
    void checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, loading]);

  if (isChecking) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
