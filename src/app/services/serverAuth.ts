/**
 * Server-backed user authentication service.
 *
 * Auth authority lives on the backend via httpOnly cookie-backed sessions.
 * Frontend keeps only ephemeral in-memory identity markers.
 */

import { projectId, publicAnonKey } from '@utils/supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
const SESSION_TOKEN_KEY = 'steadfast_user_session_token_v1';
const MUST_CHANGE_PASSWORD_KEY = 'steadfast_force_password_change_v1';
const LEGACY_CURRENT_USER_KEY = 'steadfast_current_user_v1';

let sessionUsernameCache: string | null = null;
let mustChangePasswordCache = false;

// ── Token storage ────────────────────────────────────────────────────────────

export function storeSessionToken(token: string, username: string, mustChangePassword = false): void {
  sessionUsernameCache = username.trim() || null;
  mustChangePasswordCache = mustChangePassword;

  // Legacy key cleanup: auth authority is now backend session + in-memory cache.
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(LEGACY_CURRENT_USER_KEY);
}

export function clearSessionToken(): void {
  sessionUsernameCache = null;
  mustChangePasswordCache = false;
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(LEGACY_CURRENT_USER_KEY);
  sessionStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
}

export function getStoredSessionToken(): string | null {
  return null;
}

export function isPasswordChangeRequired(): boolean {
  return mustChangePasswordCache;
}

export function getSessionUsername(): string | null {
  return sessionUsernameCache;
}

// ── Server login ─────────────────────────────────────────────────────────────

export type ServerLoginResult =
  | { ok: true; username: string; mustChangePassword: boolean }
  | { ok: false; error: string; serverDown?: boolean };

export type ServerSignupPayload = {
  username: string;
  phone: string;
  gender: string;
  invitationCode: string;
  loginPassword: string;
  transactionPassword: string;
  adminInviteCode?: string;
};

export type ServerSignupResult =
  | { ok: true; username: string; invitationCode: string; parentReward: number; referralRate: number }
  | { ok: false; error: string; serverDown?: boolean };

/**
 * Authenticates against the server.
 * On success, stores the session token in sessionStorage and returns ok: true.
 */
export async function serverLogin(
  username: string,
  loginPassword: string,
): Promise<ServerLoginResult> {
  try {
    const res = await fetch(`${SERVER_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ username: username.trim(), loginPassword }),
    });

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;

    if (!res.ok) {
      return { ok: false, error: String(data?.error ?? 'Invalid username or password.') };
    }

    const returnedUsername = String(data.username ?? username.trim());
    const mustChangePassword = Boolean(data.mustChangePassword);

    storeSessionToken('', returnedUsername, mustChangePassword);
    return { ok: true, username: returnedUsername, mustChangePassword };
  } catch {
    return { ok: false, error: 'Server unreachable.', serverDown: true };
  }
}

export async function serverSignup(payload: ServerSignupPayload): Promise<ServerSignupResult> {
  try {
    const res = await fetch(`${SERVER_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      return { ok: false, error: String(data?.error ?? 'Signup failed.') };
    }

    const user = (data.user ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      username: String(user.username ?? payload.username.trim()),
      invitationCode: String(user.invitationCode ?? ''),
      parentReward: Number(data.parentReward ?? 0),
      referralRate: Number(data.referralRate ?? 0.2),
    };
  } catch {
    return { ok: false, error: 'Server unreachable.', serverDown: true };
  }
}

// ── Token verification (session restore on page load) ────────────────────────

/**
 * Verifies a stored session token with the server.
 * If valid, updates session-scoped auth markers.
 *
 * Returns the username if valid, null otherwise.
 */
export async function verifyAndRestoreSession(): Promise<string | null> {
  try {
    const res = await fetch(`${SERVER_URL}/auth/session/restore`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!res.ok) {
      clearSessionToken();
      return null;
    }

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    const username = String(data.username ?? '');
    if (!username) {
      clearSessionToken();
      return null;
    }

    storeSessionToken('', username, Boolean(data.mustChangePassword));
    return username;
  } catch {
    clearSessionToken();
    return null;
  }
}

export async function serverLogout(): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/auth/session/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
  } catch {
    // Best effort logout.
  } finally {
    clearSessionToken();
  }
}

export async function changeUserCredentials(params: {
  currentLoginPassword: string;
  newLoginPassword?: string;
  newTransactionPassword?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!sessionUsernameCache) {
    return { ok: false, error: 'You are not signed in.' };
  }

  try {
    const res = await fetch(`${SERVER_URL}/auth/change-credentials`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        currentLoginPassword: params.currentLoginPassword,
        newLoginPassword: params.newLoginPassword ?? '',
        newTransactionPassword: params.newTransactionPassword ?? '',
      }),
    });

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      return { ok: false, error: String(data.error ?? 'Failed to update credentials.') };
    }

    mustChangePasswordCache = false;
    return { ok: true };
  } catch {
    return { ok: false, error: 'Server unreachable.' };
  }
}
