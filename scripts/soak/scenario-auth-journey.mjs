#!/usr/bin/env node
/**
 * Soak Scenario: Authenticated User Journey
 *
 * Simulates repeated login → page-load flows → logout cycles to detect:
 *  - Session table growth / DB pressure from auth operations
 *  - JWT rotation issues under sustained load
 *  - Financial endpoint degradation over time
 *  - Cold starts on authenticated routes
 *
 * Each iteration: login → 3-5 random authenticated endpoints → logout
 *
 * Requires: SYNTHETIC_TEST_USERNAME, SYNTHETIC_TEST_PASSWORD
 * (Uses a single shared test account — concurrent sessions test session mgmt)
 */

import { timedFetch } from './shared/load-engine.mjs';
import { resolveRuntimeEnvironment } from '../shared/resolve-runtime-env.mjs';

let _env = null;
async function env() {
  if (!_env) _env = await resolveRuntimeEnvironment();
  return _env;
}

const SYNTH_USERNAME = process.env.SYNTHETIC_TEST_USERNAME ?? '';
const SYNTH_PASSWORD = process.env.SYNTHETIC_TEST_PASSWORD ?? '';

const AUTH_ENDPOINTS = [
  '/me/financials',
  '/me/transactions',
  '/me/withdrawals',
  '/me/wallet',
  '/me/referrals/summary',
  '/me/user',
];

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** @type {import('./shared/load-engine.mjs').Scenario} */
export const authJourneyScenario = {
  name: 'auth-journey',
  thinkTimeMs: [2000, 5000], // 2-5s between full journey cycles

  async execute(vu, metrics) {
    if (!SYNTH_USERNAME || !SYNTH_PASSWORD) {
      // Degrade to a no-op if no credentials (don't crash the VU)
      return;
    }

    const { apiBaseUrl, anonKey } = await env();
    const baseHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Origin: 'https://steadfastworkbench.org',
      'User-Agent': `SoakTest-VU-${vu.id}`,
    };

    // ── Login ──────────────────────────────────────────────────────────────
    const loginRes = await timedFetch('POST', `${apiBaseUrl}/auth/login`, {
      headers: baseHeaders,
      body: { username: SYNTH_USERNAME, loginPassword: SYNTH_PASSWORD },
    });

    metrics.record({
      timestamp: Date.now(),
      endpoint: '/auth/login',
      method: 'POST',
      status: loginRes.status,
      latencyMs: loginRes.latencyMs,
      error: loginRes.error,
      scenario: 'auth-journey',
    });

    if (loginRes.status !== 200) return; // Can't continue without auth

    // Extract session token from response (we consumed body in timedFetch,
    // but we need it here — do a second fetch for session token)
    // Actually, timedFetch consumes body. We need the token. Let's do a raw fetch:
    let sessionToken = '';
    let sessionCookie = '';
    try {
      const rawRes = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
        body: JSON.stringify({ username: SYNTH_USERNAME, loginPassword: SYNTH_PASSWORD }),
        signal: AbortSignal.timeout(15_000),
      });
      const json = await rawRes.json();
      if (json?.sessionToken) sessionToken = json.sessionToken;
      const setCookie = rawRes.headers?.get?.('set-cookie') ?? '';
      if (setCookie.includes('steadfast_user_session=')) {
        sessionCookie = setCookie.split(';')[0].trim();
      }

      // Record this second login too
      metrics.record({
        timestamp: Date.now(),
        endpoint: '/auth/login',
        method: 'POST',
        status: rawRes.status,
        latencyMs: 0, // already captured in timed version
        scenario: 'auth-journey',
      });
    } catch {
      return; // Failed to get token
    }

    const sessionHeaders = { ...baseHeaders };
    if (sessionCookie) sessionHeaders.Cookie = sessionCookie;
    if (sessionToken) sessionHeaders['x-user-session-token'] = sessionToken;

    // ── Authenticated API calls (3-5 random endpoints) ─────────────────────
    const endpoints = pickN(AUTH_ENDPOINTS, 3 + Math.floor(Math.random() * 3));

    for (const ep of endpoints) {
      // Think time between page loads
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));

      const res = await timedFetch('GET', `${apiBaseUrl}${ep}`, {
        headers: sessionHeaders,
        timeoutMs: 15_000,
      });

      metrics.record({
        timestamp: Date.now(),
        endpoint: ep,
        method: 'GET',
        status: res.status,
        latencyMs: res.latencyMs,
        error: res.error,
        scenario: 'auth-journey',
      });
    }

    // ── Logout ─────────────────────────────────────────────────────────────
    const logoutRes = await timedFetch('POST', `${apiBaseUrl}/auth/logout`, {
      headers: sessionHeaders,
    });

    metrics.record({
      timestamp: Date.now(),
      endpoint: '/auth/logout',
      method: 'POST',
      status: logoutRes.status,
      latencyMs: logoutRes.latencyMs,
      error: logoutRes.error,
      scenario: 'auth-journey',
    });
  },
};
