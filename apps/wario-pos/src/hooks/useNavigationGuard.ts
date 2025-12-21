/**
 * useNavigationGuard - Reusable hook for blocking navigation with unsaved changes.
 *
 * Uses react-router's useBlocker to intercept navigation when a condition is met.
 * Returns blocker state for rendering a confirmation dialog.
 *
 * @example
 * const { blocker, isBlocked, proceed, cancel } = useNavigationGuard({
 *   when: isDirty,
 * });
 *
 * return (
 *   <>
 *     {isBlocked && (
 *       <NavigationGuardDialog
 *         onDiscard={proceed}
 *         onCancel={cancel}
 *         onSave={async () => { await save(); proceed(); }}
 *       />
 *     )}
 *   </>
 * );
 */

import { useCallback, useEffect } from 'react';
import { useBlocker } from 'react-router';

export interface UseNavigationGuardOptions {
  /** Whether navigation should be blocked */
  when: boolean;
  /** Optional: Also block browser back/forward/close with beforeunload */
  blockBrowserNavigation?: boolean;
}

export interface NavigationGuardResult {
  /** The underlying blocker object from react-router */
  blocker: ReturnType<typeof useBlocker>;
  /** Whether navigation is currently blocked */
  isBlocked: boolean;
  /** Call to proceed with the blocked navigation */
  proceed: () => void;
  /** Call to cancel the blocked navigation (stay on page) */
  cancel: () => void;
}

export function useNavigationGuard({
  when,
  blockBrowserNavigation = true,
}: UseNavigationGuardOptions): NavigationGuardResult {
  // Use react-router's useBlocker to intercept client-side navigation
  const blocker = useBlocker(when);

  const isBlocked = blocker.state === 'blocked';

  const proceed = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  const cancel = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  // Also block browser navigation (back/forward buttons, tab close)
  useEffect(() => {
    if (!when || !blockBrowserNavigation) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages, but this triggers the prompt
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [when, blockBrowserNavigation]);

  return {
    blocker,
    isBlocked,
    proceed,
    cancel,
  };
}
