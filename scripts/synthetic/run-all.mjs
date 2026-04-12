#!/usr/bin/env node
/**
 * Synthetic Monitor: Orchestrator
 *
 * Runs all synthetic probes in sequence, collects results, and produces a
 * consolidated report. Supports tiered execution:
 *
 *   --tier p0    → health probe + frontend probe (critical path only)
 *   --tier p1    → p0 + auth flow + user journey
 *   --tier all   → everything (default)
 *
 * Environment:
 *   SYNTHETIC_TEST_USERNAME  — persistent test user for auth/journey tests
 *   SYNTHETIC_TEST_PASSWORD  — password for the test user
 *   SYNTHETIC_ALERT_WEBHOOK  — Slack/Discord webhook for failure alerts
 *   SYNTHETIC_REGION         — label for multi-region runs (e.g. "us-east-1")
 *
 * Usage:
 *   node scripts/synthetic/run-all.mjs
 *   node scripts/synthetic/run-all.mjs --tier p0
 *   node scripts/synthetic/run-all.mjs --tier p1
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, '..', '..', 'deployment_reports', 'synthetic');

// Parse args
const tier = process.argv.includes('--tier')
  ? process.argv[process.argv.indexOf('--tier') + 1] ?? 'all'
  : 'all';

const SUITES = {
  p0: [
    { name: 'api-health-probe', script: 'api-health-probe.mjs', critical: true },
    { name: 'frontend-probe', script: 'frontend-probe.mjs', critical: true },
  ],
  p1: [
    { name: 'auth-flow', script: 'auth-flow.mjs', critical: true },
    { name: 'user-journey-financial', script: 'user-journey-financial.mjs', critical: false },
  ],
};

function getSuites() {
  if (tier === 'p0') return SUITES.p0;
  if (tier === 'p1') return [...SUITES.p0, ...SUITES.p1];
  return [...SUITES.p0, ...SUITES.p1]; // 'all'
}

async function main() {
  const startTime = Date.now();
  const region = process.env.SYNTHETIC_REGION ?? 'local';
  const suites = getSuites();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  SYNTHETIC MONITORING — tier: ${tier} | region: ${region}`);
  console.log(`  ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(60)}\n`);

  const results = [];

  for (const suite of suites) {
    const suitePath = join(__dirname, suite.script);
    console.log(`\n▶ Running: ${suite.name}`);
    console.log('─'.repeat(60));

    const suiteStart = Date.now();
    let exitCode = 0;
    let output = '';

    try {
      output = execFileSync('node', [suitePath], {
        env: { ...process.env },
        encoding: 'utf-8',
        timeout: 120_000, // 2 min per suite max
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      console.log(output);
    } catch (err) {
      exitCode = err.status ?? 1;
      output = (err.stdout ?? '') + '\n' + (err.stderr ?? '');
      console.log(output);
    }

    results.push({
      name: suite.name,
      critical: suite.critical,
      exitCode,
      durationMs: Date.now() - suiteStart,
      output: output.slice(0, 2000), // truncate for report
    });

    if (exitCode !== 0 && suite.critical) {
      console.log(`\n⚠️  Critical suite "${suite.name}" failed (exit ${exitCode})`);
    }
  }

  // ── Consolidated Report ──────────────────────────────────────────────────
  const totalDuration = Date.now() - startTime;
  const passed = results.filter((r) => r.exitCode === 0);
  const failed = results.filter((r) => r.exitCode !== 0);
  const criticalFailed = failed.filter((r) => r.critical);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  SUMMARY — ${passed.length}/${results.length} suites passed (${totalDuration}ms)`);
  if (failed.length > 0) {
    console.log(`  ❌ Failed: ${failed.map((r) => r.name).join(', ')}`);
  }
  if (criticalFailed.length > 0) {
    console.log(`  🚨 CRITICAL FAILURES: ${criticalFailed.map((r) => r.name).join(', ')}`);
  }
  console.log(`${'═'.repeat(60)}\n`);

  // Write consolidated JSON report
  try { mkdirSync(REPORT_DIR, { recursive: true }); } catch { /* exists */ }
  const report = {
    timestamp: new Date().toISOString(),
    tier,
    region,
    totalDurationMs: totalDuration,
    passedCount: passed.length,
    failedCount: failed.length,
    criticalFailedCount: criticalFailed.length,
    suites: results.map(({ output, ...rest }) => rest), // exclude verbose output from report
    overallStatus: criticalFailed.length > 0 ? 'CRITICAL' : failed.length > 0 ? 'DEGRADED' : 'HEALTHY',
  };
  const reportPath = join(REPORT_DIR, `run-all-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report: ${reportPath}`);

  // Alert on critical failures
  const webhook = process.env.SYNTHETIC_ALERT_WEBHOOK;
  if (criticalFailed.length > 0 && webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Synthetic Monitor CRITICAL — tier: ${tier}, region: ${region}\nFailed suites: ${criticalFailed.map((r) => r.name).join(', ')}\nTime: ${report.timestamp}`,
        }),
      });
    } catch { /* best-effort */ }
  }

  process.exit(criticalFailed.length > 0 ? 2 : failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[FATAL] Orchestrator error: ${err.message}`);
  process.exit(2);
});
