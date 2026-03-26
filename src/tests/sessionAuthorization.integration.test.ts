/**
 * Session-bound authorization integration tests
 *
 * Verifies that user-facing endpoints reject cross-user access attempts.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A';
const TRUSTED_ORIGIN = 'https://steadfastworkbench.org';

const SESSION_USER = 'ugreen';
const SESSION_PASSWORD = 'demo123';
const OTHER_USER = 'admin';
const SUPPORT_STEP_RETRY_DELAY_MS = 1_500;
const SUPPORT_FETCH_TIMEOUT_MS = 150_000;
const SUPPORT_FETCH_WARN_THRESHOLD_MS = 90_000;
const SUPPORT_TOTAL_WARN_THRESHOLD_MS = 95_000;

type NetworkFailureCategory = 'timeout' | 'transient-http' | 'network-error';

type RequestDiagnostic = {
  path: string;
  status: number;
  body: any;
  attempts: number;
  retriesUsed: number;
  durationMs: number;
  failureCategory: NetworkFailureCategory | null;
  failureReason: string | null;
};

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? 'unknown error');
}

function classifyTransientFailure(status: number, error: unknown): {
  category: NetworkFailureCategory | null;
  reason: string | null;
} {
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      category: 'timeout',
      reason: 'request timed out',
    };
  }

  if (error) {
    return {
      category: 'network-error',
      reason: formatUnknownError(error),
    };
  }

  if (status === 408 || status === 429 || status >= 500) {
    return {
      category: 'transient-http',
      reason: `received HTTP ${status}`,
    };
  }

  return {
    category: null,
    reason: null,
  };
}

function logRequestDiagnostic(label: string, diagnostic: RequestDiagnostic) {
  const baseMessage = [
    `[Tier1Stability] ${label}`,
    `path=${diagnostic.path}`,
    `status=${diagnostic.status}`,
    `attempts=${diagnostic.attempts}`,
    `retries=${diagnostic.retriesUsed}`,
    `durationMs=${diagnostic.durationMs}`,
    `category=${diagnostic.failureCategory ?? 'success'}`,
    `reason=${diagnostic.failureReason ?? 'none'}`,
  ].join(' ');

  if (diagnostic.failureCategory) {
    console.warn(baseMessage);
    return;
  }

  console.info(baseMessage);
}

function warnOnLatency(label: string, durationMs: number, thresholdMs: number) {
  if (durationMs > thresholdMs) {
    console.warn(`[Tier1LatencyWarning] ${label} durationMs=${durationMs} thresholdMs=${thresholdMs}`);
  }
}

async function requestWithCookieDetailed(
  path: string,
  cookie: string,
  init?: RequestInit,
  maxAttempts = 2,
  timeoutMs = 25_000,
): Promise<RequestDiagnostic> {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    Origin: TRUSTED_ORIGIN,
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    Cookie: cookie,
    ...(init?.headers ?? {}),
  } as Record<string, string>;

  const startedAt = Date.now();
  let lastStatus = 0;
  let lastBody: any = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: mergedHeaders,
        signal: controller.signal,
      });
      const body = await res.json().catch(() => null);
      clearTimeout(timer);

      lastStatus = res.status;
      lastBody = body;
      lastError = null;

      const transient = classifyTransientFailure(res.status, null);
      if (transient.category && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, SUPPORT_STEP_RETRY_DELAY_MS));
        continue;
      }

      return {
        path,
        status: res.status,
        body,
        attempts: attempt,
        retriesUsed: attempt - 1,
        durationMs: Date.now() - startedAt,
        failureCategory: transient.category,
        failureReason: transient.reason,
      };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;

      const transient = classifyTransientFailure(0, error);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, SUPPORT_STEP_RETRY_DELAY_MS));
        continue;
      }

      return {
        path,
        status: lastStatus || 503,
        body: lastBody,
        attempts: attempt,
        retriesUsed: attempt - 1,
        durationMs: Date.now() - startedAt,
        failureCategory: transient.category,
        failureReason: transient.reason,
      };
    }
  }

  const exhausted = classifyTransientFailure(lastStatus, lastError);
  return {
    path,
    status: lastStatus || 503,
    body: lastBody,
    attempts: maxAttempts,
    retriesUsed: Math.max(0, maxAttempts - 1),
    durationMs: Date.now() - startedAt,
    failureCategory: exhausted.category,
    failureReason: exhausted.reason,
  };
}

function assertNoPersistentNetworkFailure(stepName: string, diagnostic: RequestDiagnostic) {
  logRequestDiagnostic(stepName, diagnostic);
  if (!diagnostic.failureCategory) {
    return;
  }

  throw new Error(
    `[NETWORK_${diagnostic.failureCategory.toUpperCase()}] ${stepName} exhausted retries `
      + `(path=${diagnostic.path} status=${diagnostic.status} attempts=${diagnostic.attempts} `
      + `durationMs=${diagnostic.durationMs} reason=${diagnostic.failureReason ?? 'unknown'})`,
  );
}

async function requestWithCookie(
  path: string,
  cookie: string,
  init?: RequestInit,
  maxAttempts = 2,
  timeoutMs = 25_000,
) {
  const diagnostic = await requestWithCookieDetailed(path, cookie, init, maxAttempts, timeoutMs);
  return { status: diagnostic.status, body: diagnostic.body };
}

async function requestWithoutSession(path: string, init?: RequestInit, maxAttempts = 2, timeoutMs = 25_000) {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    Origin: TRUSTED_ORIGIN,
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    ...(init?.headers ?? {}),
  } as Record<string, string>;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: mergedHeaders,
        signal: controller.signal,
      });
      const body = await res.json().catch(() => null);
      clearTimeout(timer);
      if (res.status >= 500 && attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return { status: res.status, body };
    } catch {
      clearTimeout(timer);
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return { status: 503, body: null };
    }
  }

  return { status: 503, body: null };
}

async function loginAndGetSessionCookie() {
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: TRUSTED_ORIGIN,
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ username: SESSION_USER, loginPassword: SESSION_PASSWORD }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status < 500) break;
    } catch {
      clearTimeout(timer);
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
  }

  const body = await res!.json().catch(() => null);
  expect(res!.status).toBe(200);
  expect(body?.ok).toBe(true);

  const setCookie = res!.headers.get('set-cookie') ?? '';
  const cookie = setCookie.split(';')[0]?.trim() ?? '';
  expect(cookie.includes('steadfast_user_session=')).toBe(true);
  return cookie;
}

describe('Session-bound authorization', () => {
  let sessionCookie = '';

  beforeAll(async () => {
    sessionCookie = await loginAndGetSessionCookie();
  }, 60000);

  it('returns session-bound data for /me/tasks even when username is injected in query', async () => {
    const cookie = sessionCookie;
    const injectedTasksRes = await requestWithCookie('/me/tasks?username=admin', cookie);

    expect(injectedTasksRes.status).toBe(200);
    expect(Array.isArray(injectedTasksRes.body)).toBe(true);
  });

  it('rejects cross-user support data access with 403', async () => {
    const cookie = sessionCookie;

    const chatRes = await requestWithCookie(`/cs/chat/${OTHER_USER}`, cookie);

    expect(chatRes.status).toBe(403);
  });

  it('allows /cs/respond to derive respondedBy from the active session when omitted', async () => {
    const cookie = sessionCookie;

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
    const cookie = sessionCookie;

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

  it('ignores injected username for /cs/create-ticket and uses active session identity', async () => {
    const cookie = sessionCookie;

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

    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body?.ticket?.username).toBe(SESSION_USER);
  });

  it('ignores injected username for referral link routes and uses active session identity', async () => {
    const cookie = sessionCookie;

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

    expect([400, 404, 409]).toContain(linkUserRes.status);
    expect([400, 404]).toContain(linkAdminInviteRes.status);
  });

  it('allows /me/complete-premium-task to use the active session identity', async () => {
    const cookie = sessionCookie;

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
    const cookie = sessionCookie;

    const linkAdminInviteRes = await requestWithCookie('/referral/link-admin-invite', cookie, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    expect(linkAdminInviteRes.status).toBe(400);
    expect(String(linkAdminInviteRes.body?.error ?? '')).toContain('adminInviteCode is required');
  });

  it('allows link-user to use the active session when username is omitted', async () => {
    const cookie = sessionCookie;

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
    const res = await requestWithoutSession('/me/support/create', {
      method: 'POST',
      body: JSON.stringify({ subject: 'Test', message: 'Test msg', category: 'general' }),
    });
    expect(res.status).toBe(401);
    expect(res.body?.error).toBeTruthy();
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
    const [financialsRes, balanceRes, earningsRes, tasksRes, transactionsRes, premiumRes, userRes, walletRes, withdrawalsRes, referralsRes] = await Promise.all([
      requestWithoutSession('/me/financials'),
      requestWithoutSession('/me/balance'),
      requestWithoutSession('/me/earnings'),
      requestWithoutSession('/me/tasks'),
      requestWithoutSession('/me/transactions'),
      requestWithoutSession('/me/premium'),
      requestWithoutSession('/me/user'),
      requestWithoutSession('/me/wallet'),
      requestWithoutSession('/me/withdrawals'),
      requestWithoutSession('/me/referrals/summary'),
    ]);

    expect(financialsRes.status).toBe(401);
    expect(balanceRes.status).toBe(401);
    expect(earningsRes.status).toBe(401);
    expect(tasksRes.status).toBe(401);
    expect(transactionsRes.status).toBe(401);
    expect(premiumRes.status).toBe(401);
    expect(userRes.status).toBe(401);
    expect(walletRes.status).toBe(401);
    expect(withdrawalsRes.status).toBe(401);
    expect(referralsRes.status).toBe(401);
  });

  it('ignores injected username query parameters for /me financial read endpoints', async () => {
    const cookie = sessionCookie;

    const financialsRes = await requestWithCookie('/me/financials?username=admin', cookie, undefined, 3, 30_000);
    const balanceRes = await requestWithCookie('/me/balance?username=admin', cookie, undefined, 3, 30_000);
    const earningsRes = await requestWithCookie('/me/earnings?username=admin', cookie, undefined, 3, 30_000);

    expect(financialsRes.status).toBe(200);
    expect(financialsRes.body?.username).toBe(SESSION_USER);
    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body?.username).toBe(SESSION_USER);
    expect(earningsRes.status).toBe(200);
    expect(earningsRes.body?.username).toBe(SESSION_USER);
  }, 120000);

  it('returns session-user data from /me/tasks, /me/transactions, and /me/premium even when username is injected in the query', async () => {
    const cookie = sessionCookie;

    const tasksRes = await requestWithCookie('/me/tasks?username=admin', cookie, undefined, 3, 30_000);
    const transactionsRes = await requestWithCookie('/me/transactions?username=admin', cookie, undefined, 3, 30_000);
    const premiumRes = await requestWithCookie('/me/premium?username=admin', cookie, undefined, 3, 30_000);

    expect(tasksRes.status).toBe(200);
    expect(Array.isArray(tasksRes.body)).toBe(true);
    expect(transactionsRes.status).toBe(200);
    expect(Array.isArray(transactionsRes.body)).toBe(true);
    expect(premiumRes.status).toBe(200);
    expect(Array.isArray(premiumRes.body)).toBe(true);
  }, 120000);

  it('returns session-user data from /me/user, /me/wallet, /me/withdrawals, and /me/referrals even when username is injected in the query', async () => {
    const cookie = sessionCookie;

    const userRes = await requestWithCookie('/me/user?username=admin', cookie, undefined, 3, 30_000);
    const walletRes = await requestWithCookie('/me/wallet?username=admin', cookie, undefined, 3, 30_000);
    const withdrawalsRes = await requestWithCookie('/me/withdrawals?username=admin', cookie, undefined, 3, 30_000);
    const referralsRes = await requestWithCookie('/me/referrals/summary?username=admin', cookie, undefined, 3, 30_000);

    expect(userRes.status).toBe(200);
    expect(userRes.body?.username).toBe(SESSION_USER);
    expect(walletRes.status).toBe(200);
    expect(walletRes.body?.username).toBe(SESSION_USER);
    expect(withdrawalsRes.status).toBe(200);
    expect(Array.isArray(withdrawalsRes.body)).toBe(true);
    expect(referralsRes.status).toBe(200);
    expect(referralsRes.body?.username).toBe(SESSION_USER);
  }, 180000);

  it('ignores injected username in /me/wallet write payload and applies updates to the session user', async () => {
    const cookie = sessionCookie;

    const updateRes = await requestWithCookie('/me/wallet', cookie, {
      method: 'PUT',
      body: JSON.stringify({
        username: OTHER_USER,
        type: 'crypto',
        walletType: 'bitcoin',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'mainnet',
      }),
    }, 3, 30_000);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body?.success).toBe(true);
    expect(updateRes.body?.username).toBe(SESSION_USER);

    const walletReadRes = await requestWithCookie('/me/wallet', cookie, undefined, 3, 30_000);
    expect(walletReadRes.status).toBe(200);
    expect(walletReadRes.body?.username).toBe(SESSION_USER);
    expect(walletReadRes.body?.walletProfile?.type).toBe('crypto');
  }, 180000);

  it('ignores injected username in /me/withdrawals/request payload and never treats it as cross-user access', async () => {
    const cookie = sessionCookie;

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
    const cookie = sessionCookie;

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
    const cookie = sessionCookie;

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

  it('loads session-user financial, balance, earnings, task, transaction, and premium reads successfully', async () => {
    const cookie = sessionCookie;

    const financialsRes = await requestWithCookie('/me/financials', cookie, undefined, 3, 30_000);
    const balanceRes = await requestWithCookie('/me/balance', cookie, undefined, 3, 30_000);
    const earningsRes = await requestWithCookie('/me/earnings', cookie, undefined, 3, 30_000);
    const tasksRes = await requestWithCookie('/me/tasks', cookie, undefined, 3, 30_000);
    const transactionsRes = await requestWithCookie('/me/transactions', cookie, undefined, 3, 30_000);
    const premiumRes = await requestWithCookie('/me/premium', cookie, undefined, 3, 30_000);

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

    expect(premiumRes.status).toBe(200);
    expect(Array.isArray(premiumRes.body)).toBe(true);
  }, 180000);

  it('loads session-user profile, wallet, withdrawal, and referral reads successfully', async () => {
    const cookie = sessionCookie;

    const userRes = await requestWithCookie('/me/user', cookie, undefined, 3, 30_000);
    const walletRes = await requestWithCookie('/me/wallet', cookie, undefined, 3, 30_000);
    const withdrawalsRes = await requestWithCookie('/me/withdrawals', cookie, undefined, 3, 30_000);
    const referralsRes = await requestWithCookie('/me/referrals/summary', cookie, undefined, 3, 30_000);

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
  }, 180000);

  it('ignores injected username in /me/support/create body and uses session identity', async () => {
    const cookie = sessionCookie;

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
    const cookie = sessionCookie;

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
    const cookie = sessionCookie;
    const testStartedAt = Date.now();

    try {
      const createRes = await requestWithCookieDetailed('/me/support/create', cookie, {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Phase 3 pilot ticket',
          message: 'Initial message for pilot test',
          category: 'general',
          priority: 'high',
        }),
      }, 3, 30_000);
      assertNoPersistentNetworkFailure('support-create', createRes);
      warnOnLatency('support-create', createRes.durationMs, 4_000);
      expect(createRes.status).toBe(200);
      expect(createRes.body?.success).toBe(true);
      const ticketId = createRes.body?.ticket?.id;
      expect(typeof ticketId).toBe('string');
      expect(createRes.body?.ticket?.username).toBe(SESSION_USER);

      const fetchRes = await requestWithCookieDetailed('/me/support', cookie, undefined, 2, SUPPORT_FETCH_TIMEOUT_MS);
      assertNoPersistentNetworkFailure('support-fetch', fetchRes);
      warnOnLatency('support-fetch', fetchRes.durationMs, SUPPORT_FETCH_WARN_THRESHOLD_MS);
      expect(fetchRes.status).toBe(200);
      expect(Array.isArray(fetchRes.body)).toBe(true);
      const found = (fetchRes.body as any[]).find((ticket: any) => ticket.id === ticketId);
      expect(found).toBeTruthy();

      const replyRes = await requestWithCookieDetailed('/me/support/reply', cookie, {
        method: 'POST',
        body: JSON.stringify({ ticketId, message: 'Follow-up reply from pilot test' }),
      }, 3, 30_000);
      assertNoPersistentNetworkFailure('support-reply', replyRes);
      warnOnLatency('support-reply', replyRes.durationMs, 5_000);
      expect(replyRes.status).toBe(200);
      expect(replyRes.body?.success).toBe(true);
      expect(replyRes.body?.ticket?.responses).toHaveLength(1);
      expect(replyRes.body?.ticket?.responses[0]?.respondedBy).toBe(SESSION_USER);

      const totalDurationMs = Date.now() - testStartedAt;
      console.info(`[Tier1SupportCycle] totalDurationMs=${totalDurationMs}`);
      warnOnLatency('support-full-cycle-total', totalDurationMs, SUPPORT_TOTAL_WARN_THRESHOLD_MS);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('[NETWORK_')) {
        console.error(`[Tier1FailureClassification] category=network-transient message=${error.message}`);
        throw error;
      }

      console.error(`[Tier1FailureClassification] category=assertion-logic message=${formatUnknownError(error)}`);
      throw error;
    }
  }, 420000);
});
