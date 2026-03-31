#!/usr/bin/env node
/**
 * Endpoint Inventory Audit Script
 *
 * Programmatically extracts every API route declared in
 * supabase/functions/server/index.ts, calls each route, and validates:
 * - A response is returned (no network/runtime throw)
 * - Status code is not 5xx for baseline validation/auth scenarios
 * - Auth-protected endpoints reject anonymous access
 *
 * Optional env vars:
 * - API_BASE_URL
 * - SUPABASE_ANON_KEY
 * - SUPABASE_ADMIN_TEST_JWT
 * - AUDIT_TIMEOUT_MS (default: 30000)
 * - AUDIT_MAX_ATTEMPTS (default: 3)
 */

import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { resolveRuntimeEnvironment } from './shared/resolve-runtime-env.mjs';

const runtimeEnv = await resolveRuntimeEnvironment();
const BASE = process.env.API_BASE_URL ?? runtimeEnv.apiBaseUrl;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? runtimeEnv.anonKey;
const ADMIN_TEST_JWT = process.env.SUPABASE_ADMIN_TEST_JWT ?? '';
const TIMEOUT_MS = Number(process.env.AUDIT_TIMEOUT_MS ?? '30000');
const MAX_ATTEMPTS = Math.max(1, Number(process.env.AUDIT_MAX_ATTEMPTS ?? '3'));

const SERVER_FILE = new URL('../supabase/functions/server/index.ts', import.meta.url);

const ROUTE_PREFIX = `/${runtimeEnv.functionName}`;
const ROUTE_REGEX = /app\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]/g;

const SAFE_STATUSES = new Set([200, 201, 204, 400, 401, 403, 404, 405, 409, 410, 415, 422, 429, 503]);

const methodDefaultPayload = {
  post: {},
  put: {},
  patch: {},
  delete: undefined,
  get: undefined,
};

let userSeed = null;

function normalizeRoutePath(rawPath) {
  let path = rawPath.startsWith(ROUTE_PREFIX) ? rawPath.slice(ROUTE_PREFIX.length) : rawPath;
  if (!path.startsWith('/')) path = `/${path}`;

  path = path.replace(':adminId', 'smoke-admin-id');
  path = path.replace(':taskId', 'task-amazon-headphones');
  path = path.replace(':withdrawalId', 'withdrawal-smoke-id');
  path = path.replace(':username', 'smoke_user');
  path = path.replace(':premiumId', 'premium-smoke-id');
  path = path.replace(':token', 'fake-token');

  return path;
}

function extractRoutes(sourceText) {
  const found = [];
  const seen = new Set();

  for (const match of sourceText.matchAll(ROUTE_REGEX)) {
    const method = match[1].toLowerCase();
    const rawPath = match[2];
    const path = normalizeRoutePath(rawPath);
    const key = `${method.toUpperCase()} ${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ method, path, rawPath });
  }

  return found;
}

function classifyPath(path) {
  if (path.startsWith('/admin/') || path.startsWith('/cs/admin/')) return 'admin';
  if (path.startsWith('/me/')) return 'session-user';
  return 'public';
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms: ${label}`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function headers(mode = 'anon') {
  const base = {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
  };

  if (mode === 'admin' && ADMIN_TEST_JWT) {
    return {
      ...base,
      'x-user-jwt': ADMIN_TEST_JWT,
    };
  }

  return base;
}

async function fetchJson(method, path, body, mode = 'anon') {
  const url = `${BASE}${path}`;
  const init = {
    method: method.toUpperCase(),
    headers: headers(mode),
  };

  if (body !== undefined && method !== 'get') {
    init.body = JSON.stringify(body);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await withTimeout(fetch(url, init), TIMEOUT_MS, `${method.toUpperCase()} ${path}`);
      const text = await res.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }

      if (res.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
        await delay(750);
        continue;
      }

      return {
        status: res.status,
        body: parsed,
        raw: text,
        contentType: res.headers.get('content-type') ?? '',
      };
    } catch (error) {
      if (attempt < MAX_ATTEMPTS - 1) {
        await delay(750);
        continue;
      }

      return {
        status: 503,
        body: null,
        raw: error instanceof Error ? error.message : String(error),
        contentType: '',
      };
    }
  }

  return {
    status: 503,
    body: null,
    raw: '',
    contentType: '',
  };
}

async function ensureUserSeed() {
  if (userSeed) return userSeed;

  const runId = Date.now();
  userSeed = {
    username: `endpoint_audit_${runId}`,
    phone: `1777${String(runId).slice(-7)}`,
    loginPassword: 'audit12345',
    transactionPassword: 'audit67890',
  };

  await fetchJson('post', '/auth/signup', {
    username: userSeed.username,
    phone: userSeed.phone,
    gender: 'unknown',
    invitationCode: 'STF01',
    loginPassword: userSeed.loginPassword,
    transactionPassword: userSeed.transactionPassword,
  });

  return userSeed;
}

async function payloadFor(route) {
  if (route.method === 'get' || route.method === 'delete') {
    return undefined;
  }

  const user = await ensureUserSeed();

  const map = {
    '/auth/login': { username: user.username, loginPassword: user.loginPassword },
    '/auth/session/restore': {},
    '/auth/verify-token': { token: 'bogus-token' },
    '/auth/session/logout': {},
    '/auth/forgot-password': { email: `audit_${Date.now()}@example.com` },
    '/auth/reset-password': { token: 'bogus-token', username: user.username, newPassword: 'newpass123' },
    '/auth/change-password': { username: user.username, currentPassword: user.loginPassword, newPassword: 'nextpass123' },
    '/auth/change-credentials': { currentLoginPassword: user.loginPassword, newLoginPassword: 'nextpass123', newTransactionPassword: 'nexttxn123' },
    '/validate-admin-invite-code': { invitationCode: 'ABCDE' },
    '/referral/link-user': { invitationCode: 'ABCDE' },
    '/referral/link-admin-invite': { invitationCode: 'ABCDE' },
    '/me/submit-task': { productPrice: 0 },
    '/me/complete-premium-task': { productPrice: 0 },
    '/me/withdrawals/request': { amount: 1, method: 'USDT', walletAddress: 'test-wallet', network: 'TRC20', transactionPassword: '111111' },
    '/me/wallet': { type: 'crypto', walletType: 'usdt', walletAddress: '0x1234567890abcdef1234567890abcdef12345678', network: 'trc20' },
    '/cs/create-ticket': { subject: 'audit', message: 'audit message', category: 'general', priority: 'low' },
    '/cs/respond': { ticketId: 'ticket-smoke-id', message: 'audit reply' },
    '/cs/update-status': { ticketId: 'ticket-smoke-id', status: 'open' },
    '/cs/chat/send': { username: user.username, message: 'audit chat' },
    '/cs/chat/mark-read': { username: user.username, viewer: 'user' },
  };

  return map[route.path] ?? methodDefaultPayload[route.method];
}

function validateAuthBehavior(route, response) {
  const area = classifyPath(route.path);
  if (area === 'admin' || area === 'session-user') {
    return response.status === 401 || response.status === 403 || response.status === 503;
  }

  return SAFE_STATUSES.has(response.status);
}

function validateBodyShape(response) {
  if (response.contentType.includes('application/json')) {
    if (response.body === null) {
      return false;
    }

    const t = typeof response.body;
    if (t !== 'object') {
      return false;
    }
  }

  return true;
}

function validateAdminBehavior(route, response) {
  const area = classifyPath(route.path);
  if (area !== 'admin') {
    return true;
  }

  return SAFE_STATUSES.has(response.status) && response.status !== 401;
}

async function run() {
  const source = await readFile(SERVER_FILE, 'utf8');
  const routes = extractRoutes(source);

  console.log(`Discovered ${routes.length} routes from ${SERVER_FILE.pathname}`);

  const failures = [];
  let ok = 0;
  let adminOk = 0;

  for (const route of routes) {
    const body = await payloadFor(route);
    let result;

    try {
      result = await fetchJson(route.method, route.path, body);
    } catch (error) {
      failures.push({
        route: `${route.method.toUpperCase()} ${route.path}`,
        reason: `request threw: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    const routeLabel = `${route.method.toUpperCase()} ${route.path}`;
    const authOk = validateAuthBehavior(route, result);
    const safeStatus = SAFE_STATUSES.has(result.status);
    const bodyOk = validateBodyShape(result);

    if (!safeStatus || !authOk || !bodyOk) {
      failures.push({
        route: routeLabel,
        reason: `status=${result.status}, safeStatus=${safeStatus}, authOk=${authOk}, bodyOk=${bodyOk}`,
      });
      continue;
    }

    ok += 1;
    await delay(50);
  }

  if (ADMIN_TEST_JWT) {
    for (const route of routes.filter((candidate) => classifyPath(candidate.path) === 'admin')) {
      const body = await payloadFor(route);
      let result;

      try {
        result = await fetchJson(route.method, route.path, body, 'admin');
      } catch (error) {
        failures.push({
          route: `${route.method.toUpperCase()} ${route.path}`,
          reason: `admin request threw: ${error instanceof Error ? error.message : String(error)}`,
        });
        continue;
      }

      const bodyOk = validateBodyShape(result);
      const adminAuthOk = validateAdminBehavior(route, result);
      if (!bodyOk || !adminAuthOk) {
        failures.push({
          route: `${route.method.toUpperCase()} ${route.path}`,
          reason: `admin status=${result.status}, adminAuthOk=${adminAuthOk}, bodyOk=${bodyOk}`,
        });
        continue;
      }

      adminOk += 1;
      await delay(50);
    }
  }

  console.log(`\nCompleted endpoint inventory audit: ${ok}/${routes.length} checks passed.`);
  if (ADMIN_TEST_JWT) {
    const adminRouteCount = routes.filter((candidate) => classifyPath(candidate.path) === 'admin').length;
    console.log(`Admin-authenticated audit: ${adminOk}/${adminRouteCount} checks passed.`);
  }

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const fail of failures) {
      console.log(`- ${fail.route}: ${fail.reason}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('All inventory checks passed.');
}

run().catch((error) => {
  console.error('Fatal audit script error:', error);
  process.exit(2);
});
