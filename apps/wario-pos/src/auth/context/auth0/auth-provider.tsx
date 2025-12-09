import type { AppState } from '@auth0/auth0-react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useMemo, useState } from 'react';

import axios from '@/utils/axios';

import type { UserType } from '@/auth/types';

import { CONFIG } from '@/config';

import { AuthContext } from '../auth-context';

// ----------------------------------------------------------------------
type AccessTokenClaims = {
  scope?: string; // e.g., "read:orders write:orders"
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
        audience: audience,
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
  const { user, isLoading, isAuthenticated, getAccessTokenSilently, logout } = useAuth0<UserType>();

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
      // Check if the error is due to missing/expired refresh token
      // Auth0 throws 'login_required' or 'Missing Refresh Token' errors when
      // silent token refresh fails
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRefreshTokenError =
        errorMessage.includes('Missing Refresh Token') ||
        errorMessage.includes('login_required') ||
        errorMessage.includes('invalid_grant');

      if (isRefreshTokenError) {
        // Log user out and redirect to login page
        // This provides a clean UX instead of leaving the user in a broken state
        void logout({ logoutParams: { returnTo: window.location.origin } });
      } else {
        console.error('Auth token error:', error);
      }
    }
  }, [getAccessTokenSilently, isAuthenticated, logout]);

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
    (requiredScopes: string[] | string, requireAll = true) => {
      if (Array.isArray(requiredScopes) && requiredScopes.length === 0) return true;
      if (!tokenClaims) return false;
      return hasScopes(tokenClaims, Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes], !requireAll);
    },
    [tokenClaims],
  );

  const checkHasPermissions = useCallback(
    (requiredPermissions: string[] | string, requireAll = true) => {
      if (Array.isArray(requiredPermissions) && requiredPermissions.length === 0) return true;
      if (!tokenClaims) return false;
      const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      const granted = new Set(tokenClaims.permissions ?? []);
      if (requireAll) {
        return perms.every((perm) => granted.has(perm));
      }
      return perms.some((perm) => granted.has(perm));
    },
    [tokenClaims],
  );

  const checkAuthenticated = isAuthenticated ? 'authenticated' : 'unauthenticated';

  const status = isLoading ? 'loading' : checkAuthenticated;
  const memoizedValue = useMemo(
    () => ({
      user: user
        ? Object.assign(user, {
            id: user.sub,
            accessToken,
            display_name: user.name,
          })
        : { id: 'unknown', email: 'unknown', name: 'unknown', display_name: 'unknown' },
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
      scopes: userScopes,
      permissions: userPermissions,
      hasScopes: checkHasScopes,
      hasPermissions: checkHasPermissions,
    }),
    [accessToken, checkHasPermissions, checkHasScopes, status, user, userPermissions, userScopes],
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}
