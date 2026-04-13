#!/usr/bin/env node
/**
 * Soak Scenario: API Layer — Supabase Edge Functions
 *
 * Hits the public API endpoints under sustained load to detect:
 *  - Cold-start degradation on Edge Functions
 *  - Connection pool exhaustion
 *  - Rate limiting / throttling from Supabase
 *  - Memory leaks in the Deno runtime
 *  - Gradual latency increase
 *
 * Endpoints hit per iteration (weighted mix):
 *  - GET /health           (30%) — fastest, baseline
 *  - GET /health/ready     (10%)
 *  - GET /version          (15%)
 *  - GET /vip-config       (20%) — medium, config read
 *  - GET /rewards-config   (15%) — medium, config read
 *  - GET /cs/support-links (10%) — least critical
 */

import { timedFetch } from './shared/load-engine.mjs';
import { resolveRuntimeEnvironment } from '../shared/resolve-runtime-env.mjs';

let _env = null;
async function env() {
  if (!_env) _env = await resolveRuntimeEnvironment();
  return _env;
}

const WEIGHTED_ENDPOINTS = [
  { path: '/health', weight: 30 },
  { path: '/health/ready', weight: 10 },
  { path: '/version', weight: 15 },
  { path: '/vip-config', weight: 25 },
  { path: '/rewards-config', weight: 20 },
  // /cs/support-links excluded: returns 503 outside platform hours (9AM-10PM EST)
];

// Build cumulative distribution
const TOTAL_WEIGHT = WEIGHTED_ENDPOINTS.reduce((s, e) => s + e.weight, 0);
function pickEndpoint() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const ep of WEIGHTED_ENDPOINTS) {
    roll -= ep.weight;
    if (roll <= 0) return ep.path;
  }
  return WEIGHTED_ENDPOINTS[0].path;
}

/** @type {import('./shared/load-engine.mjs').Scenario} */
export const apiScenario = {
  name: 'api-public',
  thinkTimeMs: [300, 1500], // 0.3–1.5s between API calls

  async execute(vu, metrics) {
    const { apiBaseUrl, anonKey } = await env();
    const endpoint = pickEndpoint();

    const res = await timedFetch('GET', `${apiBaseUrl}${endpoint}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Origin: 'https://steadfastworkbench.org',
        'User-Agent': `SoakTest-VU-${vu.id}`,
      },
      timeoutMs: 15_000,
    });

    metrics.record({
      timestamp: Date.now(),
      endpoint,
      method: 'GET',
      status: res.status,
      latencyMs: res.latencyMs,
      error: res.error,
      scenario: 'api-public',
    });
  },
};
