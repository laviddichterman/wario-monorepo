import type { AppState } from '@auth0/auth0-react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useMemo, useState } from 'react';

import axios from '@/utils/axios';

import { CONFIG } from '@/config';

import { AuthContext } from '../AuthContext';

// ----------------------------------------------------------------------
type AccessTokenClaims = {
  scope?: string;        // e.g., "read:orders write:orders"
  permissions?: string[]; // RBAC enabled: ["read:orders", "write:orders"]
  [k: string]: unknown;
};

function hasScopes(claims: AccessTokenClaims, required: string[], any: boolean) {
  if (required.length === 0) return true;

  // Prefer RBAC 'permissions' if present, else fall back to 'scope'
  const grantedFromPerms = claims.permissions ?? [];
  const grantedFromScope = (claims.scope ?? '').split(' ').filter(Boolean);
  const granted = new Set([...grantedFromPerms, ...grantedFromScope]);

  if (any) return required.some((r) => granted.has(r));
  return required.every((r) => granted.has(r));
}

type Props = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: Props) {
  const { domain, clientId, callbackUrl, audience, scope } = CONFIG.auth0;

  const onRedirectCallback = useCallback((appState?: AppState) => {
    window.location.replace(appState?.returnTo || window.location.pathname);
  }, []);

  if (!(domain && clientId && callbackUrl)) {
    return null;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: callbackUrl,
        scope: scope,
        audience: audience
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <AuthProviderContainer>{children}</AuthProviderContainer>
    </Auth0Provider>
  );
}

// ----------------------------------------------------------------------

function AuthProviderContainer({ children }: Props) {
  const { user, isLoading, isAuthenticated, getAccessTokenSilently } = useAuth0();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenClaims, setTokenClaims] = useState<AccessTokenClaims | null>(null);

  const getAccessToken = useCallback(async () => {
    try {
      if (isAuthenticated) {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: CONFIG.auth0.scope } });
        const claims = jwtDecode<AccessTokenClaims>(token);

        setAccessToken(token);
        setTokenClaims(claims);
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      } else {
        setAccessToken(null);
        setTokenClaims(null);
        delete axios.defaults.headers.common.Authorization;
      }
    } catch (error) {
      console.error(error);
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    void getAccessToken();
  }, [getAccessToken]);

  // ----------------------------------------------------------------------
  // Extract scopes and permissions from token claims
  const userScopes = useMemo(() => {
    if (!tokenClaims) return [];
    const scopeString = tokenClaims.scope ?? '';
    return scopeString.split(' ').filter(Boolean);
  }, [tokenClaims]);

  const userPermissions = useMemo(() => {
    if (!tokenClaims) return [];
    return tokenClaims.permissions ?? [];
  }, [tokenClaims]);

  // Helper functions to check scopes/permissions
  const checkHasScopes = useCallback(
    (requiredScopes: string[], requireAll = true) => {
      if (requiredScopes.length === 0) return true;
      if (!tokenClaims) return false;
      return hasScopes(tokenClaims, requiredScopes, !requireAll);
    },
    [tokenClaims]
  );

  const checkHasPermissions = useCallback(
    (requiredPermissions: string[], requireAll = true) => {
      if (requiredPermissions.length === 0) return true;
      if (!tokenClaims) return false;

      const granted = new Set(tokenClaims.permissions ?? []);
      if (requireAll) {
        return requiredPermissions.every((perm) => granted.has(perm));
      }
      return requiredPermissions.some((perm) => granted.has(perm));
    },
    [tokenClaims]
  );

  const checkAuthenticated = isAuthenticated ? 'authenticated' : 'unauthenticated';

  const status = isLoading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: user
        ? Object.assign(user, {
          id: user.sub,
          accessToken,
          displayName: user.name,
        })
        : null,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
      scopes: userScopes,
      permissions: userPermissions,
      hasScopes: checkHasScopes,
      hasPermissions: checkHasPermissions,
    }),
    [accessToken, checkHasPermissions, checkHasScopes, status, user, userPermissions, userScopes]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}
