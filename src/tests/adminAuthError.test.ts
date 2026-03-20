import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toastErrorMock, signOutAdminSessionMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  signOutAdminSessionMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock('../app/services/supabaseAuth', () => ({
  signOutAdminSession: signOutAdminSessionMock,
}));

import { handleAdminAuthError, isAdminAuthErrorMessage } from '../app/services/adminAuthError';

describe('isAdminAuthErrorMessage', () => {
  it('matches known admin auth phrases case-insensitively', () => {
    expect(isAdminAuthErrorMessage(' Session expired, sign in again ')).toBe(true);
    expect(isAdminAuthErrorMessage('ACCESS DENIED for this user')).toBe(true);
    expect(isAdminAuthErrorMessage('Not Authorized')).toBe(true);
    expect(isAdminAuthErrorMessage('Use an authorized admin account')).toBe(true);
  });

  it('returns false for non-auth failures', () => {
    expect(isAdminAuthErrorMessage('Network timeout')).toBe(false);
    expect(isAdminAuthErrorMessage('Something else broke')).toBe(false);
  });
});

describe('handleAdminAuthError', () => {
  const navigateMock = vi.fn();
  const onMessageMock = vi.fn();

  beforeEach(() => {
    navigateMock.mockReset();
    onMessageMock.mockReset();
    toastErrorMock.mockReset();
    signOutAdminSessionMock.mockReset();
    signOutAdminSessionMock.mockResolvedValue(undefined);
  });

  it('redirects and signs out on session-expired style messages', () => {
    const redirectedRef = { current: false };

    const result = handleAdminAuthError({
      errorValue: new Error('Session expired. Please sign in again.'),
      fallbackMessage: 'fallback',
      navigate: navigateMock,
      redirectedRef,
      onMessage: onMessageMock,
    });

    expect(result).toBe('Session expired. Please sign in again.');
    expect(onMessageMock).toHaveBeenCalledWith('Session expired. Please sign in again.');
    expect(redirectedRef.current).toBe(true);
    expect(toastErrorMock).toHaveBeenCalledWith('Session expired. Please sign in again.');
    expect(signOutAdminSessionMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/login', {
      replace: true,
      state: {
        from: '/admin',
        adminRequired: true,
        authReason: 'session-expired',
        authMessage: 'Session expired. Please sign in again.',
      },
    });
  });

  it('uses admin-access-required redirect reason for access denied messages', () => {
    const redirectedRef = { current: false };

    handleAdminAuthError({
      errorValue: new Error('Access denied for this action'),
      fallbackMessage: 'fallback',
      navigate: navigateMock,
      redirectedRef,
      redirectPath: '/admin/users',
    });

    expect(navigateMock).toHaveBeenCalledWith('/login', {
      replace: true,
      state: {
        from: '/admin/users',
        adminRequired: true,
        authReason: 'admin-access-required',
        authMessage: 'Access denied for this action',
      },
    });
  });

  it('does not redirect twice once redirectedRef is already set', () => {
    const redirectedRef = { current: true };

    const result = handleAdminAuthError({
      errorValue: new Error('Not authorized'),
      fallbackMessage: 'fallback',
      navigate: navigateMock,
      redirectedRef,
    });

    expect(result).toBe('Not authorized');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(signOutAdminSessionMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('shows a toast but does not redirect for non-auth errors', () => {
    const redirectedRef = { current: false };

    const result = handleAdminAuthError({
      errorValue: new Error('Request failed'),
      fallbackMessage: 'fallback',
      navigate: navigateMock,
      redirectedRef,
    });

    expect(result).toBe('Request failed');
    expect(redirectedRef.current).toBe(false);
    expect(toastErrorMock).toHaveBeenCalledWith('Request failed');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(signOutAdminSessionMock).not.toHaveBeenCalled();
  });

  it('honors suppressToast for non-auth errors', () => {
    const redirectedRef = { current: false };

    handleAdminAuthError({
      errorValue: 'not-an-error',
      fallbackMessage: 'Fallback shown',
      navigate: navigateMock,
      redirectedRef,
      suppressToast: true,
    });

    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});