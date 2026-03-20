/**
 * Session-bound authorization integration tests
 *
 * Verifies that user-facing endpoints reject cross-user access attempts.
 */
import { describe, it, expect } from 'vitest';

const BASE = 'https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A';

const SESSION_USER = 'ugreen';
const SESSION_PASSWORD = 'demo123';
const OTHER_USER = 'admin';

async function requestWithCookie(path: string, cookie: string, init?: RequestInit) {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    Cookie: cookie,
    ...(init?.headers ?? {}),
  } as Record<string, string>;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: mergedHeaders,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function loginAndGetSessionCookie() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      username: SESSION_USER,
      loginPassword: SESSION_PASSWORD,
    }),
  });

  const body = await res.json().catch(() => null);
  expect(res.status).toBe(200);
  expect(body?.ok).toBe(true);

  const setCookie = res.headers.get('set-cookie') ?? '';
  const cookie = setCookie.split(';')[0]?.trim() ?? '';
  expect(cookie.includes('steadfast_user_session=')).toBe(true);
  return cookie;
}

describe('Session-bound authorization', () => {
  it('rejects cross-user GET access for user profile-like endpoints with 403', async () => {
    const cookie = await loginAndGetSessionCookie();

    const userRes = await requestWithCookie(`/user/${OTHER_USER}`, cookie);
    const financialsRes = await requestWithCookie(`/financials/${OTHER_USER}/summary`, cookie);
    const tasksRes = await requestWithCookie(`/tasks/${OTHER_USER}`, cookie);

    expect(userRes.status).toBe(403);
    expect(financialsRes.status).toBe(403);
    expect(tasksRes.status).toBe(403);
  });

  it('rejects cross-user support data access with 403', async () => {
    const cookie = await loginAndGetSessionCookie();

    const ticketsRes = await requestWithCookie(`/cs/tickets/${OTHER_USER}`, cookie);
    const chatRes = await requestWithCookie(`/cs/chat/${OTHER_USER}`, cookie);

    expect(ticketsRes.status).toBe(403);
    expect(chatRes.status).toBe(403);
  });

  it('rejects cross-user POST mutations with 403', async () => {
    const cookie = await loginAndGetSessionCookie();

    const submitTaskRes = await requestWithCookie('/submit-task', cookie, {
      method: 'POST',
      body: JSON.stringify({ username: OTHER_USER, productPrice: 100 }),
    });

    const withdrawalRes = await requestWithCookie('/withdrawals/request', cookie, {
      method: 'POST',
      body: JSON.stringify({
        username: OTHER_USER,
        amount: 0.5,
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        method: 'USDT',
        transactionPassword: 'demo123',
      }),
    });

    const ticketRes = await requestWithCookie('/cs/create-ticket', cookie, {
      method: 'POST',
      body: JSON.stringify({
        username: OTHER_USER,
        subject: 'Cross user ticket',
        message: 'Should be forbidden',
        category: 'general',
        priority: 'low',
      }),
    });

    expect(submitTaskRes.status).toBe(403);
    expect(withdrawalRes.status).toBe(403);
    expect(ticketRes.status).toBe(403);
  });

  it('rejects cross-user referral link-user, link-admin-invite, and complete-premium-task with 403', async () => {
    const cookie = await loginAndGetSessionCookie();

    const linkUserRes = await requestWithCookie('/referral/link-user', cookie, {
      method: 'POST',
      body: JSON.stringify({
        username: OTHER_USER,
        invitationCode: 'XXXX01',
        parentInviteCode: 'XXXX02',
        loginPassword: 'hacked123',
      }),
    });

    const linkAdminInviteRes = await requestWithCookie('/referral/link-admin-invite', cookie, {
      method: 'POST',
      body: JSON.stringify({
        username: OTHER_USER,
        adminInviteCode: 'ABCD1',
      }),
    });

    const completePremiumRes = await requestWithCookie('/complete-premium-task', cookie, {
      method: 'POST',
      body: JSON.stringify({ username: OTHER_USER, productPrice: 500 }),
    });

    expect(linkUserRes.status).toBe(403);
    expect(linkAdminInviteRes.status).toBe(403);
    expect(completePremiumRes.status).toBe(403);
  });

  it('allows complete-premium-task to use the active session when username is omitted', async () => {
    const cookie = await loginAndGetSessionCookie();

    const completePremiumRes = await requestWithCookie('/complete-premium-task', cookie, {
      method: 'POST',
      body: JSON.stringify({ productPrice: 500 }),
    });

    expect([200, 404]).toContain(completePremiumRes.status);
    if (completePremiumRes.status === 404) {
      expect(String(completePremiumRes.body?.error ?? '')).toContain('No active premium assignment');
    }
  });

  it('allows link-admin-invite to use the active session when username is omitted', async () => {
    const cookie = await loginAndGetSessionCookie();

    const linkAdminInviteRes = await requestWithCookie('/referral/link-admin-invite', cookie, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    expect(linkAdminInviteRes.status).toBe(400);
    expect(String(linkAdminInviteRes.body?.error ?? '')).toContain('adminInviteCode is required');
  });
});
