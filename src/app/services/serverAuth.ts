/**
 * Server-backed user authentication service.
 *
 * Replaces the unreliable localStorage-only credential lookup with
 * server-side verification so logins persist across domain switches,
 * cache clears, and redeployments.
 *
 * Token format: base64url(payload_json) + "." + base64url(hmac_sha256)
 * Payload: { u: username, e: expiresAt (unix ms) }
 */

import { projectId, publicAnonKey } from '@utils/supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
const SESSION_TOKEN_KEY = 'steadfast_user_session_token_v1';
const CURRENT_USER_KEY = 'steadfast_current_user_v1';
const MUST_CHANGE_PASSWORD_KEY = 'steadfast_force_password_change_v1';

// ── Token storage ────────────────────────────────────────────────────────────

export function storeSessionToken(token: string, username: string, mustChangePassword = false): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(CURRENT_USER_KEY, username);
  if (mustChangePassword) {
    localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, '1');
  } else {
    localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
  }
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
}

export function getStoredSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function isPasswordChangeRequired(): boolean {
  return localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === '1';
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
 * On success, stores the session token + username in localStorage and returns ok: true.
 */
export async function serverLogin(
  username: string,
  loginPassword: string,
): Promise<ServerLoginResult> {
  try {
    const res = await fetch(`${SERVER_URL}/auth/login`, {
      method: 'POST',
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

    const token = String(data.token ?? '');
    const returnedUsername = String(data.username ?? username.trim());
    const mustChangePassword = Boolean(data.mustChangePassword);

    storeSessionToken(token, returnedUsername, mustChangePassword);
    return { ok: true, username: returnedUsername, mustChangePassword };
  } catch {
    // Network failure — caller should fall back to localStorage
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
 * If valid, re-populates CURRENT_USER_KEY in localStorage so the app
 * considers the user authenticated even after a cache clear.
 *
 * Returns the username if valid, null otherwise.
 */
export async function verifyAndRestoreSession(): Promise<string | null> {
  const token = getStoredSessionToken();
  if (!token) return null;

  try {
    const res = await fetch(`${SERVER_URL}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ token }),
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

    localStorage.setItem(CURRENT_USER_KEY, username);
    if (Boolean(data.mustChangePassword)) {
      localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, '1');
    } else {
      localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    }
    return username;
  } catch {
    return null;
  }
}

export async function changeUserCredentials(params: {
  currentLoginPassword: string;
  newLoginPassword?: string;
  newTransactionPassword?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = getStoredSessionToken();
  if (!token) {
    return { ok: false, error: 'You are not signed in.' };
  }

  try {
    const res = await fetch(`${SERVER_URL}/auth/change-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        token,
        currentLoginPassword: params.currentLoginPassword,
        newLoginPassword: params.newLoginPassword ?? '',
        newTransactionPassword: params.newTransactionPassword ?? '',
      }),
    });

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      return { ok: false, error: String(data.error ?? 'Failed to update credentials.') };
    }

    localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Server unreachable.' };
  }
}
