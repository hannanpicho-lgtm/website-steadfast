import type { NavigateFunction } from 'react-router';
import { toast } from 'sonner';
import { buildLoginRedirectState } from './loginRedirect';
import { signOutAdminSession } from './supabaseAuth';

type RedirectedRef = {
  current: boolean;
};

export function isAdminAuthErrorMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();

  return normalized.includes('session expired')
    || normalized.includes('access denied')
    || normalized.includes('not authorized')
    || normalized.includes('authorized admin account')
    || normalized.includes('sign in again');
}

export function handleAdminAuthError(params: {
  errorValue: unknown;
  fallbackMessage: string;
  navigate: NavigateFunction;
  redirectedRef: RedirectedRef;
  redirectPath?: string;
  suppressToast?: boolean;
  onMessage?: (message: string) => void;
}): string {
  const {
    errorValue,
    fallbackMessage,
    navigate,
    redirectedRef,
    redirectPath = '/admin',
    suppressToast = false,
    onMessage,
  } = params;

  const message = errorValue instanceof Error ? errorValue.message : fallbackMessage;
  onMessage?.(message);

  if (isAdminAuthErrorMessage(message)) {
    if (!redirectedRef.current) {
      const normalized = message.toLowerCase();
      redirectedRef.current = true;
      toast.error(message);
      void signOutAdminSession();
      navigate('/login', {
        replace: true,
        state: buildLoginRedirectState(redirectPath, {
          adminRequired: true,
          authReason: normalized.includes('access denied') || normalized.includes('not authorized')
            ? 'admin-access-required'
            : 'session-expired',
          authMessage: message,
        }),
      });
    }

    return message;
  }

  if (!suppressToast) {
    toast.error(message);
  }

  return message;
}