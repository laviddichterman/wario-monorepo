import { useAuth0 } from '@auth0/auth0-react';
/**
 * useGetAuthToken Hook
 *
 * A wrapper around Auth0's getAccessTokenSilently that provides:
 * - Type-safe scope parameter (only valid AuthScopes allowed)
 * - Proper error handling instead of silent failures
 * - User-friendly error messages
 * - Development-time warnings for unknown scopes
 */
import { useCallback, useMemo } from 'react';

import { type AuthScope, AuthScopes } from '@wcp/wario-shared-private';

/**
 * Custom error class for auth token failures.
 * Provides scope context for debugging.
 */
export class AuthTokenError extends Error {
  constructor(
    message: string,
    public readonly scope: AuthScope,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'AuthTokenError';
  }
}

/**
 * Hook that wraps getAccessTokenSilently with proper error handling.
 *
 * @example
 * const { getToken } = useGetAuthToken();
 * const token = await getToken(AuthScopes.WRITE_SETTINGS);
 */
export function useGetAuthToken() {
  const { getAccessTokenSilently } = useAuth0();

  // Set of known scopes for dev-time validation
  const knownScopes = useMemo(() => new Set<string>(Object.values(AuthScopes)), []);

  const getToken = useCallback(
    async (scope: AuthScope): Promise<string> => {
      // Dev-time warning for unknown scopes (shouldn't happen with proper typing)
      if (import.meta.env.DEV && !knownScopes.has(scope)) {
        console.warn(`⚠️ Unknown Auth0 scope: "${scope}". Valid scopes: ${[...knownScopes].join(', ')}`);
      }

      try {
        return await getAccessTokenSilently({
          authorizationParams: { scope },
        });
      } catch (error: unknown) {
        // Provide a more helpful error message
        const isConsentError = error instanceof Error && error.message.includes('consent');
        const message = isConsentError
          ? `Missing permission for scope "${scope}". Contact an administrator.`
          : `Authentication failed for scope "${scope}". Please try logging in again.`;

        throw new AuthTokenError(message, scope, error);
      }
    },
    [getAccessTokenSilently, knownScopes],
  );

  return { getToken };
}
