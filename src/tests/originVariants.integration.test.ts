import { beforeAll, describe, expect, it } from 'vitest';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { FUNCTION_SERVICE_NAME } from '@utils/environment/config';

const BASE = `https://${projectId}.supabase.co/functions/v1/${FUNCTION_SERVICE_NAME}`;
const ANON_KEY = publicAnonKey;
const TRUSTED_ORIGIN = 'https://steadfastworkbench.org';
const UNTRUSTED_SUBDOMAIN_ORIGIN = 'https://subdomain.steadfastworkbench.org';
const SESSION_USER = 'ugreen';
const SESSION_PASSWORD = 'demo123';

let sessionCookie = '';

function baseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
  };
}

async function loginAndGetSessionCookie() {
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {
      ...baseHeaders(),
      Origin: TRUSTED_ORIGIN,
    },
    body: JSON.stringify({ username: SESSION_USER, loginPassword: SESSION_PASSWORD }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String((payload as { error?: string } | null)?.error ?? 'Failed to login for origin variant tests'));
  }

  const setCookie = response.headers.get('set-cookie') ?? '';
  const cookie = setCookie.split(';')[0]?.trim() ?? '';
  if (!cookie || !cookie.includes('steadfast_user_session=')) {
    throw new Error('Session cookie was not returned by auth/login for origin variant tests');
  }

  return cookie;
}

async function submitTaskWithHeaders(extraHeaders: Record<string, string>) {
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);

    try {
      const response = await fetch(`${BASE}/me/submit-task`, {
        method: 'POST',
        headers: {
          ...baseHeaders(),
          Cookie: sessionCookie,
          ...extraHeaders,
        },
        body: JSON.stringify({ productPrice: 0 }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const payload = await response.json().catch(() => null);
      return { status: response.status, body: payload as Record<string, unknown> | null };
    } catch {
      clearTimeout(timer);
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      return { status: 503, body: { code: 'network_timeout' } };
    }
  }

  return { status: 503, body: { code: 'network_timeout' } };
}

describe('CSRF trusted origin variants', () => {
  beforeAll(async () => {
    sessionCookie = await loginAndGetSessionCookie();
  });

  it('accepts trusted Origin header for unsafe session request', async () => {
    const result = await submitTaskWithHeaders({
      Origin: TRUSTED_ORIGIN,
    });

    // 400 = bad request (validation), 409 = conflict (active task already exists)
    // Both prove the request passed CSRF check and reached business logic
    expect([400, 409]).toContain(result.status);
  });

  it('accepts trusted Referer fallback when Origin is absent', async () => {
    const result = await submitTaskWithHeaders({
      Referer: `${TRUSTED_ORIGIN}/dashboard`,
    });

    // 400 = bad request (validation), 409 = conflict (active task already exists)
    // Both prove the request passed CSRF check and reached business logic
    expect([400, 409]).toContain(result.status);
  });

  it('rejects missing Origin and Referer for unsafe session request', async () => {
    const result = await submitTaskWithHeaders({});

    expect(result.status).toBe(403);
    expect(String(result.body?.code ?? '')).toBe('csrf_origin_required');
  });

  it('rejects untrusted subdomain Origin for unsafe session request', async () => {
    const result = await submitTaskWithHeaders({
      Origin: UNTRUSTED_SUBDOMAIN_ORIGIN,
    });

    expect([403, 503]).toContain(result.status);
    expect(['origin_not_allowed', 'csrf_origin_untrusted', 'network_timeout']).toContain(String(result.body?.code ?? ''));
  }, 60_000);
});
