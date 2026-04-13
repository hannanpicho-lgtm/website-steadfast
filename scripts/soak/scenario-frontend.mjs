#!/usr/bin/env node
/**
 * Soak Scenario: Frontend — Cloudflare Pages
 *
 * Simulates users loading the SPA and key assets repeatedly.
 * Detects: CDN degradation, asset serving failures, increased TTFB over time,
 * Cloudflare rate limiting, cache invalidation issues.
 *
 * Endpoints hit per iteration:
 *  - GET / (HTML shell)
 *  - GET /favicon.svg
 *  - One randomly picked deep route (/home, /records, /activity, /deposit, /vip, /starting)
 */

import { timedFetch } from './shared/load-engine.mjs';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://steadfastworkbench.org';

const DEEP_ROUTES = [
  '/',
  '/home',
  '/records',
  '/activity',
  '/deposit',
  '/vip',
  '/starting',
  '/referrals',
  '/profile',
  '/support',
];

/** @type {import('./shared/load-engine.mjs').Scenario} */
export const frontendScenario = {
  name: 'frontend',
  thinkTimeMs: [500, 2000], // 0.5–2s between page loads

  async execute(vu, metrics) {
    const now = Date.now();

    // 1. Load root HTML
    const rootRes = await timedFetch('GET', FRONTEND_URL, {
      headers: { 'User-Agent': `SoakTest-VU-${vu.id}` },
    });
    metrics.record({
      timestamp: now,
      endpoint: '/',
      method: 'GET',
      status: rootRes.status,
      latencyMs: rootRes.latencyMs,
      error: rootRes.error,
      scenario: 'frontend',
    });

    // 2. Load favicon
    const favRes = await timedFetch('GET', `${FRONTEND_URL}/favicon.svg`, {
      headers: { 'User-Agent': `SoakTest-VU-${vu.id}` },
    });
    metrics.record({
      timestamp: Date.now(),
      endpoint: '/favicon.svg',
      method: 'GET',
      status: favRes.status,
      latencyMs: favRes.latencyMs,
      error: favRes.error,
      scenario: 'frontend',
    });

    // 3. Hit a random deep route (SPA serves same HTML but CDN may differ)
    const route = DEEP_ROUTES[Math.floor(Math.random() * DEEP_ROUTES.length)];
    const deepRes = await timedFetch('GET', `${FRONTEND_URL}${route}`, {
      headers: { 'User-Agent': `SoakTest-VU-${vu.id}` },
    });
    metrics.record({
      timestamp: Date.now(),
      endpoint: route,
      method: 'GET',
      status: deepRes.status,
      latencyMs: deepRes.latencyMs,
      error: deepRes.error,
      scenario: 'frontend',
    });
  },
};
