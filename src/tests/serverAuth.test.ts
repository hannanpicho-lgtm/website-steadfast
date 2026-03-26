// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@utils/supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'anon-key',
}));

import {
  buildServerSessionHeaders,
  changeUserCredentials,
  clearSessionToken,
  getSessionUsername,
  getStoredSessionToken,
  installServerAuthFetchBridge,
  isPasswordChangeRequired,
  serverLogin,
  serverLogout,
  serverSignup,
  storeSessionToken,
  verifyAndRestoreSession,
} from '../app/services/serverAuth';

const fetchMock = vi.fn();

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const SESSION_TOKEN_KEY = 'steadfast_user_session_token_v1';
const MUST_CHANGE_PASSWORD_KEY = 'steadfast_force_password_change_v1';
const LEGACY_CURRENT_USER_KEY = 'steadfast_current_user_v1';

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  clearSessionToken();
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('session marker helpers', () => {
  it('stores username, session token, and password-change flag while clearing legacy storage keys', () => {
    sessionStorage.setItem(SESSION_TOKEN_KEY, 'old-token');
    sessionStorage.setItem(MUST_CHANGE_PASSWORD_KEY, 'true');
    localStorage.setItem(SESSION_TOKEN_KEY, 'old-token');
    localStorage.setItem(LEGACY_CURRENT_USER_KEY, 'legacy-user');

    storeSessionToken('fresh-token', 'alice', true);

    expect(getSessionUsername()).toBe('alice');
    expect(isPasswordChangeRequired()).toBe(true);
    expect(getStoredSessionToken()).toBe('fresh-token');
    expect(sessionStorage.getItem(SESSION_TOKEN_KEY)).toBe('fresh-token');
    expect(localStorage.getItem(SESSION_TOKEN_KEY)).toBe('fresh-token');
    expect(sessionStorage.getItem(MUST_CHANGE_PASSWORD_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_CURRENT_USER_KEY)).toBeNull();
  });

  it('clears cached auth markers', () => {
    storeSessionToken('fresh-token', 'alice', true);
    clearSessionToken();

    expect(getSessionUsername()).toBeNull();
    expect(isPasswordChangeRequired()).toBe(false);
    expect(getStoredSessionToken()).toBeNull();
  });

  it('builds headers with the fallback session token when available', () => {
    storeSessionToken('fresh-token', 'alice', false);

    const headers = buildServerSessionHeaders({ Authorization: 'Bearer anon-key' });

    expect(headers.get('Authorization')).toBe('Bearer anon-key');
    expect(headers.get('x-user-session-token')).toBe('fresh-token');
  });
});

describe('serverLogin', () => {
  it('returns success and stores normalized session markers', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ username: 'alice', mustChangePassword: true, sessionToken: 'session-123' }),
    );

    const result = await serverLogin(' alice ', 'pw');

    expect(result).toEqual({ ok: true, username: 'alice', mustChangePassword: true });
    expect(getSessionUsername()).toBe('alice');
    expect(isPasswordChangeRequired()).toBe(true);
    expect(getStoredSessionToken()).toBe('session-123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test-project.supabase.co/functions/v1/make-server-a1c55d7e/auth/login',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer anon-key',
        },
        body: JSON.stringify({ username: 'alice', loginPassword: 'pw' }),
      },
    );
  });

  it('returns server error payload on failed login', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Wrong password' }, 401));

    const result = await serverLogin('alice', 'bad');
    expect(result).toEqual({ ok: false, error: 'Wrong password' });
  });

  it('returns serverDown when fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    const result = await serverLogin('alice', 'pw');
    expect(result).toEqual({ ok: false, error: 'Server unreachable.', serverDown: true });
  });
});

describe('serverSignup', () => {
  const payload = {
    username: 'alice',
    phone: '123',
    gender: 'female',
    invitationCode: 'INV01',
    loginPassword: 'pw',
    transactionPassword: 'tpw',
  };

  it('returns normalized signup success payload', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        user: { username: 'alice', invitationCode: 'NEW01' },
        parentReward: '12.5',
        referralRate: '0.3',
      }),
    );

    const result = await serverSignup(payload);
    expect(result).toEqual({
      ok: true,
      username: 'alice',
      invitationCode: 'NEW01',
      parentReward: 12.5,
      referralRate: 0.3,
    });
  });

  it('returns server error payload on signup failure', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Username taken' }, 409));

    const result = await serverSignup(payload);
    expect(result).toEqual({ ok: false, error: 'Username taken' });
  });

  it('returns serverDown when signup fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    const result = await serverSignup(payload);
    expect(result).toEqual({ ok: false, error: 'Server unreachable.', serverDown: true });
  });
});

describe('verifyAndRestoreSession', () => {
  it('restores username and password-change flag from the server session', async () => {
    storeSessionToken('token-before-restore', 'alice', false);
    fetchMock.mockResolvedValueOnce(jsonResponse({ username: 'restored', mustChangePassword: true, sessionToken: 'token-after-restore' }));

    const result = await verifyAndRestoreSession();

    expect(result).toBe('restored');
    expect(getSessionUsername()).toBe('restored');
    expect(isPasswordChangeRequired()).toBe(true);
    expect(getStoredSessionToken()).toBe('token-after-restore');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test-project.supabase.co/functions/v1/make-server-a1c55d7e/auth/session/restore',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('x-user-session-token')).toBe('token-before-restore');
  });

  it('clears local markers and returns null on non-ok response', async () => {
    storeSessionToken('', 'alice', true);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'expired' }, 401));

    const result = await verifyAndRestoreSession();

    expect(result).toBeNull();
    expect(getSessionUsername()).toBeNull();
    expect(isPasswordChangeRequired()).toBe(false);
  });

  it('clears local markers and returns null when server payload lacks username', async () => {
    storeSessionToken('', 'alice', true);
    fetchMock.mockResolvedValueOnce(jsonResponse({ mustChangePassword: false }));

    const result = await verifyAndRestoreSession();
    expect(result).toBeNull();
    expect(getSessionUsername()).toBeNull();
  });

  it('clears local markers and returns null when fetch throws', async () => {
    storeSessionToken('', 'alice', true);
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    const result = await verifyAndRestoreSession();
    expect(result).toBeNull();
    expect(getSessionUsername()).toBeNull();
  });
});

describe('serverLogout', () => {
  it('clears local session markers after a successful server logout', async () => {
    storeSessionToken('', 'alice', true);
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 200));

    await serverLogout();

    expect(getSessionUsername()).toBeNull();
    expect(isPasswordChangeRequired()).toBe(false);
  });

  it('still clears local session markers when logout fetch fails', async () => {
    storeSessionToken('session-logout-token', 'alice', true);
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    await serverLogout();
    expect(getSessionUsername()).toBeNull();
  });
});

describe('installServerAuthFetchBridge', () => {
  it('adds the session token header to app server requests', async () => {
    const bridgedFetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', bridgedFetch as unknown as typeof fetch);
    clearSessionToken();
    storeSessionToken('bridge-token', 'alice', false);

    installServerAuthFetchBridge();

    await fetch('https://test-project.supabase.co/functions/v1/make-server-a1c55d7e/me/financials', {
      credentials: 'include',
      headers: { Authorization: 'Bearer anon-key' },
    });

    expect(bridgedFetch).toHaveBeenCalledTimes(1);
    const fetchInit = bridgedFetch.mock.calls[0]?.[1] as RequestInit;
    const headers = fetchInit.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer anon-key');
    expect(headers.get('x-user-session-token')).toBe('bridge-token');
  });
});

describe('changeUserCredentials', () => {
  it('returns not-signed-in error when no session exists', async () => {
    const result = await changeUserCredentials({ currentLoginPassword: 'old' });
    expect(result).toEqual({ ok: false, error: 'You are not signed in.' });
  });

  it('returns success and clears must-change-password flag after save', async () => {
    storeSessionToken('', 'alice', true);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await changeUserCredentials({
      currentLoginPassword: 'old',
      newLoginPassword: 'new-login',
      newTransactionPassword: 'new-transaction',
    });

    expect(result).toEqual({ ok: true });
    expect(isPasswordChangeRequired()).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test-project.supabase.co/functions/v1/make-server-a1c55d7e/auth/change-credentials',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer anon-key',
        },
        body: JSON.stringify({
          currentLoginPassword: 'old',
          newLoginPassword: 'new-login',
          newTransactionPassword: 'new-transaction',
        }),
      },
    );
  });

  it('returns server error payload when credential change fails', async () => {
    storeSessionToken('', 'alice', true);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Wrong password' }, 400));

    const result = await changeUserCredentials({ currentLoginPassword: 'old' });
    expect(result).toEqual({ ok: false, error: 'Wrong password' });
  });

  it('returns unreachable error when credential change fetch fails', async () => {
    storeSessionToken('', 'alice', true);
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    const result = await changeUserCredentials({ currentLoginPassword: 'old' });
    expect(result).toEqual({ ok: false, error: 'Server unreachable.' });
  });
});