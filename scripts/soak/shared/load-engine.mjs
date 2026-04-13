#!/usr/bin/env node
/**
 * Soak Test: Load Engine
 *
 * Manages a pool of virtual users executing scenarios with:
 *  - Configurable concurrency (virtual users)
 *  - Think time between requests (realistic pacing)
 *  - Ramping: gradual increase/decrease of VUs
 *  - Graceful shutdown on SIGINT
 *  - Integration with MetricsStore for tracking
 *
 * Each scenario provides an async `execute(vu, metrics)` function
 * that the engine calls repeatedly for each VU.
 */

import { MetricsStore } from './metrics-store.mjs';

/**
 * @typedef {{
 *   name: string;
 *   execute: (vu: VirtualUser, metrics: MetricsStore) => Promise<void>;
 *   thinkTimeMs?: number | [number, number];
 * }} Scenario
 */

/**
 * @typedef {{
 *   id: number;
 *   scenario: string;
 *   iterations: number;
 *   errors: number;
 *   running: boolean;
 * }} VirtualUser
 */

/**
 * Random delay in range [min, max].
 * @param {number | [number, number]} thinkTime
 */
function resolveThinkTime(thinkTime) {
  if (Array.isArray(thinkTime)) {
    const [min, max] = thinkTime;
    return min + Math.floor(Math.random() * (max - min));
  }
  return thinkTime ?? 1000;
}

/**
 * Timed fetch wrapper that returns a sample-compatible result.
 * @param {string} method
 * @param {string} url
 * @param {{ body?: unknown; headers?: Record<string, string>; timeoutMs?: number }} opts
 */
export async function timedFetch(method, url, opts = {}) {
  const { body, headers = {}, timeoutMs = 20_000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const init = {
      method,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetch(url, init);
    const latencyMs = Math.round(performance.now() - start);
    // Consume body to prevent connection leaks
    await res.text();
    return { status: res.status, latencyMs, ok: res.ok, headers: res.headers };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const isTimeout = err.name === 'AbortError';
    return {
      status: 0,
      latencyMs,
      ok: false,
      error: isTimeout ? 'timeout' : err.message,
      headers: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export class LoadEngine {
  /**
   * @param {{
   *   scenarios: Scenario[];
   *   metrics: MetricsStore;
   *   targetVUs?: number;
   *   rampUpMinutes?: number;
   *   durationMinutes: number;
   *   dashboardIntervalMs?: number;
   *   syntheticCheckIntervalMs?: number;
   *   onSyntheticCheck?: () => Promise<void>;
   * }} config
   */
  constructor(config) {
    this.scenarios = config.scenarios;
    this.metrics = config.metrics;
    this.targetVUs = config.targetVUs ?? 50;
    this.rampUpMinutes = config.rampUpMinutes ?? 5;
    this.durationMinutes = config.durationMinutes;
    this.dashboardIntervalMs = config.dashboardIntervalMs ?? 30_000;
    this.syntheticCheckIntervalMs = config.syntheticCheckIntervalMs ?? 600_000; // 10 min
    this.onSyntheticCheck = config.onSyntheticCheck ?? null;

    /** @type {VirtualUser[]} */
    this.vus = [];
    this.running = false;
    this.startTime = 0;
    this._vuPromises = [];
    this._dashboardTimer = null;
    this._syntheticTimer = null;
  }

  /** Calculate how many VUs should be active at elapsed time `t` (ms). */
  _currentTargetVUs(elapsedMs) {
    const rampMs = this.rampUpMinutes * 60_000;
    if (elapsedMs >= rampMs) return this.targetVUs;
    return Math.max(1, Math.floor((elapsedMs / rampMs) * this.targetVUs));
  }

  /** Start a single VU loop. */
  async _runVU(vu) {
    // Pick scenario round-robin by VU id
    const scenario = this.scenarios[vu.id % this.scenarios.length];
    vu.scenario = scenario.name;

    while (vu.running && this.running) {
      try {
        await scenario.execute(vu, this.metrics);
        vu.iterations++;
      } catch (err) {
        vu.errors++;
        // Don't crash the VU on individual iteration failure
        console.error(`  [VU-${vu.id}] Error: ${err.message}`);
      }

      // Think time
      if (vu.running && this.running) {
        const delay = resolveThinkTime(scenario.thinkTimeMs);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  /** Scale VUs up or down to match target. */
  _adjustVUs(targetCount) {
    // Scale up
    while (this.vus.length < targetCount) {
      const vu = {
        id: this.vus.length,
        scenario: '',
        iterations: 0,
        errors: 0,
        running: true,
      };
      this.vus.push(vu);
      this._vuPromises.push(this._runVU(vu));
    }
    // Scale down (stop excess VUs)
    while (this.vus.filter((v) => v.running).length > targetCount) {
      const toStop = this.vus.filter((v) => v.running).pop();
      if (toStop) toStop.running = false;
    }
  }

  /**
   * Run the soak test for the configured duration.
   * Returns when complete or when interrupted by SIGINT.
   */
  async run() {
    this.running = true;
    this.startTime = Date.now();
    const endTime = this.startTime + this.durationMinutes * 60_000;

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  SOAK TEST STARTING`);
    console.log(`  Duration      : ${this.durationMinutes} minutes`);
    console.log(`  Target VUs    : ${this.targetVUs}`);
    console.log(`  Ramp-up       : ${this.rampUpMinutes} minutes`);
    console.log(`  Scenarios     : ${this.scenarios.map((s) => s.name).join(', ')}`);
    console.log(`  Dashboard log : every ${this.dashboardIntervalMs / 1000}s`);
    console.log(`  Synthetic chk : every ${this.syntheticCheckIntervalMs / 60_000} min`);
    console.log(`${'═'.repeat(70)}\n`);

    // Graceful shutdown
    const shutdown = () => {
      console.log('\n⚠ SIGINT received — shutting down gracefully...');
      this.running = false;
      for (const vu of this.vus) vu.running = false;
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Dashboard ticker
    this._dashboardTimer = setInterval(() => {
      this.metrics.printDashboard();
      // Adjust VUs based on ramp
      const elapsed = Date.now() - this.startTime;
      const target = this._currentTargetVUs(elapsed);
      const active = this.vus.filter((v) => v.running).length;
      if (active !== target) {
        this._adjustVUs(target);
        console.log(`  [RAMP] VUs: ${active} → ${target}`);
      }
    }, this.dashboardIntervalMs);

    // Synthetic health checks during soak
    if (this.onSyntheticCheck) {
      // Run first check immediately
      this.onSyntheticCheck().catch(() => {});
      this._syntheticTimer = setInterval(() => {
        this.onSyntheticCheck().catch((err) => {
          console.error(`  [SYNTHETIC] Check failed: ${err.message}`);
        });
      }, this.syntheticCheckIntervalMs);
    }

    // Initial ramp
    this._adjustVUs(this._currentTargetVUs(0));

    // Wait loop
    while (this.running && Date.now() < endTime) {
      await new Promise((r) => setTimeout(r, 5000));
      // Ramp check
      const elapsed = Date.now() - this.startTime;
      const target = this._currentTargetVUs(elapsed);
      this._adjustVUs(target);
    }

    // Shutdown
    console.log('\n⏸ Soak duration reached — stopping VUs...');
    this.running = false;
    for (const vu of this.vus) vu.running = false;

    // Wait for all VUs to finish current iteration
    await Promise.allSettled(this._vuPromises);

    clearInterval(this._dashboardTimer);
    if (this._syntheticTimer) clearInterval(this._syntheticTimer);

    process.removeListener('SIGINT', shutdown);
    process.removeListener('SIGTERM', shutdown);

    // Final dashboard
    console.log('\n' + '═'.repeat(70));
    console.log('  SOAK TEST COMPLETE');
    this.metrics.printDashboard();

    // VU summary
    const totalIter = this.vus.reduce((s, v) => s + v.iterations, 0);
    const totalVUErr = this.vus.reduce((s, v) => s + v.errors, 0);
    console.log(`  Total VU iterations: ${totalIter}`);
    console.log(`  Total VU errors    : ${totalVUErr}`);
    console.log('═'.repeat(70));

    // Write reports
    const paths = this.metrics.writeReports();
    console.log(`\n  CSV samples : ${paths.csvPath}`);
    console.log(`  JSON report : ${paths.reportPath}`);
    console.log(`  Timeline    : ${paths.timelinePath}`);

    return {
      totalIterations: totalIter,
      totalVUErrors: totalVUErr,
      ...this.metrics.snapshot({ lastMinutes: this.durationMinutes }),
      paths,
    };
  }
}
