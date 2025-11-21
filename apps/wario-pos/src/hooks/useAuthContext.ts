import { use } from 'react';

import { AuthContext } from '@/auth/context/auth-context';

// ----------------------------------------------------------------------

export function useAuthContext() {
  const context = use(AuthContext);

  if (!context) {
    throw new Error('useAuthContext: Context must be used inside AuthProvider');
  }

  // todo: this needs to clean up the auth context, namely the fields we're expecting to be populated

  return context;
}
