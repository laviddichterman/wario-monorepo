export type UserType = Record<string, unknown> | null; // TODO: Define a proper user type based on application's needs

export type AuthState = {
  user: UserType;
  loading: boolean;
};

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
