#!/usr/bin/env node
/**
 * Shared synthetic test harness.
 * Provides:
 *  - HTTP client with timing
 *  - Assertion helpers
 *  - Result collection & reporting
 *  - Alerting hooks (webhook, email stub)
 */

import { resolveRuntimeEnvironment } from '../../shared/resolve-runtime-env.mjs';

// ── Result types ──────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   name: string;
 *   suite: string;
 *   status: 'pass' | 'fail' | 'skip';
 *   durationMs: number;
 *   error?: string;
 *   assertions: { label: string; passed: boolean; detail?: string }[];
 *   timestamp: string;
 *   region: string;
 * }} SyntheticResult
 */

// ── Runtime environment ───────────────────────────────────────────────────────

let _env = null;

export async function getEnv() {
  if (_env) return _env;
  _env = await resolveRuntimeEnvironment();
  return _env;
}

export function getRegion() {
  return process.env.SYNTHETIC_REGION ?? process.env.FLY_REGION ?? process.env.CF_REGION ?? 'local';
}

// ── HTTP client with timing ───────────────────────────────────────────────────

/**
 * @param {string} method
 * @param {string} url
 * @param {{
 *   body?: unknown;
 *   headers?: Record<string, string>;
 *   timeoutMs?: number;
 * }} opts
 */
export async function httpRequest(method, url, opts = {}) {
  const { body, headers = {}, timeoutMs = 15_000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const start = performance.now();
  try {
    const init = {
      method,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    const durationMs = Math.round(performance.now() - start);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text, durationMs, headers: res.headers, ok: res.ok };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    return { status: 0, json: null, text: '', durationMs, headers: null, ok: false, error: err };
  } finally {
    clearTimeout(timer);
  }
}

// ── Assertion helpers ─────────────────────────────────────────────────────────

export class AssertionCollector {
  constructor() {
    /** @type {{ label: string; passed: boolean; detail?: string }[]} */
    this.assertions = [];
    this.failed = false;
  }

  assert(label, condition, detail) {
    const passed = Boolean(condition);
    this.assertions.push({ label, passed, detail });
    if (!passed) this.failed = true;
    return passed;
  }

  assertStatus(label, res, expected) {
    return this.assert(label, res.status === expected, `expected ${expected}, got ${res.status}`);
  }

  assertStatusIn(label, res, expectedSet) {
    return this.assert(label, expectedSet.includes(res.status), `expected one of [${expectedSet}], got ${res.status}`);
  }

  assertLatency(label, res, maxMs) {
    return this.assert(label, res.durationMs <= maxMs, `${res.durationMs}ms > ${maxMs}ms`);
  }

  assertJsonField(label, json, field, condition) {
    const value = json?.[field];
    return this.assert(label, condition ? condition(value) : value !== undefined, `field "${field}" = ${JSON.stringify(value)}`);
  }

  assertTruthy(label, value, detail) {
    return this.assert(label, Boolean(value), detail ?? `value was ${JSON.stringify(value)}`);
  }
}

// ── Result collector ──────────────────────────────────────────────────────────

export class SyntheticRunner {
  /**
   * @param {string} suite
   */
  constructor(suite) {
    this.suite = suite;
    /** @type {SyntheticResult[]} */
    this.results = [];
    this.region = getRegion();
  }

  /**
   * Run a single synthetic check.
   * @param {string} name
   * @param {(ac: AssertionCollector) => Promise<void>} fn
   */
  async run(name, fn) {
    const ac = new AssertionCollector();
    const start = performance.now();
    let error;
    try {
      await fn(ac);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      ac.assert('no-exception', false, error);
    }
    const durationMs = Math.round(performance.now() - start);

    /** @type {SyntheticResult} */
    const result = {
      name,
      suite: this.suite,
      status: ac.failed || error ? 'fail' : 'pass',
      durationMs,
      error,
      assertions: ac.assertions,
      timestamp: new Date().toISOString(),
      region: this.region,
    };
    this.results.push(result);
    const icon = result.status === 'pass' ? '✓' : '✗';
    const failedAssertions = ac.assertions.filter((a) => !a.passed);
    console.log(`  ${icon} ${name} (${durationMs}ms)${failedAssertions.length ? ` — FAILS: ${failedAssertions.map((a) => a.label).join(', ')}` : ''}`);
    return result;
  }

  /** Print summary and return exit code. */
  summarize() {
    const passed = this.results.filter((r) => r.status === 'pass').length;
    const failed = this.results.filter((r) => r.status === 'fail').length;
    const skipped = this.results.filter((r) => r.status === 'skip').length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.durationMs, 0);

    console.log();
    console.log(`─── ${this.suite} ───`);
    console.log(`Region : ${this.region}`);
    console.log(`Passed : ${passed}`);
    console.log(`Failed : ${failed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total  : ${totalDuration}ms`);
    console.log();

    if (failed > 0) {
      console.log('FAILURES:');
      for (const r of this.results.filter((r) => r.status === 'fail')) {
        console.log(`  ✗ ${r.name}`);
        for (const a of r.assertions.filter((a) => !a.passed)) {
          console.log(`      → ${a.label}: ${a.detail ?? 'failed'}`);
        }
      }
      console.log();
    }

    return failed > 0 ? 1 : 0;
  }

  /** Return JSON report object. */
  toJSON() {
    const passed = this.results.filter((r) => r.status === 'pass').length;
    const failed = this.results.filter((r) => r.status === 'fail').length;
    return {
      suite: this.suite,
      region: this.region,
      timestamp: new Date().toISOString(),
      passed,
      failed,
      total: this.results.length,
      results: this.results,
    };
  }
}

// ── Alerting ──────────────────────────────────────────────────────────────────

/**
 * Send alert to configured webhook (Slack, Discord, etc.).
 * @param {string} webhookUrl
 * @param {{ suite: string; region: string; failures: string[]; timestamp: string }} payload
 */
export async function sendWebhookAlert(webhookUrl, payload) {
  if (!webhookUrl) return;

  const text = [
    `🚨 *Synthetic Monitor Alert — ${payload.suite}*`,
    `Region: ${payload.region}`,
    `Time: ${payload.timestamp}`,
    `Failures:`,
    ...payload.failures.map((f) => `  • ${f}`),
  ].join('\n');

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, content: text }),
    });
  } catch (err) {
    console.error(`[ALERT] Webhook delivery failed: ${err.message}`);
  }
}
