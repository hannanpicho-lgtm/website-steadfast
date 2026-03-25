import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.API_BASE_URL ?? 'https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e';
const ANON_KEY = process.env.SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A';
const ROUTE_PREFIX = '/make-server-a1c55d7e';
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

async function request(method: string, pathName: string, body?: unknown) {
  const init: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  };

  if (body !== undefined && method !== 'get') {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${pathName}`, init);
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return {
    status: res.status,
    parsed,
    contentType: res.headers.get('content-type') ?? '',
  };
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
  }, 240000);

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
  }, 240000);
});
