#!/usr/bin/env node
/**
 * API Smoke Test Script
 *
 * Calls every endpoint and verifies each returns a valid HTTP response
 * without throwing errors. Non-auth routes must return 2xx or expected 4xx.
 * Admin routes must return 401 (auth enforcement check).
 *
 * Usage:
 *   node scripts/api-smoke-test.mjs
 *   node scripts/api-smoke-test.mjs --verbose
 */

const BASE = 'https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A';
const ADMIN_JWT = process.env.SUPABASE_ADMIN_TEST_JWT ?? '';
const VERBOSE = process.argv.includes('--verbose');
const RUN_ID = Date.now();
const TEST_USER = `smoke_${RUN_ID}`;
const TEST_PHONE = `1555${String(RUN_ID).slice(-7)}`;
const LOGIN_PASSWORD = 'smoke12345';
const TRANSACTION_PASSWORD = 'smoke67890';

let passed = 0;
let failed = 0;
const failures = [];
let sessionCookie = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function call(method, path, body, extraHeaders = {}) {
  const url = `${BASE}${path}`;
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      ...extraHeaders,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, body: parsed, raw: text };
}

async function loginAndGetSessionCookie(username = TEST_USER, loginPassword = LOGIN_PASSWORD) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ username, loginPassword }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(String(body?.error ?? 'Failed to establish smoke session'));
  }

  const setCookie = res.headers.get('set-cookie') ?? '';
  const cookie = setCookie.split(';')[0]?.trim() ?? '';
  if (!cookie || !cookie.includes('steadfast_user_session=')) {
    throw new Error('Session cookie was not returned by auth/login');
  }

  return cookie;
}

async function ensureSmokeUserSessionCookie() {
  if (sessionCookie) {
    return sessionCookie;
  }

  const signup = await call('POST', '/auth/signup', {
    username: TEST_USER,
    phone: TEST_PHONE,
    gender: 'unknown',
    invitationCode: 'STF01',
    loginPassword: LOGIN_PASSWORD,
    transactionPassword: TRANSACTION_PASSWORD,
  });

  if (![200, 409].includes(signup.status)) {
    throw new Error(`Smoke signup failed with status ${signup.status}`);
  }

  sessionCookie = await loginAndGetSessionCookie();
  return sessionCookie;
}

async function callAsUser(method, path, body, extraHeaders = {}) {
  const cookie = await ensureSmokeUserSessionCookie();
  return call(method, path, body, {
    Cookie: cookie,
    ...extraHeaders,
  });
}

function adminHeaders() {
  return ADMIN_JWT ? { 'x-user-jwt': ADMIN_JWT } : {};
}

function check(name, { status, body }, expectedStatus, extraValidation) {
  const statusOk = Array.isArray(expectedStatus)
    ? expectedStatus.includes(status)
    : status === expectedStatus;
  const extraOk = extraValidation ? extraValidation(body) : true;

  if (statusOk && extraOk) {
    passed++;
    if (VERBOSE) console.log(`  ✓ ${name} (${status})`);
  } else {
    failed++;
    const reason = !statusOk
      ? `expected status ${JSON.stringify(expectedStatus)}, got ${status}`
      : `extra validation failed. body: ${JSON.stringify(body)}`;
    console.error(`  ✗ ${name} — ${reason}`);
    failures.push({ name, reason });
  }
}

// ─── Test groups ──────────────────────────────────────────────────────────────

async function testHealth() {
  console.log('\n[Health]');
  const r = await call('GET', '/health');
  check('GET /health', r, 200, b => b?.status === 'ok' && typeof b?.timestamp === 'string');

  const rLive = await call('GET', '/health/live');
  check('GET /health/live (liveness probe)', rLive, 200, b => b?.status === 'alive' && typeof b?.timestamp === 'string');

  const rReady = await call('GET', '/health/ready');
  check('GET /health/ready (readiness probe)', rReady, [200, 503], b => 
    (rReady.status === 200 && b?.status === 'ready' && b?.checks?.kv === 'healthy') ||
    (rReady.status === 503 && b?.status === 'not-ready')
  );
}

async function testUserEndpoints() {
  console.log('\n[User]');
  const r1 = await callAsUser('GET', '/me/user');
  check('GET /me/user — creates user', r1, 200, b => b?.username === TEST_USER);

  const r2 = await callAsUser('GET', '/me/user');
  check('GET /me/user — second call (idempotent)', r2, 200, b => b?.username === TEST_USER);
}

async function testSubmitTask() {
  console.log('\n[Submit Task]');

  const r1 = await callAsUser('POST', '/me/submit-task', {});
  check('POST /me/submit-task — missing productPrice → 400', r1, 400);

  const r2 = await callAsUser('POST', '/me/submit-task', { productPrice: -1 });
  check('POST /me/submit-task — negative price → 400', r2, 400);

  const r3 = await callAsUser('POST', '/me/submit-task', { productPrice: 0 });
  check('POST /me/submit-task — zero price → 400', r3, 400);

  const r4 = await callAsUser('POST', '/me/submit-task', { productPrice: 299.99 });
  check('POST /me/submit-task — valid → success or gated response', r4, [200, 409], b =>
    b?.success === true || typeof b?.error === 'string',
  );
}

async function testTaskRecords() {
  console.log('\n[Task Records]');
  const r = await callAsUser('GET', '/me/tasks');
  check('GET /me/tasks — returns array', r, 200, b => Array.isArray(b));
}

async function testTransactions() {
  console.log('\n[Transactions]');

  const legacy = await call('GET', `/transactions/${TEST_USER}`);
  check('GET /transactions/:username — retired route returns 404', legacy, 404);

  const noSession = await call('GET', '/me/transactions');
  check('GET /me/transactions — no session rejected', noSession, 401);

  const sessionRead = await callAsUser('GET', '/me/transactions');
  check('GET /me/transactions — session user returns array', sessionRead, 200, b => Array.isArray(b));

  const injected = await callAsUser('GET', '/me/transactions?username=admin');
  check('GET /me/transactions?username=admin — injected username ignored', injected, 200, b => Array.isArray(b));
}

async function testMeReads() {
  console.log('\n[Me Read Endpoints]');

  // ── /me/financials ─────────────────────────────────────────────────────────
  const financialsNoSession = await call('GET', '/me/financials');
  check('GET /me/financials — no session → 401', financialsNoSession, 401);

  const financials = await callAsUser('GET', '/me/financials');
  check('GET /me/financials — session user returns object', financials, 200, b =>
    b?.username === TEST_USER &&
    typeof b?.balance === 'number' &&
    typeof b?.holdAmount === 'number' &&
    typeof b?.availableAmount === 'number',
  );

  // ── /me/referrals/summary ──────────────────────────────────────────────────
  const referralsNoSession = await call('GET', '/me/referrals/summary');
  check('GET /me/referrals/summary — no session → 401', referralsNoSession, 401);

  const referrals = await callAsUser('GET', '/me/referrals/summary');
  check('GET /me/referrals/summary — session user returns object', referrals, 200, b =>
    b?.username === TEST_USER &&
    typeof b?.referralEarnings === 'number' &&
    Array.isArray(b?.children),
  );

  // ── /me/balance ────────────────────────────────────────────────────────────
  const balanceNoSession = await call('GET', '/me/balance');
  check('GET /me/balance — no session → 401', balanceNoSession, 401);

  const balance = await callAsUser('GET', '/me/balance');
  check('GET /me/balance — session user returns object', balance, 200, b =>
    b?.username === TEST_USER &&
    typeof b?.balance === 'number' &&
    typeof b?.availableAmount === 'number',
  );

  // ── /me/earnings ───────────────────────────────────────────────────────────
  const earningsNoSession = await call('GET', '/me/earnings');
  check('GET /me/earnings — no session → 401', earningsNoSession, 401);

  const earnings = await callAsUser('GET', '/me/earnings');
  check('GET /me/earnings — session user returns object', earnings, 200, b =>
    b?.username === TEST_USER &&
    typeof b?.todayCommission === 'number' &&
    typeof b?.completedCommission === 'number',
  );

  // ── /me/wallet ─────────────────────────────────────────────────────────────
  const walletNoSession = await call('GET', '/me/wallet');
  check('GET /me/wallet — no session → 401', walletNoSession, 401);

  const wallet = await callAsUser('GET', '/me/wallet');
  check('GET /me/wallet — session user returns object', wallet, 200, b =>
    b?.username === TEST_USER &&
    typeof b?.walletProfile === 'object',
  );

  // ── /me/withdrawals ────────────────────────────────────────────────────────
  const withdrawalsNoSession = await call('GET', '/me/withdrawals');
  check('GET /me/withdrawals — no session → 401', withdrawalsNoSession, 401);

  const withdrawals = await callAsUser('GET', '/me/withdrawals');
  check('GET /me/withdrawals — session user returns array', withdrawals, 200, b => Array.isArray(b));

  // ── /me/premium ────────────────────────────────────────────────────────────
  const premiumNoSession = await call('GET', '/me/premium');
  check('GET /me/premium — no session → 401', premiumNoSession, 401);

  const premium = await callAsUser('GET', '/me/premium');
  check('GET /me/premium — session user returns array', premium, 200, b => Array.isArray(b));
}

async function testSupportLinks() {
  console.log('\n[Support Links]');

  const r1 = await call('GET', '/cs/support-links');
  check('GET /cs/support-links → 200', r1, 200, b =>
    typeof b?.whatsappNumber === 'string' &&
    typeof b?.telegramUsername === 'string' &&
    typeof b?.supportEmail === 'string',
  );

  const testEmail = `smoke_${RUN_ID}@example.com`;
  const r2 = await call('POST', '/cs/support-links', {
    whatsappNumber: '15550000099',
    telegramUsername: 'smokebot',
    supportEmail: testEmail,
  }, adminHeaders());

  if (!ADMIN_JWT) {
    check('POST /cs/support-links — save → 401 without admin JWT', r2, 401);
    return;
  }

  check('POST /cs/support-links — save → 200', r2, 200, b => b?.success === true);

  const r3 = await call('GET', '/cs/support-links');
  check('GET /cs/support-links — persisted value', r3, 200, b => b?.supportEmail === testEmail);
}

async function testTickets() {
  console.log('\n[Support Tickets]');
  let ticketId;

  const r1 = await callAsUser('POST', '/cs/create-ticket', {});
  check('POST /cs/create-ticket — missing fields → 400', r1, 400);

  const r2 = await callAsUser('POST', '/cs/create-ticket', {
    subject: 'Smoke test ticket',
    message: 'Testing all endpoints',
    category: 'general',
    priority: 'low',
  });
  check('POST /cs/create-ticket — valid → 200', r2, 200, b => {
    if (b?.success) ticketId = b.ticket.id;
    return b?.success === true && typeof b?.ticket?.id === 'string';
  });

  const r3 = await callAsUser('GET', '/me/support');
  check('GET /me/support → array with ticket', r3, 200, b =>
    Array.isArray(b) && b.some(t => t.subject === 'Smoke test ticket'),
  );

  if (ticketId) {
    const r4 = await callAsUser('POST', '/cs/respond', { ticketId });
    check('POST /cs/respond — missing message → 400', r4, 400);

    const r5 = await call('POST', '/cs/respond', {
      ticketId,
      message: 'Smoke test reply',
      respondedBy: 'admin',
      isAdmin: true,
    }, adminHeaders());

    if (!ADMIN_JWT) {
      check('POST /cs/respond — valid → 401 without admin JWT', r5, 401);
    } else {
      check('POST /cs/respond — valid → 200', r5, 200, b => b?.success === true);
    }

    const r6 = await call('POST', '/cs/update-status', { ticketId, status: 'invalid_status' }, adminHeaders());
    check(
      'POST /cs/update-status — invalid status',
      r6,
      ADMIN_JWT ? 400 : 401,
    );

    const r7 = await call('POST', '/cs/update-status', { ticketId, status: 'resolved' }, adminHeaders());
    check(
      'POST /cs/update-status — valid status',
      r7,
      ADMIN_JWT ? 200 : 401,
      b => !ADMIN_JWT || b?.success === true,
    );
  }
}

async function testChat() {
  console.log('\n[Live Chat]');

  const r1 = await callAsUser('POST', '/cs/chat/send', { username: TEST_USER });
  check('POST /cs/chat/send — missing message → 400', r1, 400);

  const r2 = await callAsUser('POST', '/cs/chat/send', { message: 'hello' });
  check('POST /cs/chat/send — session-backed request without username → 200', r2, 200, b => b?.success === true);

  const r3 = await callAsUser('POST', '/cs/chat/send', {
    username: TEST_USER,
    message: 'Smoke test message',
  });
  check('POST /cs/chat/send — user message → 200', r3, 200, b => b?.success === true);

  const r4 = await call('POST', '/cs/chat/send', {
    username: TEST_USER,
    message: 'Admin smoke reply',
    isAdmin: true,
  }, adminHeaders());
  check(
    'POST /cs/chat/send — admin message',
    r4,
    ADMIN_JWT ? [200, 403] : 401,
    b => !ADMIN_JWT || (b?.success === true || b?.error === 'Forbidden'),
  );

  const r5 = await callAsUser('GET', `/cs/chat/${TEST_USER}`);
  check('GET /cs/chat/:username → array', r5, 200, b => Array.isArray(b) && b.length >= 1);

  const r6 = await callAsUser('POST', '/cs/chat/mark-read', { username: TEST_USER, viewer: 'bad' });
  check('POST /cs/chat/mark-read — invalid viewer → 400', r6, 400);

  const r7 = await callAsUser('POST', '/cs/chat/mark-read', { viewer: 'user' });
  check('POST /cs/chat/mark-read — viewer=user → 200', r7, 200, b => b?.success === true);

  const r8 = await call('POST', '/cs/chat/mark-read', { username: TEST_USER, viewer: 'admin' }, adminHeaders());
  check(
    'POST /cs/chat/mark-read — viewer=admin',
    r8,
    ADMIN_JWT ? [200, 403] : 401,
    b => !ADMIN_JWT || (b?.success === true || b?.error === 'Forbidden'),
  );
}

async function testAuth() {
  console.log('\n[Auth]');

  const r1 = await call('POST', '/auth/forgot-password', {});
  check('POST /auth/forgot-password — missing email → 400', r1, 400);

  const r2 = await call('POST', '/auth/forgot-password', { email: `smoke${RUN_ID}@test.com` });
  check('POST /auth/forgot-password — no _devToken in response', r2, 200, b => b?._devToken === undefined);

  const r3 = await call('GET', '/auth/verify-reset-token/totally-fake-token');
  check('GET /auth/verify-reset-token — bogus token → 400', r3, 400, b => b?.valid === false);

  const r4 = await call('POST', '/auth/reset-password', { token: 'x' });
  check('POST /auth/reset-password — missing fields → 400', r4, 400);

  const r5 = await call('POST', '/auth/reset-password', {
    token: 'fake',
    username: TEST_USER,
    newPassword: 'short',
  });
  check('POST /auth/reset-password — password too short → 400', r5, 400);

  const r6 = await callAsUser('POST', '/auth/change-password', { username: TEST_USER });
  check('POST /auth/change-password — missing fields → 400', r6, 400);

  const r7 = await callAsUser('POST', '/auth/change-password', {
    username: TEST_USER,
    currentPassword: 'old',
    newPassword: 'abc',
  });
  check('POST /auth/change-password — password too short → 400', r7, 400);
}

async function testAdminAuth() {
  console.log('\n[Admin Auth Enforcement — all must return 401]');

  const routes = [
    ['POST', '/admin/assign-premium-bundle', { username: TEST_USER, premiumProductValue: 500, bundledProductCount: 1 }],
    ['DELETE', `/admin/cancel-premium/${TEST_USER}/premium-fake`, undefined],
    ['GET', '/cs/admin/tickets', undefined],
    ['GET', '/cs/admin/chats', undefined],
    ['GET', '/admin/observability/security-summary', undefined],
    ['GET', '/admin/observability/security-alerts', undefined],
    ['GET', '/admin/observability/security-alert-history', undefined],
    ['DELETE', '/admin/observability/security-alert-history', undefined],
    ['GET', '/admin/observability/security-alert-history/stats', undefined],
    ['GET', '/admin/observability/security-alert-history/trends', undefined],
    ['GET', '/admin/observability/security-alert-history/quality', undefined],
    ['GET', '/admin/observability/security-alert-config', undefined],
    ['PUT', '/admin/observability/security-alert-config', {
      config: {
        errorRate5xxPctThreshold: 1.9,
        authFailuresPerMinuteThreshold: 28,
        rateLimitEventsPerMinuteThreshold: 45,
        requestLatencyP95MsThreshold: 1300,
      },
    }],
    ['GET', '/admin/observability/audit-log', undefined],
  ];

  for (const [method, path, body] of routes) {
    const r = await call(method, path, body);
    check(`${method} ${path} → 401 (anon token only)`, r, 401);
  }
}

async function testAdminSuccess() {
  if (!ADMIN_JWT) {
    return;
  }

  console.log('\n[Admin Success Path — requires SUPABASE_ADMIN_TEST_JWT]');

  const headers = { Authorization: `Bearer ${ADMIN_JWT}` };
  const tickets = await call('GET', '/cs/admin/tickets', undefined, headers);
  check('GET /cs/admin/tickets → 200 (admin JWT)', tickets, 200, b => Array.isArray(b));

  const chats = await call('GET', '/cs/admin/chats', undefined, headers);
  check('GET /cs/admin/chats → 200 (admin JWT)', chats, 200, b => Array.isArray(b));

  const securitySummary = await call('GET', '/admin/observability/security-summary?windowMinutes=15', undefined, headers);
  check(
    'GET /admin/observability/security-summary → 200 or 403 (admin JWT)',
    securitySummary,
    [200, 403],
    b =>
      securitySummary.status === 403
        ? typeof b?.error === 'string'
        : typeof b?.generatedAt === 'string' &&
          typeof b?.windowMinutes === 'number' &&
          typeof b?.totals?.events === 'number' &&
          Array.isArray(b?.recent),
  );

  const securityAlerts = await call('GET', '/admin/observability/security-alerts?windowMinutes=15', undefined, headers);
  check(
    'GET /admin/observability/security-alerts → 200 or 403 (admin JWT)',
    securityAlerts,
    [200, 403],
    b =>
      securityAlerts.status === 403
        ? typeof b?.error === 'string'
        : typeof b?.generatedAt === 'string' &&
          typeof b?.windowMinutes === 'number' &&
          typeof b?.thresholds === 'object' &&
          ['ok', 'warning', 'critical'].includes(b?.overallStatus) &&
          Array.isArray(b?.rules),
  );

  const securityAlertHistory = await call('GET', '/admin/observability/security-alert-history?limit=5&status=warning&sinceMinutes=60', undefined, headers);
  check(
    'GET /admin/observability/security-alert-history → 200 or 403 (admin JWT)',
    securityAlertHistory,
    [200, 403],
    b =>
      securityAlertHistory.status === 403
        ? typeof b?.error === 'string'
        : typeof b?.total === 'number' &&
          typeof b?.filteredTotal === 'number' &&
          Array.isArray(b?.items) &&
          b.items.length <= 5 &&
          b?.filters?.limit === 5 &&
          b?.filters?.status === 'warning' &&
          b?.filters?.sinceMinutes === 60,
  );

  const securityAlertHistoryDelete = await call('DELETE', '/admin/observability/security-alert-history', undefined, headers);
  check(
    'DELETE /admin/observability/security-alert-history → 200 or 403 (admin JWT)',
    securityAlertHistoryDelete,
    [200, 403],
    b =>
      securityAlertHistoryDelete.status === 403
        ? typeof b?.error === 'string'
        : b?.success === true && typeof b?.clearedCount === 'number',
  );

  const securityAlertHistoryStats = await call('GET', '/admin/observability/security-alert-history/stats?sinceMinutes=60', undefined, headers);
  check(
    'GET /admin/observability/security-alert-history/stats → 200 or 403 (admin JWT)',
    securityAlertHistoryStats,
    [200, 403],
    b =>
      securityAlertHistoryStats.status === 403
        ? typeof b?.error === 'string'
        : typeof b?.generatedAt === 'string' &&
          b?.sinceMinutes === 60 &&
          typeof b?.totals?.total === 'number' &&
          typeof b?.totals?.byStatus?.ok === 'number' &&
          typeof b?.totals?.byStatus?.warning === 'number' &&
          typeof b?.totals?.byStatus?.critical === 'number' &&
          typeof b?.rates?.okPct === 'number' &&
          typeof b?.rates?.warningPct === 'number' &&
          typeof b?.rates?.criticalPct === 'number' &&
          (b?.latest === null || typeof b?.latest === 'object'),
  );

  const securityAlertHistoryTrends = await call('GET', '/admin/observability/security-alert-history/trends?sinceMinutes=120&bucketMinutes=30', undefined, headers);
  check(
    'GET /admin/observability/security-alert-history/trends → 200 or 403 (admin JWT)',
    securityAlertHistoryTrends,
    [200, 403],
    b =>
      securityAlertHistoryTrends.status === 403
        ? typeof b?.error === 'string'
        : typeof b?.generatedAt === 'string' &&
          b?.sinceMinutes === 120 &&
          b?.bucketMinutes === 30 &&
          typeof b?.totals?.buckets === 'number' &&
          typeof b?.totals?.events === 'number' &&
          Array.isArray(b?.buckets),
  );

  const securityAlertHistoryQuality = await call('GET', '/admin/observability/security-alert-history/quality?sinceMinutes=120', undefined, headers);
  check(
    'GET /admin/observability/security-alert-history/quality → 200 or 403 (admin JWT)',
    securityAlertHistoryQuality,
    [200, 403],
    b =>
      securityAlertHistoryQuality.status === 403
        ? typeof b?.error === 'string'
        : typeof b?.generatedAt === 'string' &&
          b?.sinceMinutes === 120 &&
          typeof b?.totals?.total === 'number' &&
          typeof b?.totals?.ok === 'number' &&
          typeof b?.totals?.warning === 'number' &&
          typeof b?.totals?.critical === 'number' &&
          typeof b?.quality?.healthyRatioPct === 'number' &&
          typeof b?.quality?.noisyRatioPct === 'number' &&
          typeof b?.quality?.longestNonOkStreak === 'number' &&
          typeof b?.quality?.currentNonOkStreak === 'number' &&
          (b?.quality?.lastCriticalAt === null || typeof b?.quality?.lastCriticalAt === 'string'),
  );

  const securityAlertConfigPut = await call('PUT', '/admin/observability/security-alert-config', {
    config: {
      errorRate5xxPctThreshold: 1.8,
      authFailuresPerMinuteThreshold: 24,
      rateLimitEventsPerMinuteThreshold: 38,
      requestLatencyP95MsThreshold: 1150,
    },
  }, headers);
  check(
    'PUT /admin/observability/security-alert-config → 200 or 403 (admin JWT)',
    securityAlertConfigPut,
    [200, 403],
    b =>
      securityAlertConfigPut.status === 403
        ? typeof b?.error === 'string'
        : b?.success === true && typeof b?.config === 'object',
  );

  const securityAlertConfigGet = await call('GET', '/admin/observability/security-alert-config', undefined, headers);
  check(
    'GET /admin/observability/security-alert-config → 200 or 403 (admin JWT)',
    securityAlertConfigGet,
    [200, 403],
    b =>
      securityAlertConfigGet.status === 403
        ? typeof b?.error === 'string'
        : typeof b?.config === 'object' && typeof b?.config?.errorRate5xxPctThreshold === 'number',
  );

  const auditLog = await call('GET', '/admin/observability/audit-log?limit=10&sinceMinutes=1440', undefined, headers);
  check(
    'GET /admin/observability/audit-log → 200 or 403 (admin JWT)',
    auditLog,
    [200, 403],
    b =>
      auditLog.status === 403
        ? typeof b?.error === 'string'
        : typeof b?.total === 'number' &&
          typeof b?.filteredTotal === 'number' &&
          Array.isArray(b?.items) &&
          b?.items.length <= 10 &&
          b?.filters?.limit === 10 &&
          b?.filters?.sinceMinutes === 1440,
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log(`  API Smoke Test  —  ${new Date().toISOString()}`);
console.log(`  Endpoint: ${BASE}`);
console.log(`  Test user: ${TEST_USER}`);
console.log(`${'═'.repeat(60)}`);

try {
  await testHealth();
  await testUserEndpoints();
  await testSubmitTask();
  await testTaskRecords();
  await testTransactions();
  await testMeReads();
  await testSupportLinks();
  await testTickets();
  await testChat();
  await testAuth();
  await testAdminAuth();
  await testAdminSuccess();
} catch (err) {
  console.error('\n\nFatal error during smoke test:', err);
  process.exit(2);
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\n  Failed checks:');
  for (const f of failures) {
    console.log(`    • ${f.name}: ${f.reason}`);
  }
  console.log('');
  process.exit(1);
} else {
  console.log('  All endpoints responded correctly.\n');
  process.exit(0);
}
