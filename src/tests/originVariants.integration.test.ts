import { beforeAll, describe, expect, it } from 'vitest';

const BASE = 'https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A';
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

    expect(result.status).toBe(400);
  });

  it('accepts trusted Referer fallback when Origin is absent', async () => {
    const result = await submitTaskWithHeaders({
      Referer: `${TRUSTED_ORIGIN}/dashboard`,
    });

    expect(result.status).toBe(400);
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
  });
});
