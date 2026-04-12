#!/usr/bin/env node
/**
 * Synthetic Monitor: User Journey — Core Financial & Task Flow
 *
 * Simulates a logged-in user navigating through the core platform:
 *  1. Starting page snapshot (V2 consolidated endpoint)
 *  2. Records page snapshot
 *  3. Activity page snapshot (V2)
 *  4. Deposit page: financials + transactions
 *  5. VIP levels: financials + vip-config
 *  6. Wallet endpoint
 *  7. Withdrawal history
 *
 * Uses an existing persistent synthetic test user (avoids signup churn).
 * Requires env: SYNTHETIC_TEST_USERNAME, SYNTHETIC_TEST_PASSWORD
 *
 * Frequency: Every 10 minutes
 * Priority: P1 — core user experience
 */

import { SyntheticRunner, httpRequest, getEnv, sendWebhookAlert } from './shared/test-harness.mjs';

const ALERT_WEBHOOK = process.env.SYNTHETIC_ALERT_WEBHOOK ?? '';
const MAX_SNAPSHOT_LATENCY_MS = 10_000;
const MAX_SIMPLE_LATENCY_MS = 5000;

// Persistent synthetic user — created once, reused across runs
const SYNTH_USERNAME = process.env.SYNTHETIC_TEST_USERNAME ?? '';
const SYNTH_PASSWORD = process.env.SYNTHETIC_TEST_PASSWORD ?? '';

async function main() {
  if (!SYNTH_USERNAME || !SYNTH_PASSWORD) {
    console.error('[SKIP] SYNTHETIC_TEST_USERNAME and SYNTHETIC_TEST_PASSWORD required.');
    console.error('Create a persistent test user and set these env vars.');
    process.exit(0);
  }

  const env = await getEnv();
  const BASE = env.apiBaseUrl;
  const ANON_KEY = env.anonKey;
  const ORIGIN = 'https://steadfastworkbench.org';
  const baseHeaders = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    Origin: ORIGIN,
  };

  // ── Authenticate ────────────────────────────────────────────────────────────
  let sessionCookie = null;
  let sessionToken = null;

  const loginRes = await httpRequest('POST', `${BASE}/auth/login`, {
    headers: baseHeaders,
    body: { username: SYNTH_USERNAME, loginPassword: SYNTH_PASSWORD },
  });

  if (loginRes.status !== 200) {
    console.error(`[FATAL] Login failed: ${loginRes.status} — ${loginRes.text}`);
    process.exit(2);
  }

  const setCookie = loginRes.headers?.get?.('set-cookie') ?? '';
  if (setCookie.includes('steadfast_user_session=')) {
    sessionCookie = setCookie.split(';')[0].trim();
  }
  if (loginRes.json?.sessionToken) {
    sessionToken = loginRes.json.sessionToken;
  }

  function sessionHeaders() {
    const h = { ...baseHeaders };
    if (sessionCookie) h.Cookie = sessionCookie;
    if (sessionToken) h['x-user-session-token'] = sessionToken;
    return h;
  }

  const runner = new SyntheticRunner('user-journey-financial');

  // ── 1. Starting snapshot (V2) ───────────────────────────────────────────────
  await runner.run('GET /v2/me/starting-snapshot', async (ac) => {
    const res = await httpRequest('GET',
      `${BASE}/v2/me/starting-snapshot?includeCatalog=true&includeConfig=true&catalogLimit=50`,
      { headers: sessionHeaders() },
    );
    ac.assertStatus('starting-snapshot returns 200', res, 200);
    ac.assertLatency('starting-snapshot under 10s', res, MAX_SNAPSHOT_LATENCY_MS);
    ac.assertTruthy('has financialSummary', res.json?.financialSummary);
    ac.assertTruthy('has taskProgress', res.json?.taskProgress);
  });

  // ── 2. Records snapshot ─────────────────────────────────────────────────────
  await runner.run('GET /me/records-snapshot', async (ac) => {
    const res = await httpRequest('GET',
      `${BASE}/me/records-snapshot?tasksLimit=120&transactionsLimit=120&includeCatalog=true&includeVip=true`,
      { headers: sessionHeaders() },
    );
    ac.assertStatus('records-snapshot returns 200', res, 200);
    ac.assertLatency('records-snapshot under 10s', res, MAX_SNAPSHOT_LATENCY_MS);
    ac.assertTruthy('has tasks array', Array.isArray(res.json?.tasks));
  });

  // ── 3. Activity snapshot (V2) ───────────────────────────────────────────────
  await runner.run('GET /v2/me/activity-snapshot', async (ac) => {
    const res = await httpRequest('GET',
      `${BASE}/v2/me/activity-snapshot?includeConfig=true&transactionsLimit=80&withdrawalsLimit=40`,
      { headers: sessionHeaders() },
    );
    ac.assertStatus('activity-snapshot returns 200', res, 200);
    ac.assertLatency('activity-snapshot under 10s', res, MAX_SNAPSHOT_LATENCY_MS);
    ac.assertTruthy('has financialSnapshot', res.json?.financialSnapshot);
    ac.assertTruthy('has rewardsConfig', res.json?.rewardsConfig);
  });

  // ── 4. Deposit page endpoints ───────────────────────────────────────────────
  await runner.run('GET /me/financials (Deposit)', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/me/financials`, {
      headers: sessionHeaders(),
    });
    ac.assertStatus('/me/financials returns 200', res, 200);
    ac.assertLatency('/me/financials under 5s', res, MAX_SIMPLE_LATENCY_MS);
    ac.assertTruthy('has balance field', res.json?.balance !== undefined);
    ac.assertTruthy('has holdAmount field', res.json?.holdAmount !== undefined);
    ac.assertTruthy('has vipLevel field', res.json?.vipLevel !== undefined);
  });

  await runner.run('GET /me/transactions (Deposit)', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/me/transactions`, {
      headers: sessionHeaders(),
    });
    ac.assertStatus('/me/transactions returns 200', res, 200);
    ac.assertLatency('/me/transactions under 5s', res, MAX_SIMPLE_LATENCY_MS);
    ac.assertTruthy('returns array', Array.isArray(res.json));
  });

  // ── 5. VIP Levels page endpoints ────────────────────────────────────────────
  await runner.run('GET /vip-config (VIP page)', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/vip-config`, {
      headers: baseHeaders,  // public endpoint, no session needed
    });
    ac.assertStatus('/vip-config returns 200', res, 200);
    ac.assertLatency('/vip-config under 5s', res, MAX_SIMPLE_LATENCY_MS);
    ac.assertTruthy('has tiers', Array.isArray(res.json?.tiers) && res.json.tiers.length >= 3);
  });

  // ── 6. Wallet endpoint ─────────────────────────────────────────────────────
  await runner.run('GET /me/wallet', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/me/wallet`, {
      headers: sessionHeaders(),
    });
    ac.assertStatusIn('/me/wallet returns 200 or valid response', res, [200, 404]);
    ac.assertLatency('/me/wallet under 5s', res, MAX_SIMPLE_LATENCY_MS);
  });

  // ── 7. Withdrawal history ──────────────────────────────────────────────────
  await runner.run('GET /me/withdrawals', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/me/withdrawals`, {
      headers: sessionHeaders(),
    });
    ac.assertStatus('/me/withdrawals returns 200', res, 200);
    ac.assertLatency('/me/withdrawals under 5s', res, MAX_SIMPLE_LATENCY_MS);
    ac.assertTruthy('returns array', Array.isArray(res.json));
  });

  // ── 8. Referral summary ────────────────────────────────────────────────────
  await runner.run('GET /me/referrals/summary', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/me/referrals/summary`, {
      headers: sessionHeaders(),
    });
    ac.assertStatus('/me/referrals/summary returns 200', res, 200);
    ac.assertLatency('/me/referrals/summary under 5s', res, MAX_SIMPLE_LATENCY_MS);
  });

  // ── Report ──────────────────────────────────────────────────────────────────
  const exitCode = runner.summarize();

  if (exitCode !== 0) {
    const failures = runner.results
      .filter((r) => r.status === 'fail')
      .map((r) => `${r.name}: ${r.assertions.filter((a) => !a.passed).map((a) => a.detail).join('; ')}`);
    await sendWebhookAlert(ALERT_WEBHOOK, {
      suite: 'user-journey-financial',
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
