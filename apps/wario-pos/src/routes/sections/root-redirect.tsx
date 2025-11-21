import { Navigate } from "react-router";

import { CONFIG } from "@/config";

export const RootRedirect = () => {
  // Check if we're in an OAuth callback (Auth0 redirect)
  const searchParams = new URLSearchParams(window.location.search);
  const isOAuthCallback = searchParams.has('code') && searchParams.has('state');

  // If this is an OAuth callback, don't redirect yet - let Auth0 process it
  // Auth0's onRedirectCallback will handle navigation after authentication
  if (isOAuthCallback) {
    return null; // Stay on / and let Auth0Provider handle the callback
  }

  // Normal navigation - redirect to dashboard
  return <Navigate to={CONFIG.auth.redirectPath} replace />;
};
