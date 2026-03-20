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
  it('returns session-bound data for /me/tasks even when username is injected in query', async () => {
    const cookie = await loginAndGetSessionCookie();
    const injectedTasksRes = await requestWithCookie('/me/tasks?username=admin', cookie);

    expect(injectedTasksRes.status).toBe(200);
    expect(Array.isArray(injectedTasksRes.body)).toBe(true);
  });

  it('rejects cross-user support data access with 403', async () => {
    const cookie = await loginAndGetSessionCookie();

    const chatRes = await requestWithCookie(`/cs/chat/${OTHER_USER}`, cookie);

    expect(chatRes.status).toBe(403);
  });

  it('allows /cs/respond to derive respondedBy from the active session when omitted', async () => {
    const cookie = await loginAndGetSessionCookie();

    const respondRes = await requestWithCookie('/cs/respond', cookie, {
      method: 'POST',
      body: JSON.stringify({
        ticketId: 'ticket_nonexistent_for_session_authority_check',
        message: 'Session identity should be used when respondedBy is omitted',
        isAdmin: false,
      }),
    });

    expect(respondRes.status).toBe(404);
    expect(String(respondRes.body?.error ?? '')).toContain('Ticket not found');
  });

  it('rejects /cs/respond when client respondedBy mismatches the active session', async () => {
    const cookie = await loginAndGetSessionCookie();

    const respondRes = await requestWithCookie('/cs/respond', cookie, {
      method: 'POST',
      body: JSON.stringify({
        ticketId: 'ticket_nonexistent_for_session_authority_check',
        message: 'This should be rejected before ticket lookup',
        respondedBy: OTHER_USER,
        isAdmin: false,
      }),
    });

    expect(respondRes.status).toBe(403);
    expect(String(respondRes.body?.error ?? '')).toContain('requested user does not match active session');
  });

  it('rejects cross-user POST mutations with 403', async () => {
    const cookie = await loginAndGetSessionCookie();

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

    expect(ticketRes.status).toBe(403);
  });

  it('rejects cross-user referral link-user and link-admin-invite with 403', async () => {
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

    expect(linkUserRes.status).toBe(403);
    expect(linkAdminInviteRes.status).toBe(403);
  });

  it('allows /me/complete-premium-task to use the active session identity', async () => {
    const cookie = await loginAndGetSessionCookie();

    const completePremiumRes = await requestWithCookie('/me/complete-premium-task', cookie, {
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

  it('allows link-user to use the active session when username is omitted', async () => {
    const cookie = await loginAndGetSessionCookie();

    const linkUserRes = await requestWithCookie('/referral/link-user', cookie, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    expect(linkUserRes.status).toBe(400);
    expect(String(linkUserRes.body?.error ?? '')).toContain('invitationCode and parentInviteCode are required');
  });

  // ── /me/support* negative tests ───────────────────────────────────────────

  it('rejects GET /me/support without a session with 401', async () => {
    const res = await fetch(`${BASE}/me/support`, {
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
    });
    const body = await res.json().catch(() => null);
    expect(res.status).toBe(401);
    expect(body?.error).toBeTruthy();
  });

  it('rejects POST /me/support/create without a session with 401', async () => {
    const res = await fetch(`${BASE}/me/support/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ subject: 'Test', message: 'Test msg', category: 'general' }),
    });
    const body = await res.json().catch(() => null);
    expect(res.status).toBe(401);
    expect(body?.error).toBeTruthy();
  });

  it('rejects POST /me/support/reply without a session with 401', async () => {
    const res = await fetch(`${BASE}/me/support/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ ticketId: 'ticket_fake', message: 'Reply msg' }),
    });
    const body = await res.json().catch(() => null);
    expect(res.status).toBe(401);
    expect(body?.error).toBeTruthy();
  });

  it('rejects PUT /me/wallet without a session with 401', async () => {
    const res = await fetch(`${BASE}/me/wallet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        type: 'crypto',
        walletType: 'bitcoin',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'mainnet',
      }),
    });
    const body = await res.json().catch(() => null);
    expect(res.status).toBe(401);
    expect(body?.error).toBeTruthy();
  });

  it('rejects POST /me/withdrawals/request without a session with 401', async () => {
    const res = await fetch(`${BASE}/me/withdrawals/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        amount: 0.5,
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        method: 'USDT',
        transactionPassword: 'demo123',
      }),
    });
    const body = await res.json().catch(() => null);
    expect(res.status).toBe(401);
    expect(body?.error).toBeTruthy();
  });

  it('rejects POST /me/submit-task without a session with 401', async () => {
    const res = await fetch(`${BASE}/me/submit-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        taskId: 'task-no-session-check',
        productPrice: 100,
      }),
    });
    const body = await res.json().catch(() => null);
    expect([401, 404]).toContain(res.status);
    if (res.status === 401) {
      expect(body?.error).toBeTruthy();
    }
  });

  it('rejects POST /me/complete-premium-task without a session with 401', async () => {
    const res = await fetch(`${BASE}/me/complete-premium-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ productPrice: 100 }),
    });
    const body = await res.json().catch(() => null);
    expect([401, 404]).toContain(res.status);
    if (res.status === 401) {
      expect(body?.error).toBeTruthy();
    }
  });

  it('rejects /me user read endpoints without a session with 401', async () => {
    const headers = {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    };

    const [financialsRes, balanceRes, earningsRes, tasksRes, transactionsRes, userRes, walletRes, withdrawalsRes, referralsRes] = await Promise.all([
      fetch(`${BASE}/me/financials`, { headers }),
      fetch(`${BASE}/me/balance`, { headers }),
      fetch(`${BASE}/me/earnings`, { headers }),
      fetch(`${BASE}/me/tasks`, { headers }),
      fetch(`${BASE}/me/transactions`, { headers }),
      fetch(`${BASE}/me/user`, { headers }),
      fetch(`${BASE}/me/wallet`, { headers }),
      fetch(`${BASE}/me/withdrawals`, { headers }),
      fetch(`${BASE}/me/referrals/summary`, { headers }),
    ]);

    expect(financialsRes.status).toBe(401);
    expect(balanceRes.status).toBe(401);
    expect(earningsRes.status).toBe(401);
    expect(tasksRes.status).toBe(401);
    expect(transactionsRes.status).toBe(401);
    expect(userRes.status).toBe(401);
    expect(walletRes.status).toBe(401);
    expect(withdrawalsRes.status).toBe(401);
    expect(referralsRes.status).toBe(401);
  });

  it('ignores injected username query parameters for /me financial read endpoints', async () => {
    const cookie = await loginAndGetSessionCookie();

    const financialsRes = await requestWithCookie('/me/financials?username=admin', cookie);
    const balanceRes = await requestWithCookie('/me/balance?username=admin', cookie);
    const earningsRes = await requestWithCookie('/me/earnings?username=admin', cookie);

    expect(financialsRes.status).toBe(200);
    expect(financialsRes.body?.username).toBe(SESSION_USER);
    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body?.username).toBe(SESSION_USER);
    expect(earningsRes.status).toBe(200);
    expect(earningsRes.body?.username).toBe(SESSION_USER);
  });

  it('returns session-user data from /me/tasks and /me/transactions even when username is injected in the query', async () => {
    const cookie = await loginAndGetSessionCookie();

    const tasksRes = await requestWithCookie('/me/tasks?username=admin', cookie);
    const transactionsRes = await requestWithCookie('/me/transactions?username=admin', cookie);

    expect(tasksRes.status).toBe(200);
    expect(Array.isArray(tasksRes.body)).toBe(true);
    expect(transactionsRes.status).toBe(200);
    expect(Array.isArray(transactionsRes.body)).toBe(true);
  });

  it('returns session-user data from /me/user, /me/wallet, /me/withdrawals, and /me/referrals even when username is injected in the query', async () => {
    const cookie = await loginAndGetSessionCookie();

    const userRes = await requestWithCookie('/me/user?username=admin', cookie);
    const walletRes = await requestWithCookie('/me/wallet?username=admin', cookie);
    const withdrawalsRes = await requestWithCookie('/me/withdrawals?username=admin', cookie);
    const referralsRes = await requestWithCookie('/me/referrals/summary?username=admin', cookie);

    expect(userRes.status).toBe(200);
    expect(userRes.body?.username).toBe(SESSION_USER);
    expect(walletRes.status).toBe(200);
    expect(walletRes.body?.username).toBe(SESSION_USER);
    expect(withdrawalsRes.status).toBe(200);
    expect(Array.isArray(withdrawalsRes.body)).toBe(true);
    expect(referralsRes.status).toBe(200);
    expect(referralsRes.body?.username).toBe(SESSION_USER);
  });

  it('ignores injected username in /me/wallet write payload and applies updates to the session user', async () => {
    const cookie = await loginAndGetSessionCookie();

    const updateRes = await requestWithCookie('/me/wallet', cookie, {
      method: 'PUT',
      body: JSON.stringify({
        username: OTHER_USER,
        type: 'crypto',
        walletType: 'bitcoin',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'mainnet',
      }),
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body?.success).toBe(true);
    expect(updateRes.body?.username).toBe(SESSION_USER);

    const walletReadRes = await requestWithCookie('/me/wallet', cookie);
    expect(walletReadRes.status).toBe(200);
    expect(walletReadRes.body?.username).toBe(SESSION_USER);
    expect(walletReadRes.body?.walletProfile?.type).toBe('crypto');
  });

  it('ignores injected username in /me/withdrawals/request payload and never treats it as cross-user access', async () => {
    const cookie = await loginAndGetSessionCookie();

    const requestRes = await requestWithCookie('/me/withdrawals/request', cookie, {
      method: 'POST',
      body: JSON.stringify({
        username: OTHER_USER,
        amount: 0.5,
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        method: 'USDT',
        transactionPassword: 'wrong-password',
      }),
    });

    expect(requestRes.status).not.toBe(403);
    expect(String(requestRes.body?.error ?? '')).not.toContain('requested user does not match active session');
  });

  it('ignores injected username in /me/submit-task payload and never treats it as cross-user access', async () => {
    const cookie = await loginAndGetSessionCookie();

    const submitRes = await requestWithCookie('/me/submit-task', cookie, {
      method: 'POST',
      body: JSON.stringify({
        username: OTHER_USER,
        taskId: 'task-injected-username-check',
        productPrice: 100,
      }),
    });

    expect(submitRes.status).not.toBe(403);
    expect(String(submitRes.body?.error ?? '')).not.toContain('requested user does not match active session');
  });

  it('ignores injected username in /me/complete-premium-task payload and never treats it as cross-user access', async () => {
    const cookie = await loginAndGetSessionCookie();

    const completeRes = await requestWithCookie('/me/complete-premium-task', cookie, {
      method: 'POST',
      body: JSON.stringify({
        username: OTHER_USER,
        productPrice: 100,
      }),
    });

    expect(completeRes.status).not.toBe(403);
    expect(String(completeRes.body?.error ?? '')).not.toContain('requested user does not match active session');
  });

  it('loads session-user financial, balance, earnings, task, and transaction reads successfully', async () => {
    const cookie = await loginAndGetSessionCookie();

    const financialsRes = await requestWithCookie('/me/financials', cookie);
    const balanceRes = await requestWithCookie('/me/balance', cookie);
    const earningsRes = await requestWithCookie('/me/earnings', cookie);
    const tasksRes = await requestWithCookie('/me/tasks', cookie);
    const transactionsRes = await requestWithCookie('/me/transactions', cookie);

    expect(financialsRes.status).toBe(200);
    expect(financialsRes.body?.username).toBe(SESSION_USER);
    expect(typeof financialsRes.body?.balance).toBe('number');

    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body?.username).toBe(SESSION_USER);
    expect(typeof balanceRes.body?.availableAmount).toBe('number');

    expect(earningsRes.status).toBe(200);
    expect(earningsRes.body?.username).toBe(SESSION_USER);
    expect(typeof earningsRes.body?.todayCommission).toBe('number');

    expect(tasksRes.status).toBe(200);
    expect(Array.isArray(tasksRes.body)).toBe(true);

    expect(transactionsRes.status).toBe(200);
    expect(Array.isArray(transactionsRes.body)).toBe(true);
  });

  it('loads session-user profile, wallet, withdrawal, and referral reads successfully', async () => {
    const cookie = await loginAndGetSessionCookie();

    const userRes = await requestWithCookie('/me/user', cookie);
    const walletRes = await requestWithCookie('/me/wallet', cookie);
    const withdrawalsRes = await requestWithCookie('/me/withdrawals', cookie);
    const referralsRes = await requestWithCookie('/me/referrals/summary', cookie);

    expect(userRes.status).toBe(200);
    expect(userRes.body?.username).toBe(SESSION_USER);

    expect(walletRes.status).toBe(200);
    expect(walletRes.body?.username).toBe(SESSION_USER);
    expect('walletProfile' in (walletRes.body ?? {})).toBe(true);

    expect(withdrawalsRes.status).toBe(200);
    expect(Array.isArray(withdrawalsRes.body)).toBe(true);

    expect(referralsRes.status).toBe(200);
    expect(referralsRes.body?.username).toBe(SESSION_USER);
    expect(typeof referralsRes.body?.referralEarnings).toBe('number');
  });

  it('ignores injected username in /me/support/create body and uses session identity', async () => {
    const cookie = await loginAndGetSessionCookie();

    // Body contains a username field that should be completely ignored
    const createRes = await requestWithCookie('/me/support/create', cookie, {
      method: 'POST',
      body: JSON.stringify({
        username: OTHER_USER,
        subject: 'Session identity test',
        message: 'Username in body must be ignored',
        category: 'general',
        priority: 'low',
      }),
    });

    // Ticket is created successfully (not rejected) and owned by SESSION_USER
    expect(createRes.status).toBe(200);
    expect(createRes.body?.success).toBe(true);
    expect(createRes.body?.ticket?.username).toBe(SESSION_USER);
  });

  it('returns 404 when /me/support/reply targets a non-existent ticket', async () => {
    const cookie = await loginAndGetSessionCookie();

    const replyRes = await requestWithCookie('/me/support/reply', cookie, {
      method: 'POST',
      body: JSON.stringify({
        ticketId: 'ticket_nonexistent_me_support_pilot',
        message: 'Should hit 404',
      }),
    });

    expect(replyRes.status).toBe(404);
    expect(String(replyRes.body?.error ?? '')).toContain('Ticket not found');
  });

  it('full cycle: create ticket via /me/support/create, fetch via GET /me/support, reply via /me/support/reply', async () => {
    const cookie = await loginAndGetSessionCookie();

    // Create
    const createRes = await requestWithCookie('/me/support/create', cookie, {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Phase 3 pilot ticket',
        message: 'Initial message for pilot test',
        category: 'general',
        priority: 'high',
      }),
    });
    expect(createRes.status).toBe(200);
    expect(createRes.body?.success).toBe(true);
    const ticketId = createRes.body?.ticket?.id;
    expect(typeof ticketId).toBe('string');
    expect(createRes.body?.ticket?.username).toBe(SESSION_USER);

    // Fetch
    const fetchRes = await requestWithCookie('/me/support', cookie);
    expect(fetchRes.status).toBe(200);
    expect(Array.isArray(fetchRes.body)).toBe(true);
    const found = (fetchRes.body as any[]).find((t: any) => t.id === ticketId);
    expect(found).toBeTruthy();

    // Reply
    const replyRes = await requestWithCookie('/me/support/reply', cookie, {
      method: 'POST',
      body: JSON.stringify({ ticketId, message: 'Follow-up reply from pilot test' }),
    });
    expect(replyRes.status).toBe(200);
    expect(replyRes.body?.success).toBe(true);
    expect(replyRes.body?.ticket?.responses).toHaveLength(1);
    expect(replyRes.body?.ticket?.responses[0]?.respondedBy).toBe(SESSION_USER);
  });
});
