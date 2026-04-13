#!/usr/bin/env node
/**
 * Soak / Endurance Test — Main Orchestrator
 *
 * Launches all soak scenarios with the load engine, runs synthetic checks
 * periodically, and produces comprehensive reports.
 *
 * Usage:
 *   node scripts/soak/run-soak.mjs                           # Default: 30min, 20 VUs
 *   node scripts/soak/run-soak.mjs --duration 1440 --vus 50  # 24h, 50 VUs
 *   node scripts/soak/run-soak.mjs --duration 60 --vus 10    # 1h quick soak
 *   node scripts/soak/run-soak.mjs --scenarios api,frontend   # Specific scenarios only
 *
 * Environment:
 *   SYNTHETIC_TEST_USERNAME  — for auth-journey scenario
 *   SYNTHETIC_TEST_PASSWORD  — for auth-journey scenario
 *   SYNTHETIC_ALERT_WEBHOOK  — Slack/Discord alerts on degradation
 *   SOAK_DURATION_MINUTES    — override duration (alternative to --duration)
 *   SOAK_VUS                 — override VU count (alternative to --vus)
 */

import { LoadEngine } from './shared/load-engine.mjs';
import { MetricsStore } from './shared/metrics-store.mjs';
import { frontendScenario } from './scenario-frontend.mjs';
import { apiScenario } from './scenario-api.mjs';
import { authJourneyScenario } from './scenario-auth-journey.mjs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Parse CLI args ─────────────────────────────────────────────────────────

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env[`SOAK_${name.toUpperCase()}`] ?? fallback;
}

const DURATION_MINUTES = parseInt(getArg('duration', '30'), 10);
const TARGET_VUS = parseInt(getArg('vus', '20'), 10);
const RAMP_UP_MINUTES = parseInt(getArg('ramp', '3'), 10);
const DASHBOARD_INTERVAL_MS = parseInt(getArg('dashboard-interval', '30000'), 10);
const SYNTHETIC_INTERVAL_MS = parseInt(getArg('synthetic-interval', '600000'), 10);
const SCENARIO_FILTER = getArg('scenarios', 'all');

// ── Scenario registry ──────────────────────────────────────────────────────

const ALL_SCENARIOS = {
  frontend: frontendScenario,
  api: apiScenario,
  'auth-journey': authJourneyScenario,
};

function getScenarios() {
  if (SCENARIO_FILTER === 'all') return Object.values(ALL_SCENARIOS);
  const names = SCENARIO_FILTER.split(',').map((s) => s.trim());
  return names.map((n) => {
    if (!ALL_SCENARIOS[n]) {
      console.error(`Unknown scenario: "${n}". Available: ${Object.keys(ALL_SCENARIOS).join(', ')}`);
      process.exit(1);
    }
    return ALL_SCENARIOS[n];
  });
}

// ── Synthetic check callback ───────────────────────────────────────────────

let syntheticRunCount = 0;
let syntheticPassCount = 0;
let syntheticFailCount = 0;

async function runSyntheticCheck() {
  syntheticRunCount++;
  const syntheticScript = join(__dirname, '..', 'synthetic', 'run-all.mjs');
  console.log(`\n  [SYNTHETIC CHECK #${syntheticRunCount}] Running P0 probes...`);

  try {
    const output = execFileSync('node', [syntheticScript, '--tier', 'p0'], {
      encoding: 'utf-8',
      timeout: 120_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    syntheticPassCount++;
    console.log(`  [SYNTHETIC CHECK #${syntheticRunCount}] ✅ P0 probes PASSED`);
  } catch (err) {
    syntheticFailCount++;
    const stderr = err.stderr ?? '';
    const stdout = err.stdout ?? '';
    console.log(`  [SYNTHETIC CHECK #${syntheticRunCount}] ❌ P0 probes FAILED (exit ${err.status})`);
    // Show last few lines
    const lines = (stdout + stderr).trim().split('\n').slice(-5);
    for (const line of lines) console.log(`    ${line}`);
  }
}

// ── Degradation detection ──────────────────────────────────────────────────

/**
 * Compare early metrics vs recent metrics to detect degradation.
 * @param {MetricsStore} metrics
 */
function detectDegradation(metrics) {
  const issues = [];
  const timeline = metrics.timeline();
  if (timeline.length < 10) return issues; // Not enough data

  // Split into first 20% and last 20%
  const splitPoint = Math.floor(timeline.length * 0.2);
  const early = timeline.slice(0, splitPoint);
  const late = timeline.slice(-splitPoint);

  const earlyP95 = avg(early.map((b) => b.latency.p95));
  const lateP95 = avg(late.map((b) => b.latency.p95));
  const earlyErr = avg(early.map((b) => parseFloat(b.errorRate)));
  const lateErr = avg(late.map((b) => parseFloat(b.errorRate)));

  if (lateP95 > earlyP95 * 1.5 && lateP95 > 1000) {
    issues.push({
      type: 'latency-degradation',
      detail: `p95 increased from ${earlyP95.toFixed(0)}ms → ${lateP95.toFixed(0)}ms (+${((lateP95 / earlyP95 - 1) * 100).toFixed(0)}%)`,
      severity: lateP95 > earlyP95 * 2 ? 'critical' : 'warning',
    });
  }

  if (lateErr > earlyErr + 2 && lateErr > 1) {
    issues.push({
      type: 'error-rate-increase',
      detail: `Error rate increased from ${earlyErr.toFixed(2)}% → ${lateErr.toFixed(2)}%`,
      severity: lateErr > 5 ? 'critical' : 'warning',
    });
  }

  // Check for monotonically increasing latency (memory leak signal)
  if (timeline.length >= 20) {
    const window = 5;
    const windows = [];
    for (let i = 0; i < timeline.length - window; i += window) {
      const slice = timeline.slice(i, i + window);
      windows.push(avg(slice.map((b) => b.latency.p95)));
    }
    let increasing = 0;
    for (let i = 1; i < windows.length; i++) {
      if (windows[i] > windows[i - 1]) increasing++;
    }
    if (increasing > windows.length * 0.8) {
      issues.push({
        type: 'monotonic-latency-increase',
        detail: `p95 latency has been increasing in ${increasing}/${windows.length - 1} consecutive windows — possible memory leak`,
        severity: 'critical',
      });
    }
  }

  return issues;
}

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const scenarios = getScenarios();
  const metrics = new MetricsStore();

  const engine = new LoadEngine({
    scenarios,
    metrics,
    targetVUs: TARGET_VUS,
    rampUpMinutes: RAMP_UP_MINUTES,
    durationMinutes: DURATION_MINUTES,
    dashboardIntervalMs: DASHBOARD_INTERVAL_MS,
    syntheticCheckIntervalMs: SYNTHETIC_INTERVAL_MS,
    onSyntheticCheck: runSyntheticCheck,
  });

  const result = await engine.run();

  // ── Degradation analysis ─────────────────────────────────────────────────
  console.log('\n📊 DEGRADATION ANALYSIS');
  console.log('─'.repeat(70));
  const issues = detectDegradation(metrics);

  if (issues.length === 0) {
    console.log('  ✅ No degradation detected — metrics are stable.');
  } else {
    for (const issue of issues) {
      const icon = issue.severity === 'critical' ? '🚨' : '⚠️';
      console.log(`  ${icon} [${issue.type}] ${issue.detail}`);
    }
  }

  // ── Per-endpoint breakdown ───────────────────────────────────────────────
  console.log('\n📋 ENDPOINT BREAKDOWN (full test window)');
  console.log('─'.repeat(70));
  const fullSnap = metrics.snapshot({ lastMinutes: DURATION_MINUTES });
  const epEntries = Object.entries(fullSnap.endpoints).sort(([, a], [, b]) => b.count - a.count);
  console.log(`  ${'Endpoint'.padEnd(30)} ${'Reqs'.padStart(8)} ${'Err%'.padStart(8)} ${'p50'.padStart(8)} ${'p95'.padStart(8)} ${'p99'.padStart(8)}`);
  for (const [ep, stats] of epEntries) {
    console.log(`  ${ep.padEnd(30)} ${String(stats.count).padStart(8)} ${stats.errorRate.padStart(8)} ${(stats.p50 + 'ms').padStart(8)} ${(stats.p95 + 'ms').padStart(8)} ${(stats.p99 + 'ms').padStart(8)}`);
  }

  // ── Synthetic check summary ──────────────────────────────────────────────
  console.log('\n🔍 SYNTHETIC CHECK SUMMARY');
  console.log('─'.repeat(70));
  console.log(`  Total runs  : ${syntheticRunCount}`);
  console.log(`  Passed      : ${syntheticPassCount}`);
  console.log(`  Failed      : ${syntheticFailCount}`);

  // ── Final report ─────────────────────────────────────────────────────────
  const reportDir = join(__dirname, '..', '..', 'deployment_reports', 'soak');
  try { mkdirSync(reportDir, { recursive: true }); } catch { /* exists */ }

  const finalReport = {
    testType: 'soak-endurance',
    startTime: new Date(metrics.startTime).toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes: DURATION_MINUTES,
    targetVUs: TARGET_VUS,
    rampUpMinutes: RAMP_UP_MINUTES,
    scenarios: scenarios.map((s) => s.name),
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    overallErrorRate: result.overallErrorRate,
    latency: fullSnap.latency,
    endpointBreakdown: fullSnap.endpoints,
    degradationIssues: issues,
    syntheticChecks: {
      total: syntheticRunCount,
      passed: syntheticPassCount,
      failed: syntheticFailCount,
    },
    successCriteria: {
      errorRateBelow1Percent: parseFloat(result.overallErrorRate) < 1,
      p95Below5000ms: fullSnap.latency.p95 < 5000,
      noDegradation: issues.filter((i) => i.severity === 'critical').length === 0,
      syntheticChecksPassed: syntheticFailCount === 0,
    },
    overallVerdict: 'PENDING',
    files: result.paths,
  };

  // Compute verdict
  const criteria = finalReport.successCriteria;
  if (criteria.errorRateBelow1Percent && criteria.p95Below5000ms && criteria.noDegradation && criteria.syntheticChecksPassed) {
    finalReport.overallVerdict = 'PASS';
  } else if (issues.some((i) => i.severity === 'critical')) {
    finalReport.overallVerdict = 'FAIL';
  } else {
    finalReport.overallVerdict = 'WARN';
  }

  const reportPath = join(reportDir, `soak-final-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  console.log(`\n📝 Final report: ${reportPath}`);

  // ── Verdict ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  const verdictIcon = finalReport.overallVerdict === 'PASS' ? '✅' : finalReport.overallVerdict === 'WARN' ? '⚠️' : '❌';
  console.log(`  ${verdictIcon} SOAK TEST VERDICT: ${finalReport.overallVerdict}`);
  console.log('  Criteria:');
  console.log(`    Error rate < 1%     : ${criteria.errorRateBelow1Percent ? '✅' : '❌'} (${result.overallErrorRate})`);
  console.log(`    p95 < 5000ms        : ${criteria.p95Below5000ms ? '✅' : '❌'} (${fullSnap.latency.p95}ms)`);
  console.log(`    No degradation      : ${criteria.noDegradation ? '✅' : '❌'}`);
  console.log(`    Synthetic checks    : ${criteria.syntheticChecksPassed ? '✅' : '❌'} (${syntheticPassCount}/${syntheticRunCount})`);
  console.log('═'.repeat(70));

  // Alert on failure
  const webhook = process.env.SYNTHETIC_ALERT_WEBHOOK;
  if (finalReport.overallVerdict === 'FAIL' && webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Soak Test FAILED\nDuration: ${DURATION_MINUTES}min | VUs: ${TARGET_VUS}\nErrors: ${result.overallErrorRate}\np95: ${fullSnap.latency.p95}ms\nIssues: ${issues.map((i) => i.detail).join('; ')}`,
        }),
      });
    } catch { /* best-effort */ }
  }

  process.exit(finalReport.overallVerdict === 'FAIL' ? 1 : 0);
}

main().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(2);
});
