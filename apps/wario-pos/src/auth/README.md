# Auth0 Role-Based Access Control (RBAC)

This directory contains Auth0 authentication and authorization implementation with scope-based and permission-based access control.

## Overview

The authentication system uses Auth0 with support for:
- **Scopes**: OAuth 2.0 scopes (e.g., `read:orders`, `write:orders`)
- **Permissions**: RBAC permissions (e.g., `admin`, `manager`, `staff`)

## Components

### AuthProvider
Located in `context/auth0/auth-provider.tsx`

Wraps the application with Auth0 authentication and exposes auth state via context.

```tsx
import { AuthProvider } from '@/auth/context/auth0';
import { CONFIG } from '@/config';

<AuthProvider scope={CONFIG.auth0.scope || 'openid profile email'}>
  <App />
</AuthProvider>
```

### useAuthContext Hook
Located in `hooks/useAuthContext.ts`

Access authentication state and check permissions:

```tsx
import { useAuthContext } from '@/hooks/useAuthContext';

function MyComponent() {
  const { 
    user,
    authenticated,
    scopes,
    permissions,
    hasScopes,
    hasPermissions 
  } = useAuthContext();

  // Check if user has specific scopes
  const canReadOrders = hasScopes(['read:orders']);
  const canReadOrWrite = hasScopes(['read:orders', 'write:orders'], false); // ANY match

  // Check if user has specific permissions
  const isAdmin = hasPermissions(['admin']);
  const isStaffOrManager = hasPermissions(['staff', 'manager'], false); // ANY match

  return (
    <div>
      {authenticated && <p>Welcome {user?.name}</p>}
      {canReadOrders && <OrdersList />}
    </div>
  );
}
```

## Guards

### AuthGuard
Located in `guard/auth-guard.tsx`

Protects routes that require authentication:

```tsx
import { AuthGuard } from '@/auth/guard';

<AuthGuard>
  <ProtectedPage />
</AuthGuard>
```

### RoleBasedGuard
Located in `guard/role-based-guard.tsx`

Protects components/routes based on Auth0 scopes or permissions.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scopes` | `string[]` | `[]` | Required Auth0 scopes |
| `permissions` | `string[]` | `[]` | Required Auth0 permissions (RBAC) |
| `requireAll` | `boolean` | `true` | If true, user must have ALL scopes/permissions. If false, ANY match is sufficient |
| `hasContent` | `boolean` | `false` | If true, shows permission denied message. If false, renders nothing |
| `sx` | `SxProps<Theme>` | - | MUI sx props for error container |
| `children` | `ReactNode` | - | Protected content |

#### Usage Examples

**Require specific scopes:**

```tsx
import { RoleBasedGuard } from '@/auth/guard';

// User must have BOTH read:orders AND write:orders scopes
<RoleBasedGuard scopes={['read:orders', 'write:orders']}>
  <OrderManagement />
</RoleBasedGuard>

// User must have ANY of these scopes
<RoleBasedGuard scopes={['read:orders', 'write:orders']} requireAll={false}>
  <OrdersView />
</RoleBasedGuard>
```

**Require specific permissions (RBAC):**

```tsx
// User must be an admin
<RoleBasedGuard permissions={['admin']}>
  <AdminPanel />
</RoleBasedGuard>

// User must be either manager or admin
<RoleBasedGuard permissions={['admin', 'manager']} requireAll={false}>
  <ReportsPage />
</RoleBasedGuard>
```

**Combine scopes and permissions:**

```tsx
// User must have the scope AND the permission
<RoleBasedGuard 
  scopes={['write:orders']} 
  permissions={['manager']}
>
  <CreateOrder />
</RoleBasedGuard>
```

**Show permission denied message:**

```tsx
// Shows error message when access is denied
<RoleBasedGuard 
  scopes={['admin:settings']} 
  hasContent
>
  <SettingsPage />
</RoleBasedGuard>
```

**Conditional rendering without message:**

```tsx
// Hides content silently when access is denied
<RoleBasedGuard scopes={['read:analytics']}>
  <AnalyticsWidget />
</RoleBasedGuard>
```

## Auth0 Configuration

### Environment Variables

Set these in your `.env` file:

```bash
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://your-api-audience
VITE_AUTH0_SCOPE=openid profile email read:orders write:orders
```

### Requesting Scopes

Scopes are requested during login. Update `config.ts`:

```typescript
auth0: {
  // ...
  scope: 'openid profile email read:orders write:orders admin:settings',
  audience: 'https://your-api-audience'
}
```

### Setting Up RBAC in Auth0

1. **Enable RBAC** in Auth0 Dashboard → APIs → Your API → Settings
2. **Define Permissions** in Auth0 Dashboard → APIs → Your API → Permissions
   - Example: `read:orders`, `write:orders`, `admin:settings`
3. **Create Roles** in Auth0 Dashboard → User Management → Roles
   - Example: "Admin", "Manager", "Staff"
4. **Assign Permissions to Roles**
5. **Assign Roles to Users**

When RBAC is enabled, the access token will include a `permissions` array with the user's permissions.

## Type Definitions

```typescript
export type AuthContextValue = {
  user: UserType;
  loading: boolean;
  authenticated: boolean;
  unauthenticated: boolean;
  scopes: string[];
  permissions: string[];
  checkUserSession?: () => Promise<void>;
  hasScopes: (requiredScopes: string[], requireAll?: boolean) => boolean;
  hasPermissions: (requiredPermissions: string[], requireAll?: boolean) => boolean;
};
```

## Best Practices

1. **Use scopes for API access control** - Match OAuth 2.0 scopes with your backend API
2. **Use permissions for role-based features** - Use RBAC permissions for user roles
3. **Request minimal scopes** - Only request scopes your app needs
4. **Combine guards strategically**:
   ```tsx
   <AuthGuard>
     <RoleBasedGuard permissions={['admin']}>
       <AdminOnlyFeature />
     </RoleBasedGuard>
   </AuthGuard>
   ```
5. **Show appropriate feedback** - Use `hasContent={true}` for user-facing denials
6. **Protect routes** - Wrap route components with guards in your router configuration

## Testing

Test your guards with different user roles:

```tsx
// Mock auth context for testing
const mockAuthContext = {
  authenticated: true,
  scopes: ['read:orders', 'write:orders'],
  permissions: ['manager'],
  hasScopes: jest.fn((required, all) => { /* mock logic */ }),
  hasPermissions: jest.fn((required, all) => { /* mock logic */ }),
  // ... other props
};
```

## Troubleshooting

**Scopes not appearing in token:**
- Verify scopes are requested in `auth0.scope` config
- Check Auth0 API settings allow these scopes
- Ensure `audience` is set correctly

**Permissions not appearing:**
- Enable RBAC in Auth0 API settings
- Check "Add Permissions in the Access Token" is enabled
- Verify user has assigned roles with permissions

**"Permission denied" always shows:**
- Check the user actually has the required scopes/permissions
- Verify Auth0 configuration
- Check browser console for access token claims (dev only)
