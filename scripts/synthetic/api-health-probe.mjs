#!/usr/bin/env node
/**
 * Synthetic Monitor: API Health & Version Probe
 *
 * Tests:
 *  1. /health — basic liveness
 *  2. /health/live — k8s liveness probe
 *  3. /health/ready — readiness with KV health
 *  4. /version — deployment freshness & staleness check
 *  5. /vip-config — public config availability
 *  6. /rewards-config — public config availability
 *  7. /cs/support-links — public support links
 *
 * Frequency: Every 5 minutes
 * Priority: P0 — total platform outage detection
 */

import { SyntheticRunner, httpRequest, getEnv, sendWebhookAlert } from './shared/test-harness.mjs';

const ALERT_WEBHOOK = process.env.SYNTHETIC_ALERT_WEBHOOK ?? '';
const MAX_HEALTH_LATENCY_MS = 3000;
const MAX_CONFIG_LATENCY_MS = 5000;

async function main() {
  const env = await getEnv();
  const BASE = env.apiBaseUrl;
  const ANON_KEY = env.anonKey;
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    Origin: 'https://steadfastworkbench.org',
  };

  const runner = new SyntheticRunner('api-health-probe');

  // ── 1. Basic health ─────────────────────────────────────────────────────────
  await runner.run('GET /health', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/health`, { headers });
    ac.assertStatus('/health returns 200', res, 200);
    ac.assertLatency('/health under 3s', res, MAX_HEALTH_LATENCY_MS);
    ac.assertJsonField('/health has status=ok', res.json, 'status', (v) => v === 'ok');
  });

  // ── 2. Liveness probe ───────────────────────────────────────────────────────
  await runner.run('GET /health/live', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/health/live`, { headers });
    ac.assertStatus('/health/live returns 200', res, 200);
    ac.assertLatency('/health/live under 3s', res, MAX_HEALTH_LATENCY_MS);
  });

  // ── 3. Readiness probe ─────────────────────────────────────────────────────
  await runner.run('GET /health/ready', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/health/ready`, { headers });
    ac.assertStatus('/health/ready returns 200', res, 200);
    ac.assertLatency('/health/ready under 3s', res, MAX_HEALTH_LATENCY_MS);
    ac.assertJsonField('/health/ready status=ready', res.json, 'status', (v) => v === 'ready');
  });

  // ── 4. Version & staleness ──────────────────────────────────────────────────
  await runner.run('GET /version — freshness check', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/version`, { headers });
    ac.assertStatus('/version returns 200', res, 200);
    ac.assertLatency('/version under 3s', res, MAX_HEALTH_LATENCY_MS);

    const version = res.json?.version;
    ac.assertTruthy('/version has service name', version?.service);
    ac.assertTruthy('/version has commitSha', version?.commitSha);
    ac.assertTruthy('/version has deployedAtUtc', version?.deployedAtUtc);
    ac.assert('/version is not stale', version?.stale === false,
      `stale=${version?.stale}, age=${version?.deploymentAgeMinutes}m`);
  });

  // ── 5. VIP config (public) ──────────────────────────────────────────────────
  await runner.run('GET /vip-config', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/vip-config`, { headers });
    ac.assertStatus('/vip-config returns 200', res, 200);
    ac.assertLatency('/vip-config under 5s', res, MAX_CONFIG_LATENCY_MS);
    ac.assertTruthy('/vip-config has tiers array', Array.isArray(res.json?.tiers));
    ac.assert('/vip-config has ≥3 tiers', (res.json?.tiers?.length ?? 0) >= 3,
      `got ${res.json?.tiers?.length} tiers`);
  });

  // ── 6. Rewards config (public) ──────────────────────────────────────────────
  await runner.run('GET /rewards-config', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/rewards-config`, { headers });
    ac.assertStatus('/rewards-config returns 200', res, 200);
    ac.assertLatency('/rewards-config under 5s', res, MAX_CONFIG_LATENCY_MS);
    ac.assertTruthy('/rewards-config has config', res.json?.config);
  });

  // ── 7. Support links (public — returns 503 outside platform hours 9AM-10PM EST) ─
  await runner.run('GET /cs/support-links', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/cs/support-links`, { headers });
    ac.assertStatusIn('/cs/support-links returns 200 or 503 (off-hours)', res, [200, 503]);
    ac.assertLatency('/cs/support-links under 5s', res, MAX_CONFIG_LATENCY_MS);
  });

  // ── 8. Auth enforcement — admin route without creds ─────────────────────────
  await runner.run('GET /admin/users — requires auth', async (ac) => {
    const res = await httpRequest('GET', `${BASE}/admin/users`, { headers });
    ac.assertStatus('/admin/users returns 401 without admin JWT', res, 401);
    ac.assertLatency('/admin/users auth gate under 3s', res, MAX_HEALTH_LATENCY_MS);
  });

  // ── Report ──────────────────────────────────────────────────────────────────
  const exitCode = runner.summarize();

  // Alert on failure
  if (exitCode !== 0) {
    const failures = runner.results
      .filter((r) => r.status === 'fail')
      .map((r) => `${r.name}: ${r.assertions.filter((a) => !a.passed).map((a) => a.detail).join('; ')}`);
    await sendWebhookAlert(ALERT_WEBHOOK, {
      suite: 'api-health-probe',
      region: runner.region,
      failures,
      timestamp: new Date().toISOString(),
    });
  }

  // Write JSON report
  const report = runner.toJSON();
  const reportPath = new URL(`../../deployment_reports/synthetic/health-probe-${Date.now()}.json`, import.meta.url);
  try {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = dirname(fileURLToPath(reportPath));
    await mkdir(dir, { recursive: true });
    await writeFile(fileURLToPath(reportPath), JSON.stringify(report, null, 2));
  } catch { /* report writing is best-effort */ }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(2);
});
