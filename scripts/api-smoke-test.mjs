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
const VERBOSE = process.argv.includes('--verbose');
const RUN_ID = Date.now();
const TEST_USER = `smoke_${RUN_ID}`;

let passed = 0;
let failed = 0;
const failures = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function call(method, path, body, extraHeaders = {}) {
  const url = `${BASE}${path}`;
  const init = {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
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
  check('GET /health', r, 200, b => b?.status === 'ok');
}

async function testUserEndpoints() {
  console.log('\n[User]');
  const r1 = await call('GET', `/user/${TEST_USER}`);
  check('GET /user/:username — creates user', r1, 200, b => b?.username === TEST_USER);

  const r2 = await call('GET', `/user/${TEST_USER}`);
  check('GET /user/:username — second call (idempotent)', r2, 200, b => b?.username === TEST_USER);
}

async function testSubmitTask() {
  console.log('\n[Submit Task]');

  const r1 = await call('POST', '/submit-task', { productPrice: 100 });
  check('POST /submit-task — missing username → 400', r1, 400);

  const r2 = await call('POST', '/submit-task', { username: TEST_USER });
  check('POST /submit-task — missing productPrice → 400', r2, 400);

  const r3 = await call('POST', '/submit-task', { username: TEST_USER, productPrice: -1 });
  check('POST /submit-task — negative price → 400', r3, 400);

  const r4 = await call('POST', '/submit-task', { username: TEST_USER, productPrice: 0 });
  check('POST /submit-task — zero price → 400', r4, 400);

  const r5 = await call('POST', '/submit-task', { username: TEST_USER, productPrice: 299.99 });
  check('POST /submit-task — valid → 200 with commission', r5, 200, b => b?.success === true && typeof b?.commission === 'number');
}

async function testTaskRecords() {
  console.log('\n[Task Records]');
  const r = await call('GET', `/tasks/${TEST_USER}`);
  check('GET /tasks/:username — returns array', r, 200, b => Array.isArray(b));
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
  });
  check('POST /cs/support-links — save → 200', r2, 200, b => b?.success === true);

  const r3 = await call('GET', '/cs/support-links');
  check('GET /cs/support-links — persisted value', r3, 200, b => b?.supportEmail === testEmail);
}

async function testTickets() {
  console.log('\n[Support Tickets]');
  let ticketId;

  const r1 = await call('POST', '/cs/create-ticket', { username: TEST_USER });
  check('POST /cs/create-ticket — missing fields → 400', r1, 400);

  const r2 = await call('POST', '/cs/create-ticket', {
    username: TEST_USER,
    subject: 'Smoke test ticket',
    message: 'Testing all endpoints',
    category: 'general',
  });
  check('POST /cs/create-ticket — valid → 200', r2, 200, b => {
    if (b?.success) ticketId = b.ticket.id;
    return b?.success === true && typeof b?.ticket?.id === 'string';
  });

  const r3 = await call('GET', `/cs/tickets/${TEST_USER}`);
  check('GET /cs/tickets/:username → array with ticket', r3, 200, b =>
    Array.isArray(b) && b.some(t => t.subject === 'Smoke test ticket'),
  );

  if (ticketId) {
    const r4 = await call('POST', '/cs/respond', { ticketId });
    check('POST /cs/respond — missing message → 400', r4, 400);

    const r5 = await call('POST', '/cs/respond', {
      ticketId,
      message: 'Smoke test reply',
      respondedBy: 'admin',
      isAdmin: true,
    });
    check('POST /cs/respond — valid → 200', r5, 200, b => b?.success === true);

    const r6 = await call('POST', '/cs/update-status', { ticketId, status: 'invalid_status' });
    check('POST /cs/update-status — invalid status → 400', r6, 400);

    const r7 = await call('POST', '/cs/update-status', { ticketId, status: 'resolved' });
    check('POST /cs/update-status — valid status → 200', r7, 200, b => b?.success === true);
  }
}

async function testChat() {
  console.log('\n[Live Chat]');

  const r1 = await call('POST', '/cs/chat/send', { username: TEST_USER });
  check('POST /cs/chat/send — missing message → 400', r1, 400);

  const r2 = await call('POST', '/cs/chat/send', { message: 'hello' });
  check('POST /cs/chat/send — missing username → 400', r2, 400);

  const r3 = await call('POST', '/cs/chat/send', {
    username: TEST_USER,
    message: 'Smoke test message',
  });
  check('POST /cs/chat/send — user message → 200', r3, 200, b => b?.success === true);

  const r4 = await call('POST', '/cs/chat/send', {
    username: TEST_USER,
    message: 'Admin smoke reply',
    isAdmin: true,
  });
  check('POST /cs/chat/send — admin message → 200', r4, 200, b => b?.success === true);

  const r5 = await call('GET', `/cs/chat/${TEST_USER}`);
  check('GET /cs/chat/:username → array', r5, 200, b => Array.isArray(b) && b.length >= 2);

  const r6 = await call('POST', '/cs/chat/mark-read', { username: TEST_USER, viewer: 'bad' });
  check('POST /cs/chat/mark-read — invalid viewer → 400', r6, 400);

  const r7 = await call('POST', '/cs/chat/mark-read', { username: TEST_USER, viewer: 'user' });
  check('POST /cs/chat/mark-read — viewer=user → 200', r7, 200, b => b?.success === true);

  const r8 = await call('POST', '/cs/chat/mark-read', { username: TEST_USER, viewer: 'admin' });
  check('POST /cs/chat/mark-read — viewer=admin → 200', r8, 200, b => b?.success === true);
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

  const r6 = await call('POST', '/auth/change-password', { username: TEST_USER });
  check('POST /auth/change-password — missing fields → 400', r6, 400);

  const r7 = await call('POST', '/auth/change-password', {
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
  ];

  for (const [method, path, body] of routes) {
    const r = await call(method, path, body);
    check(`${method} ${path} → 401 (no secret)`, r, 401);

    const r2 = await call(method, path, body, { 'x-admin-secret': 'wrong-secret' });
    check(`${method} ${path} → 401 (wrong secret)`, r2, 401);
  }
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
  await testSupportLinks();
  await testTickets();
  await testChat();
  await testAuth();
  await testAdminAuth();
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
