export type UserType = {
  id: string;
  email: string;
  name: string;
  family_name?: string;
  display_name: string;
  picture?: string;
  nickname?: string;
  [key: string]: unknown;
};

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
  hasScopes: (requiredScopes: string[] | string, requireAll?: boolean) => boolean;
  hasPermissions: (requiredPermissions: string[] | string, requireAll?: boolean) => boolean;
};
