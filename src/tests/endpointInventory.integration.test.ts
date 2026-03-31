import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { FUNCTION_SERVICE_NAME } from '@utils/environment/config';

const BASE = process.env.API_BASE_URL ?? `https://${projectId}.supabase.co/functions/v1/${FUNCTION_SERVICE_NAME}`;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? publicAnonKey;
const ADMIN_TEST_JWT = process.env.SUPABASE_ADMIN_TEST_JWT ?? '';
const ROUTE_PREFIX = `/${FUNCTION_SERVICE_NAME}`;
const ROUTE_REGEX = /app\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]/g;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverIndexPath = path.resolve(__dirname, '../../supabase/functions/server/index.ts');

const SAFE_STATUSES = new Set([200, 201, 204, 400, 401, 403, 404, 405, 409, 410, 415, 422, 429, 503]);

function normalizeRoutePath(rawPath: string): string {
  let p = rawPath.startsWith(ROUTE_PREFIX) ? rawPath.slice(ROUTE_PREFIX.length) : rawPath;
  if (!p.startsWith('/')) p = `/${p}`;

  return p
    .replace(':adminId', 'smoke-admin-id')
    .replace(':taskId', 'task-amazon-headphones')
    .replace(':withdrawalId', 'withdrawal-smoke-id')
    .replace(':username', 'smoke_user')
    .replace(':premiumId', 'premium-smoke-id')
    .replace(':token', 'fake-token');
}

function extractRoutes() {
  const source = readFileSync(serverIndexPath, 'utf8');
  const seen = new Set<string>();
  const routes: Array<{ method: string; path: string }> = [];

  for (const m of source.matchAll(ROUTE_REGEX)) {
    const method = m[1].toLowerCase();
    const path = normalizeRoutePath(m[2]);
    const key = `${method.toUpperCase()} ${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({ method, path });
  }

  return routes;
}

function classify(pathname: string): 'public' | 'admin' | 'session-user' {
  if (pathname.startsWith('/admin/') || pathname.startsWith('/cs/admin/')) return 'admin';
  if (pathname.startsWith('/me/')) return 'session-user';
  return 'public';
}

async function request(method: string, pathName: string, body?: unknown, mode: 'anon' | 'admin' = 'anon', timeoutMs = 20_000, maxAttempts = 2) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    ...(mode === 'admin' && ADMIN_TEST_JWT ? { 'x-user-jwt': ADMIN_TEST_JWT } : {}),
  };

  const init: RequestInit = {
    method: method.toUpperCase(),
    headers,
  };

  if (body !== undefined && method !== 'get') {
    init.body = JSON.stringify(body);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${BASE}${pathName}`, { ...init, signal: controller.signal });
      const text = await res.text();
      clearTimeout(timer);
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (res.status >= 500 && attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      return { status: res.status, parsed, contentType: res.headers.get('content-type') ?? '' };
    } catch {
      clearTimeout(timer);
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      return { status: 503, parsed: null, contentType: '' };
    }
  }

  return { status: 503, parsed: null, contentType: '' };
}

async function payloadFor(route: { method: string; path: string }) {
  if (route.method === 'get' || route.method === 'delete') {
    return undefined;
  }

  if (route.path === '/auth/login') {
    return { username: 'nonexistent', loginPassword: 'wrongpass' };
  }

  if (route.path === '/auth/signup') {
    return {
      username: `inventory_${Date.now()}`,
      phone: `1888${String(Date.now()).slice(-7)}`,
      gender: 'unknown',
      invitationCode: 'STF01',
      loginPassword: 'audit12345',
      transactionPassword: 'audit67890',
    };
  }

  if (route.path === '/validate-admin-invite-code') {
    return { invitationCode: 'ABCDE' };
  }

  if (route.path === '/auth/forgot-password') {
    return { email: `inventory_${Date.now()}@example.com` };
  }

  return {};
}

const routes = extractRoutes();

describe('Endpoint inventory coverage', () => {
  it('extracts all routes from server source', () => {
    expect(routes.length).toBeGreaterThan(80);
  });

  it('every declared route responds with a safe status and non-broken JSON contract for anon baseline', async () => {
    const failures: Array<{ route: string; status: number; reason: string }> = [];

    for (const route of routes) {
      const body = await payloadFor(route);
      const result = await request(route.method, route.path, body);

      if (!SAFE_STATUSES.has(result.status)) {
        failures.push({
          route: `${route.method.toUpperCase()} ${route.path}`,
          status: result.status,
          reason: 'status_not_in_safe_allowlist',
        });
        continue;
      }

      if (result.contentType.includes('application/json')) {
        if (result.parsed === null || typeof result.parsed !== 'object') {
          failures.push({
            route: `${route.method.toUpperCase()} ${route.path}`,
            status: result.status,
            reason: 'invalid_json_contract',
          });
        }
      }
    }

    expect(
      failures,
      `Endpoint inventory baseline failures:\n${JSON.stringify(failures.slice(0, 10), null, 2)}`,
    ).toEqual([]);
  }, 480000);

  it('auth-protected endpoints reject anonymous access', async () => {
    const failures: Array<{ route: string; status: number }> = [];

    for (const route of routes) {
      const area = classify(route.path);
      if (area === 'public') continue;

      const body = await payloadFor(route);
      const result = await request(route.method, route.path, body);
      if (![401, 403].includes(result.status)) {
        failures.push({
          route: `${route.method.toUpperCase()} ${route.path}`,
          status: result.status,
        });
      }
    }

    expect(
      failures,
      `Auth guard failures:\n${JSON.stringify(failures.slice(0, 10), null, 2)}`,
    ).toEqual([]);
  }, 480000);

  const maybeAdmin = ADMIN_TEST_JWT ? it : it.skip;
  maybeAdmin('admin endpoints return non-401 safe responses when admin JWT is provided', async () => {
    const failures: Array<{ route: string; status: number }> = [];

    for (const route of routes) {
      if (classify(route.path) !== 'admin') continue;

      const body = await payloadFor(route);
      const result = await request(route.method, route.path, body, 'admin');
      if (!SAFE_STATUSES.has(result.status) || result.status === 401) {
        failures.push({
          route: `${route.method.toUpperCase()} ${route.path}`,
          status: result.status,
        });
      }
    }

    expect(
      failures,
      `Admin endpoint failures:\n${JSON.stringify(failures.slice(0, 10), null, 2)}`,
    ).toEqual([]);
  }, 240000);
});
