import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';

import { LoadingScreen } from '@wcp/wario-ux-shared/components';

import { usePathname } from '@/routes/hooks';

import { useAuthContext } from '@/hooks/useAuthContext';

import { CONFIG } from '@/config';

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
      // Include authorizationParams with scope and audience to ensure
      // offline_access is requested, which is required for refresh tokens
      await loginWithRedirect({
        appState: { returnTo: pathname },
        authorizationParams: {
          scope: CONFIG.auth0.scope,
          audience: CONFIG.auth0.audience,
        },
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
