/**
 * Example: Role-Based Access Control
 * 
 * This file demonstrates various patterns for using Auth0 scopes and permissions
 * with the RoleBasedGuard component and useAuthContext hook.
 */

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { useAuthContext } from '@/hooks/useAuthContext';

import { RoleBasedGuard } from '@/auth/guard';

// ----------------------------------------------------------------------

export function RBACExamples() {
  const auth = useAuthContext();
  const [showDebug, setShowDebug] = useState(false);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Role-Based Access Control Examples
      </Typography>

      {/* Debug Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your Auth Info
          </Typography>
          <Button
            onClick={() => {
              setShowDebug(!showDebug);
            }}
            size="small"
          >
            {showDebug ? 'Hide' : 'Show'} Details
          </Button>
          {showDebug && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>User:</strong> {typeof auth.user?.name === 'string' ? auth.user.name : 'Not authenticated'}
              </Typography>
              <Typography variant="body2">
                <strong>Scopes:</strong> {auth.scopes.join(', ') || 'None'}
              </Typography>
              <Typography variant="body2">
                <strong>Permissions:</strong> {auth.permissions.join(', ') || 'None'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Example 1: Scope-based guard with error message */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Example 1: Scope-Based Guard (with error message)
          </Typography>
          <RoleBasedGuard scopes={['write:orders']} hasContent>
            <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
              <Typography>
                ✅ You have the <code>write:orders</code> scope!
              </Typography>
            </Box>
          </RoleBasedGuard>
        </CardContent>
      </Card>

      {/* Example 2: Permission-based guard without error message */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Example 2: Permission-Based Guard (silent failure)
          </Typography>
          <RoleBasedGuard permissions={['admin']}>
            <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
              <Typography>
                ✅ You have the <code>admin</code> permission!
              </Typography>
            </Box>
          </RoleBasedGuard>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            If you don&apos;t see a success box above, you lack the admin permission.
          </Typography>
        </CardContent>
      </Card>

      {/* Example 3: Multiple scopes - ANY match */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Example 3: Multiple Scopes (ANY match)
          </Typography>
          <RoleBasedGuard
            scopes={['read:orders', 'read:customers']}
            requireAll={false}
            hasContent
          >
            <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <Typography>
                ✅ You have at least one of: <code>read:orders</code> or{' '}
                <code>read:customers</code>
              </Typography>
            </Box>
          </RoleBasedGuard>
        </CardContent>
      </Card>

      {/* Example 4: Combined scopes and permissions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Example 4: Combined Scopes + Permissions
          </Typography>
          <RoleBasedGuard
            scopes={['write:orders']}
            permissions={['manager', 'admin']}
            requireAll={false}
            hasContent
          >
            <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
              <Typography>
                ✅ You have <code>write:orders</code> scope AND either{' '}
                <code>manager</code> or <code>admin</code> permission!
              </Typography>
            </Box>
          </RoleBasedGuard>
        </CardContent>
      </Card>

      {/* Example 5: Using hooks directly */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Example 5: Direct Hook Usage
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            {auth.hasScopes(['read:orders']) ? (
              <Typography color="success.main">
                ✅ hasScopes(['read:orders']) = true
              </Typography>
            ) : (
              <Typography color="error.main">
                ❌ hasScopes(['read:orders']) = false
              </Typography>
            )}

            {auth.hasPermissions(['admin', 'manager'], false) ? (
              <Typography color="success.main">
                ✅ hasPermissions(['admin', 'manager'], requireAll=false) = true
              </Typography>
            ) : (
              <Typography color="error.main">
                ❌ hasPermissions(['admin', 'manager'], requireAll=false) = false
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Example 6: Conditional rendering */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Example 6: Conditional Rendering
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {auth.hasScopes(['read:orders']) && (
              <Button variant="contained" color="primary">
                View Orders
              </Button>
            )}
            {auth.hasScopes(['write:orders']) && (
              <Button variant="contained" color="secondary">
                Create Order
              </Button>
            )}
            {auth.hasPermissions(['admin']) && (
              <Button variant="contained" color="error">
                Admin Settings
              </Button>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Buttons appear based on your scopes and permissions.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
