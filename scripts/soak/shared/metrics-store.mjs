#!/usr/bin/env node
/**
 * Soak Test: Rolling Metrics Store
 *
 * Tracks request-level metrics over time with:
 *  - Rolling time-window buckets (1-minute granularity)
 *  - Percentile calculations (p50, p95, p99)
 *  - Error rate tracking
 *  - CSV + JSON export for analysis
 *  - Memory-efficient circular buffer (drops old buckets)
 */

import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, '..', '..', '..', 'deployment_reports', 'soak');

/**
 * @typedef {{
 *   timestamp: number;
 *   endpoint: string;
 *   method: string;
 *   status: number;
 *   latencyMs: number;
 *   error?: string;
 *   scenario: string;
 * }} RequestSample
 */

/**
 * @typedef {{
 *   bucketStart: number;
 *   requestCount: number;
 *   errorCount: number;
 *   latencies: number[];
 *   statusCodes: Record<number, number>;
 *   endpoints: Record<string, { count: number; errors: number; latencies: number[] }>;
 * }} MetricBucket
 */

export class MetricsStore {
  /**
   * @param {{ bucketSizeMs?: number; maxBuckets?: number; csvPath?: string }} opts
   */
  constructor(opts = {}) {
    this.bucketSizeMs = opts.bucketSizeMs ?? 60_000; // 1-minute buckets
    this.maxBuckets = opts.maxBuckets ?? 1500;       // ~25 hours of 1-min buckets
    /** @type {Map<number, MetricBucket>} */
    this.buckets = new Map();
    this.startTime = Date.now();
    this.totalRequests = 0;
    this.totalErrors = 0;

    // CSV log
    try { mkdirSync(REPORT_DIR, { recursive: true }); } catch { /* exists */ }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    this.csvPath = opts.csvPath ?? join(REPORT_DIR, `soak-samples-${ts}.csv`);
    this.jsonReportPath = join(REPORT_DIR, `soak-report-${ts}.json`);
    this.timelineJsonPath = join(REPORT_DIR, `soak-timeline-${ts}.json`);

    // Write CSV header
    writeFileSync(this.csvPath, 'timestamp_iso,elapsed_min,scenario,method,endpoint,status,latency_ms,error\n');
  }

  /** Get or create bucket for a timestamp. */
  _getBucket(timestamp) {
    const key = Math.floor(timestamp / this.bucketSizeMs) * this.bucketSizeMs;
    if (!this.buckets.has(key)) {
      // Evict oldest if at capacity
      if (this.buckets.size >= this.maxBuckets) {
        const oldest = Math.min(...this.buckets.keys());
        this.buckets.delete(oldest);
      }
      this.buckets.set(key, {
        bucketStart: key,
        requestCount: 0,
        errorCount: 0,
        latencies: [],
        statusCodes: {},
        endpoints: {},
      });
    }
    return this.buckets.get(key);
  }

  /**
   * Record a single request sample.
   * @param {RequestSample} sample
   */
  record(sample) {
    this.totalRequests++;
    const isError = sample.status === 0 || sample.status >= 500 || sample.error;
    if (isError) this.totalErrors++;

    const bucket = this._getBucket(sample.timestamp);
    bucket.requestCount++;
    if (isError) bucket.errorCount++;
    bucket.latencies.push(sample.latencyMs);
    bucket.statusCodes[sample.status] = (bucket.statusCodes[sample.status] ?? 0) + 1;

    // Per-endpoint tracking
    if (!bucket.endpoints[sample.endpoint]) {
      bucket.endpoints[sample.endpoint] = { count: 0, errors: 0, latencies: [] };
    }
    const ep = bucket.endpoints[sample.endpoint];
    ep.count++;
    if (isError) ep.errors++;
    ep.latencies.push(sample.latencyMs);

    // Append to CSV (async-safe since Node single-threaded)
    const elapsedMin = ((sample.timestamp - this.startTime) / 60_000).toFixed(2);
    const line = `${new Date(sample.timestamp).toISOString()},${elapsedMin},${sample.scenario},${sample.method},${sample.endpoint},${sample.status},${sample.latencyMs},${sample.error ?? ''}\n`;
    try { appendFileSync(this.csvPath, line); } catch { /* best-effort */ }
  }

  /** Calculate percentile from sorted array. */
  _percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  /** Compute stats from an array of latencies. */
  _computeStats(latencies) {
    if (latencies.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, count: 0 };
    const sorted = [...latencies].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sum / sorted.length),
      p50: this._percentile(sorted, 50),
      p95: this._percentile(sorted, 95),
      p99: this._percentile(sorted, 99),
      count: sorted.length,
    };
  }

  /**
   * Get current snapshot of metrics for display.
   * @param {{ lastMinutes?: number }} opts — only look at last N minutes
   */
  snapshot(opts = {}) {
    const lastMinutes = opts.lastMinutes ?? 5;
    const cutoff = Date.now() - lastMinutes * 60_000;
    const recentBuckets = [...this.buckets.values()].filter((b) => b.bucketStart >= cutoff);

    const allLatencies = recentBuckets.flatMap((b) => b.latencies);
    const totalReqs = recentBuckets.reduce((s, b) => s + b.requestCount, 0);
    const totalErrs = recentBuckets.reduce((s, b) => s + b.errorCount, 0);

    // Per-endpoint aggregation
    const endpointMap = {};
    for (const bucket of recentBuckets) {
      for (const [ep, data] of Object.entries(bucket.endpoints)) {
        if (!endpointMap[ep]) endpointMap[ep] = { count: 0, errors: 0, latencies: [] };
        endpointMap[ep].count += data.count;
        endpointMap[ep].errors += data.errors;
        endpointMap[ep].latencies.push(...data.latencies);
      }
    }

    const endpoints = {};
    for (const [ep, data] of Object.entries(endpointMap)) {
      endpoints[ep] = {
        ...this._computeStats(data.latencies),
        errorRate: data.count > 0 ? (data.errors / data.count * 100).toFixed(2) + '%' : '0%',
      };
    }

    return {
      windowMinutes: lastMinutes,
      requests: totalReqs,
      errors: totalErrs,
      errorRate: totalReqs > 0 ? (totalErrs / totalReqs * 100).toFixed(2) + '%' : '0%',
      latency: this._computeStats(allLatencies),
      rps: lastMinutes > 0 ? (totalReqs / (lastMinutes * 60)).toFixed(1) : '0',
      endpoints,
      elapsedMinutes: ((Date.now() - this.startTime) / 60_000).toFixed(1),
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      overallErrorRate: this.totalRequests > 0 ? (this.totalErrors / this.totalRequests * 100).toFixed(2) + '%' : '0%',
    };
  }

  /**
   * Generate timeline data (one entry per bucket) for trend analysis.
   */
  timeline() {
    const sorted = [...this.buckets.entries()].sort(([a], [b]) => a - b);
    return sorted.map(([key, bucket]) => ({
      time: new Date(key).toISOString(),
      elapsedMin: ((key - this.startTime) / 60_000).toFixed(1),
      requests: bucket.requestCount,
      errors: bucket.errorCount,
      errorRate: bucket.requestCount > 0 ? (bucket.errorCount / bucket.requestCount * 100).toFixed(2) : '0',
      latency: this._computeStats(bucket.latencies),
    }));
  }

  /**
   * Write final JSON reports to disk.
   */
  writeReports() {
    const report = {
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: ((Date.now() - this.startTime) / 60_000).toFixed(1),
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      overallErrorRate: this.totalRequests > 0 ? (this.totalErrors / this.totalRequests * 100).toFixed(4) + '%' : '0%',
      latency: this._computeStats([...this.buckets.values()].flatMap((b) => b.latencies)),
      csvPath: this.csvPath,
    };
    writeFileSync(this.jsonReportPath, JSON.stringify(report, null, 2));

    const tl = this.timeline();
    writeFileSync(this.timelineJsonPath, JSON.stringify(tl, null, 2));

    return { reportPath: this.jsonReportPath, timelinePath: this.timelineJsonPath, csvPath: this.csvPath };
  }

  /** Print a compact dashboard line to stdout. */
  printDashboard() {
    const snap = this.snapshot({ lastMinutes: 5 });
    const elapsed = snap.elapsedMinutes;
    const line = [
      `[${new Date().toISOString().slice(11, 19)}]`,
      `elapsed=${elapsed}min`,
      `total=${this.totalRequests}`,
      `rps=${snap.rps}`,
      `p95=${snap.latency.p95}ms`,
      `p99=${snap.latency.p99}ms`,
      `err=${snap.errorRate}`,
      `(5min window: ${snap.requests} reqs, ${snap.errors} errs)`,
    ].join(' | ');
    console.log(line);
  }
}
