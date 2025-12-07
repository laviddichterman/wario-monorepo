import { m } from 'motion/react';

import Container from '@mui/material/Container';
import type { SxProps, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { spreadSx } from '@wcp/wario-ux-shared/common';

import { useAuthContext } from '@/hooks/useAuthContext';

import { MotionContainer, varBounce } from '@/components/animate';

// ----------------------------------------------------------------------

/**
 * RoleBasedGuard using Auth0 scopes and permissions.
 *
 * Use either `scopes` or `permissions` to define access requirements.
 * By default, ALL specified scopes/permissions are required (`requireAll=true`).
 * Set `requireAll=false` to allow access if ANY of the scopes/permissions match.
 */

export type RoleBasedGuardProp = {
  sx?: SxProps<Theme>;
  hasContent?: boolean;
  children: React.ReactNode;
  /** Required Auth0 scopes (e.g., ['read:orders', 'write:orders']) */
  scopes?: string[];
  /** Required Auth0 permissions (RBAC - e.g., ['admin', 'manager']) */
  permissions?: string[];
  /** If true, user must have ALL scopes/permissions. If false, ANY match is sufficient. */
  requireAll?: boolean;
};

export function RoleBasedGuard({
  sx,
  children,
  hasContent,
  scopes = [],
  permissions = [],
  requireAll = true,
}: RoleBasedGuardProp) {
  const { authenticated, hasScopes, hasPermissions } = useAuthContext();

  // If not authenticated, deny access
  if (!authenticated) {
    return hasContent ? (
      <Container component={MotionContainer} sx={[{ textAlign: 'center' }, ...spreadSx(sx)]}>
        <m.div variants={varBounce('in')}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Authentication required
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Typography sx={{ color: 'text.secondary' }}>You must be logged in to access this page.</Typography>
        </m.div>
      </Container>
    ) : null;
  }

  // Determine if access is granted
  // User needs to pass BOTH scope and permission checks (if specified)
  return hasScopes(scopes, requireAll) && hasPermissions(permissions, requireAll) ? (
    <> {children} </>
  ) : hasContent ? (
    <Container component={MotionContainer} sx={[{ textAlign: 'center' }, ...spreadSx(sx)]}>
      <m.div variants={varBounce('in')}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Permission denied
        </Typography>
      </m.div>

      <m.div variants={varBounce('in')}>
        <Typography sx={{ color: 'text.secondary' }}>You do not have permission to access this page.</Typography>
      </m.div>

      <m.div variants={varBounce('in')}>
        <Typography sx={{ color: 'text.secondary' }}>
          Required {scopes.length > 0 ? `scopes: ${scopes.join(', ')}` : ''}
          {scopes.length > 0 && permissions.length > 0 ? ' and ' : ''}
          {permissions.length > 0 ? `permissions: ${permissions.join(', ')}` : ''}
        </Typography>
      </m.div>
    </Container>
  ) : null;
}
