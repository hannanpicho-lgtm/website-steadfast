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

// ── Token storage ────────────────────────────────────────────────────────────

export function storeSessionToken(token: string, username: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(CURRENT_USER_KEY, username);
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getStoredSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

// ── Server login ─────────────────────────────────────────────────────────────

export type ServerLoginResult =
  | { ok: true; username: string }
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

    storeSessionToken(token, returnedUsername);
    return { ok: true, username: returnedUsername };
  } catch {
    // Network failure — caller should fall back to localStorage
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

  // Fast client-side expiry check — decode payload without hitting server
  try {
    const payloadB64 = token.split('.')[0];
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '=='.slice(((padded.length + 3) & 3)));
    const payload = JSON.parse(json) as { u: string; e: number };
    if (Date.now() > payload.e) {
      clearSessionToken();
      return null;
    }
    // Token looks fresh — restore the username immediately from it
    if (payload.u) {
      localStorage.setItem(CURRENT_USER_KEY, payload.u);
      return payload.u;
    }
  } catch {
    // Malformed token — fall through to server verify
  }

  // Token not decodable client-side — verify with server
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
    return username;
  } catch {
    return null;
  }
}
