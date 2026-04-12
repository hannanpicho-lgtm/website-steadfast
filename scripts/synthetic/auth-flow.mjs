#!/usr/bin/env node
/**
 * Synthetic Monitor: Authentication Flow
 *
 * Tests the full auth lifecycle as a real user would experience it:
 *  1. Signup with unique test user
 *  2. Login with created credentials
 *  3. Session restore / token validation
 *  4. Authenticated endpoint access (/me/user, /me/financials)
 *  5. Session logout
 *  6. Post-logout access denial
 *
 * Frequency: Every 10 minutes
 * Priority: P0 — auth failure = total platform lockout
 *
 * Uses ephemeral test users (auto-cleaned by backend TTL or admin).
 */

import { SyntheticRunner, httpRequest, getEnv, sendWebhookAlert } from './shared/test-harness.mjs';

const ALERT_WEBHOOK = process.env.SYNTHETIC_ALERT_WEBHOOK ?? '';
const MAX_AUTH_LATENCY_MS = 8000;  // auth touches DB + JWT generation
const MAX_SESSION_LATENCY_MS = 5000;
const RUN_ID = Date.now();

async function main() {
  const env = await getEnv();
  const BASE = env.apiBaseUrl;
  const ANON_KEY = env.anonKey;
  const ORIGIN = 'https://steadfastworkbench.org';
  const baseHeaders = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    Origin: ORIGIN,
  };

  const testUsername = `synth_monitor_${RUN_ID}`;
  const testPhone = `1555${String(RUN_ID).slice(-7)}`;
  const loginPassword = 'SynthTest12345!';
  const transactionPassword = 'SynthTxn67890!';

  let sessionCookie = null;
  let sessionToken = null;

  const runner = new SyntheticRunner('auth-flow');

  // ── 1. Signup ───────────────────────────────────────────────────────────────
  await runner.run('POST /auth/signup — create test user', async (ac) => {
    const res = await httpRequest('POST', `${BASE}/auth/signup`, {
      headers: baseHeaders,
      body: {
        username: testUsername,
        phone: testPhone,
        gender: 'male',
        loginPassword,
        transactionPassword,
      },
    });
    ac.assertStatusIn('/auth/signup returns 200 or 201', res, [200, 201]);
    ac.assertLatency('/auth/signup under 8s', res, MAX_AUTH_LATENCY_MS);
    ac.assertTruthy('signup returns user data', res.json?.user || res.json?.username);

    // Extract session cookie if returned
    const setCookie = res.headers?.get?.('set-cookie') ?? '';
    if (setCookie.includes('steadfast_user_session=')) {
      sessionCookie = setCookie.split(';')[0].trim();
    }
    if (res.json?.sessionToken) {
      sessionToken = res.json.sessionToken;
    }
  });

  // ── 2. Login ────────────────────────────────────────────────────────────────
  await runner.run('POST /auth/login — authenticate', async (ac) => {
    const res = await httpRequest('POST', `${BASE}/auth/login`, {
      headers: baseHeaders,
      body: { username: testUsername, loginPassword },
    });
    ac.assertStatus('/auth/login returns 200', res, 200);
    ac.assertLatency('/auth/login under 8s', res, MAX_AUTH_LATENCY_MS);

    const setCookie = res.headers?.get?.('set-cookie') ?? '';
    if (setCookie.includes('steadfast_user_session=')) {
      sessionCookie = setCookie.split(';')[0].trim();
    }
    if (res.json?.sessionToken) {
      sessionToken = res.json.sessionToken;
    }
    ac.assertTruthy('login returns session', sessionCookie || sessionToken);
  });

  // Build session headers for authenticated calls
  function sessionHeaders() {
    const h = { ...baseHeaders };
    if (sessionCookie) h.Cookie = sessionCookie;
    if (sessionToken) h['x-user-session-token'] = sessionToken;
    return h;
  }

  // ── 3. Session validation — /me/user ────────────────────────────────────────
  await runner.run('GET /me/user — session-authenticated', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/me/user`, {
      headers: sessionHeaders(),
    });
    ac.assertStatus('/me/user returns 200', res, 200);
    ac.assertLatency('/me/user under 5s', res, MAX_SESSION_LATENCY_MS);
    ac.assertTruthy('/me/user returns username',
      res.json?.username?.toLowerCase() === testUsername.toLowerCase());
  });

  // ── 4. Financial endpoint — /me/financials ──────────────────────────────────
  await runner.run('GET /me/financials — financial data access', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/me/financials`, {
      headers: sessionHeaders(),
    });
    ac.assertStatus('/me/financials returns 200', res, 200);
    ac.assertLatency('/me/financials under 5s', res, MAX_SESSION_LATENCY_MS);
    ac.assertTruthy('/me/financials has balance',
      typeof res.json?.balance === 'number' || res.json?.balance !== undefined);
  });

  // ── 5. Transaction listing — /me/transactions ──────────────────────────────
  await runner.run('GET /me/transactions — transaction history', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/me/transactions`, {
      headers: sessionHeaders(),
    });
    ac.assertStatus('/me/transactions returns 200', res, 200);
    ac.assertLatency('/me/transactions under 5s', res, MAX_SESSION_LATENCY_MS);
    ac.assertTruthy('/me/transactions returns array', Array.isArray(res.json));
  });

  // ── 6. Logout ───────────────────────────────────────────────────────────────
  await runner.run('POST /auth/session/logout — end session', async (ac) => {
    const res = await httpRequest('POST', `${BASE}/auth/session/logout`, {
      headers: sessionHeaders(),
    });
    ac.assertStatusIn('/auth/session/logout returns 200 or 204', res, [200, 204]);
    ac.assertLatency('/auth/session/logout under 5s', res, MAX_SESSION_LATENCY_MS);
  });

  // ── 7. Post-logout access denial ────────────────────────────────────────────
  await runner.run('GET /me/user — rejected after logout', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/me/user`, {
      headers: sessionHeaders(),
    });
    ac.assertStatus('/me/user returns 401 after logout', res, 401);
  });

  // ── Report & alerts ─────────────────────────────────────────────────────────
  const exitCode = runner.summarize();

  if (exitCode !== 0) {
    const failures = runner.results
      .filter((r) => r.status === 'fail')
      .map((r) => `${r.name}: ${r.assertions.filter((a) => !a.passed).map((a) => a.detail).join('; ')}`);
    await sendWebhookAlert(ALERT_WEBHOOK, {
      suite: 'auth-flow',
      region: runner.region,
      failures,
      timestamp: new Date().toISOString(),
    });
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(2);
});
