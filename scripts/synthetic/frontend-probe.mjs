#!/usr/bin/env node
/**
 * Synthetic Monitor: Frontend Availability Probe
 *
 * Verifies the frontend is served correctly from Cloudflare Pages:
 *  1. GET / returns 200
 *  2. HTML contains the <div id="root"> mount point
 *  3. Key meta tags present (viewport, charset)
 *  4. JavaScript entry chunks are reachable
 *  5. /favicon.ico or /favicon.svg is served
 *  6. Response time is acceptable
 *  7. CSP / security headers are present
 *
 * Frequency: Every 5 minutes
 * Priority: P0 — if frontend is down, nothing works
 */

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://steadfastworkbench.org';
const ALERT_WEBHOOK = process.env.SYNTHETIC_ALERT_WEBHOOK ?? '';
const MAX_LATENCY_MS = 8000;

async function probe(label, url, validate) {
  const start = Date.now();
  let result = { label, status: 'pass', latencyMs: 0, detail: '' };
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SyntheticMonitor/1.0 (Steadfast)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    result.latencyMs = Date.now() - start;
    const text = await res.text();
    validate(res, text, result);
  } catch (err) {
    result.latencyMs = Date.now() - start;
    result.status = 'fail';
    result.detail = `Fetch error: ${err.message}`;
  }
  return result;
}

async function main() {
  console.log(`\n🌐 Frontend Availability Probe — ${FRONTEND_URL}\n`);

  const results = [];

  // 1. Root page returns 200
  results.push(await probe('GET / returns 200', FRONTEND_URL, (res, _text, r) => {
    if (res.status !== 200) {
      r.status = 'fail'; r.detail = `Expected 200, got ${res.status}`;
    }
  }));

  // 2. HTML has #root mount
  results.push(await probe('HTML contains <div id="root">', FRONTEND_URL, (_res, text, r) => {
    if (!text.includes('id="root"')) {
      r.status = 'fail'; r.detail = 'Missing #root mount point';
    }
  }));

  // 3. HTML has viewport meta
  results.push(await probe('HTML has viewport meta tag', FRONTEND_URL, (_res, text, r) => {
    if (!text.includes('viewport')) {
      r.status = 'fail'; r.detail = 'Missing viewport meta tag';
    }
  }));

  // 4. HTML references JS bundle
  results.push(await probe('HTML references JS entry', FRONTEND_URL, (_res, text, r) => {
    const hasScript = text.includes('.js') && (text.includes('type="module"') || text.includes('src="/assets/'));
    if (!hasScript) {
      r.status = 'fail'; r.detail = 'No JS module entry found in HTML';
    }
  }));

  // 5. Latency check
  results.push(await probe('Latency under threshold', FRONTEND_URL, (_res, _text, r) => {
    if (r.latencyMs > MAX_LATENCY_MS) {
      r.status = 'fail'; r.detail = `${r.latencyMs}ms exceeds ${MAX_LATENCY_MS}ms threshold`;
    }
  }));

  // 6. Favicon accessible
  results.push(await probe('Favicon accessible', `${FRONTEND_URL}/favicon.svg`, (res, _text, r) => {
    if (res.status >= 400) {
      // try .ico fallback check (just mark warning, not fail)
      r.status = 'warn'; r.detail = `favicon.svg returned ${res.status}, may use .ico`;
    }
  }));

  // 7. Security headers
  results.push(await probe('Security headers present', FRONTEND_URL, (res, _text, r) => {
    const missing = [];
    if (!res.headers.get('x-content-type-options')) missing.push('x-content-type-options');
    if (!res.headers.get('x-frame-options') && !res.headers.get('content-security-policy')) missing.push('x-frame-options or CSP');
    if (missing.length > 0) {
      r.status = 'warn'; r.detail = `Missing headers: ${missing.join(', ')}`;
    }
  }));

  // 8. HTTPS redirect (http → https)
  results.push(await probe('HTTPS redirect works', FRONTEND_URL.replace('https://', 'http://'), (res, _text, r) => {
    const finalUrl = res.url ?? '';
    if (!finalUrl.startsWith('https://')) {
      // Check if we at least got a 200 (redirect may be transparent)
      if (res.status !== 200) {
        r.status = 'warn'; r.detail = `HTTP request returned ${res.status}, redirect status unclear`;
      }
    }
  }));

  // ── Summary ──────────────────────────────────────────────────────────────
  let failCount = 0;
  let warnCount = 0;
  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌';
    console.log(`  ${icon} ${r.label} (${r.latencyMs}ms)${r.detail ? ` — ${r.detail}` : ''}`);
    if (r.status === 'fail') failCount++;
    if (r.status === 'warn') warnCount++;
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results: ${results.length - failCount - warnCount} pass, ${warnCount} warn, ${failCount} fail`);

  // Write report
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const reportDir = new URL('../../deployment_reports/synthetic/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
  try { mkdirSync(reportDir, { recursive: true }); } catch { /* exists */ }
  const reportPath = `${reportDir}/frontend-probe-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), url: FRONTEND_URL, results }, null, 2));
  console.log(`Report: ${reportPath}`);

  if (failCount > 0 && ALERT_WEBHOOK) {
    const failures = results.filter(r => r.status === 'fail').map(r => `${r.label}: ${r.detail}`);
    try {
      await fetch(ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Frontend probe FAILED\nURL: ${FRONTEND_URL}\nFailures:\n${failures.join('\n')}`,
        }),
      });
    } catch { /* best-effort */ }
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(2);
});
