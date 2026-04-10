#!/usr/bin/env node

/**
 * Kill-Switch CLI — Control platform mode from anywhere.
 *
 * Usage:
 *   node scripts/kill-switch.mjs <command> [options]
 *
 * Commands:
 *   status                        Show current platform mode + health
 *   readonly  [reason]            Switch to read-only (phased, 30s grace)
 *   shutdown  [reason]            Emergency shutdown (immediate)
 *   activate  [reason]            Restore to active (with verification)
 *   rollback  [reason]            Rollback to previous mode
 *   verify                        Run recovery verification suite
 *   health                        Show system health checks
 *   audit     [limit]             Show recent audit log
 *
 * Options:
 *   --grace=MS                    Grace period in ms (default: 30000)
 *   --auto-revert=MS              Auto-revert timer in ms
 *   --skip-verify                 Skip verification on rollback/activate
 *   --force                       Alias for --skip-verify
 *
 * Auth (pick one):
 *   --token=ast_xxx               Use existing script token
 *   --jwt=eyJ...                  Use admin JWT (auto-issues token)
 *   env ADMIN_JWT=...             Admin JWT from environment
 *   env KILL_SWITCH_TOKEN=...     Script token from environment
 *
 * Examples:
 *   node scripts/kill-switch.mjs status
 *   node scripts/kill-switch.mjs readonly "Deploying hotfix v2.3"
 *   node scripts/kill-switch.mjs readonly "DB migration" --grace=60000 --auto-revert=900000
 *   node scripts/kill-switch.mjs shutdown "Security incident"
 *   node scripts/kill-switch.mjs rollback "Hotfix verified"
 *   node scripts/kill-switch.mjs activate --skip-verify
 *   node scripts/kill-switch.mjs audit 20
 *
 * npm shortcut (add to package.json scripts):
 *   "kill-switch": "node scripts/kill-switch.mjs"
 *   Then: npm run kill-switch -- status
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

// ── Config ──────────────────────────────────────────────────────────────────

const TRUSTED_ORIGIN = 'https://steadfastworkbench.org';

async function resolveFunctionUrl() {
  const envUrl = String(process.env.SUPABASE_FUNCTION_URL ?? '').trim();
  if (envUrl) return envUrl;

  const infoPath = path.join(process.cwd(), 'utils', 'supabase', 'info.tsx');
  const src = await readFile(infoPath, 'utf8');
  const match = src.match(/projectId\s*=\s*"([^"]+)"/);
  if (!match) throw new Error('Cannot resolve projectId from utils/supabase/info.tsx');
  return `https://${match[1]}.supabase.co/functions/v1/make-server-a1c55d7e`;
}

async function resolveAnonKey() {
  const envKey = String(process.env.SUPABASE_ANON_KEY ?? '').trim();
  if (envKey) return envKey;

  const infoPath = path.join(process.cwd(), 'utils', 'supabase', 'info.tsx');
  const src = await readFile(infoPath, 'utf8');
  const match = src.match(/publicAnonKey\s*=\s*"([^"]+)"/);
  if (!match) throw new Error('Cannot resolve publicAnonKey from utils/supabase/info.tsx');
  return match[1];
}

// ── Arg Parsing ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args.find(a => !a.startsWith('-')) ?? 'status';
  const positional = args.filter(a => !a.startsWith('-'));
  const reason = positional.slice(1).join(' ') || null;
  const limit = command === 'audit' && positional[1] ? parseInt(positional[1], 10) : 50;

  const flags = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, ...valParts] = arg.slice(2).split('=');
      flags[key] = valParts.length > 0 ? valParts.join('=') : true;
    }
  }

  return {
    command,
    reason,
    limit,
    graceMs: flags.grace ? parseInt(flags.grace, 10) : 30000,
    autoRevertMs: flags['auto-revert'] ? parseInt(flags['auto-revert'], 10) : null,
    skipVerify: flags['skip-verify'] === true || flags.force === true,
    token: flags.token ?? (String(process.env.KILL_SWITCH_TOKEN ?? '').trim() || null),
    jwt: flags.jwt ?? (String(process.env.ADMIN_JWT ?? '').trim() || null),
  };
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function resolveToken(baseUrl, anonKey, opts) {
  // Priority: explicit token > env token > JWT auto-issue
  if (opts.token) return opts.token;

  if (!opts.jwt) {
    printError('No auth provided. Use --jwt=..., --token=..., or set ADMIN_JWT / KILL_SWITCH_TOKEN env var.');
    process.exit(1);
  }

  // Auto-issue a script token from the admin JWT
  printInfo('Issuing script token from JWT...');
  const res = await fetch(`${baseUrl}/admin/script-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.jwt}`,
      apikey: anonKey,
      Origin: TRUSTED_ORIGIN,
    },
    body: JSON.stringify({ scopes: ['platform-settings:manage'] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    printError(`Token issuance failed (${res.status}): ${body.slice(0, 200)}`);
    process.exit(1);
  }

  const data = await res.json();
  const token = data.token ?? data.rawToken;
  if (!token) {
    printError('Token issuance returned no token.');
    process.exit(1);
  }

  printSuccess(`Token issued (valid ${data.ttlMinutes ?? '~10'}m, ${data.maxUses ?? '~1500'} uses)`);
  return token;
}

// ── HTTP Helpers ─────────────────────────────────────────────────────────────

function buildHeaders(token, anonKey) {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Script-Token': token,
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    Origin: TRUSTED_ORIGIN,
  };
}

async function apiGet(baseUrl, path, headers) {
  const res = await fetch(`${baseUrl}${path}`, { method: 'GET', headers });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function apiPost(baseUrl, path, headers, data = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function apiPut(baseUrl, path, headers, data = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

// ── Output Formatting ────────────────────────────────────────────────────────

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

const MODE_BADGE = {
  active:   `${COLORS.bgGreen}${COLORS.bold} ACTIVE ${COLORS.reset}`,
  readonly: `${COLORS.bgYellow}${COLORS.bold} READ-ONLY ${COLORS.reset}`,
  shutdown: `${COLORS.bgRed}${COLORS.bold} SHUTDOWN ${COLORS.reset}`,
};

function printInfo(msg) { console.log(`${COLORS.cyan}ℹ${COLORS.reset} ${msg}`); }
function printSuccess(msg) { console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`); }
function printError(msg) { console.error(`${COLORS.red}✗${COLORS.reset} ${msg}`); }
function printWarn(msg) { console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`); }

function printMode(data) {
  const m = data.mode;
  console.log('');
  console.log(`  Platform Mode: ${MODE_BADGE[m.mode] ?? m.mode}`);
  console.log(`  Strategy:      ${m.strategy}`);
  console.log(`  Version:       v${m.version}`);
  console.log(`  Initiated by:  ${m.initiatedBy}`);
  console.log(`  Changed at:    ${new Date(m.initiatedAt).toLocaleString()}`);
  if (m.reason) console.log(`  Reason:        ${m.reason}`);
  if (data.graceActive) {
    console.log(`  ${COLORS.yellow}Grace period:  ${Math.ceil(data.graceRemainingMs / 1000)}s remaining${COLORS.reset}`);
  }
  if (m.autoRevertAt) {
    console.log(`  Auto-revert:   ${new Date(m.autoRevertAt).toLocaleString()}`);
  }
  if (m.previousMode) {
    console.log(`  Previous mode: ${m.previousMode}`);
  }
  if (data.kvFailureCount > 0) {
    printWarn(`KV failure count: ${data.kvFailureCount}`);
  }
  console.log('');
}

function printHealth(health) {
  console.log('');
  const statusColor = health.status === 'healthy' ? COLORS.green
    : health.status === 'degraded' ? COLORS.yellow : COLORS.red;
  console.log(`  Overall: ${statusColor}${health.status.toUpperCase()}${COLORS.reset}`);
  for (const check of health.checks) {
    const icon = check.status === 'ok' ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
    console.log(`  ${icon} ${check.name.padEnd(20)} ${COLORS.dim}${check.latencyMs}ms${COLORS.reset}`);
  }
  if (health.consecutiveFailures > 0) {
    printWarn(`Consecutive failures: ${health.consecutiveFailures}`);
  }
  console.log('');
}

function printVerification(verification) {
  console.log('');
  const overallIcon = verification.passed
    ? `${COLORS.green}✓ ALL CHECKS PASSED${COLORS.reset}`
    : `${COLORS.red}✗ VERIFICATION FAILED${COLORS.reset}`;
  console.log(`  ${overallIcon}`);
  for (const r of verification.results) {
    const icon = r.passed ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
    console.log(`  ${icon} ${r.check.padEnd(30)} ${COLORS.dim}${r.detail}${COLORS.reset}`);
  }
  console.log('');
}

function printAudit(entries) {
  console.log('');
  if (entries.length === 0) {
    printInfo('No audit entries found.');
    return;
  }
  for (const e of entries) {
    const ts = new Date(e.createdAt).toLocaleString();
    const dur = e.durationMs != null ? ` ${COLORS.dim}(${Math.round(e.durationMs / 1000)}s in prev)${COLORS.reset}` : '';
    console.log(`  ${COLORS.dim}${ts}${COLORS.reset} ${COLORS.cyan}${e.action.padEnd(18)}${COLORS.reset} ${e.fromMode} → ${e.toMode}${dur}`);
    console.log(`  ${COLORS.dim}  ${e.actor} — ${e.reason}${COLORS.reset}`);
  }
  console.log('');
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function cmdStatus(baseUrl, headers) {
  printInfo('Fetching platform mode...');
  const { ok, body } = await apiGet(baseUrl, '/admin/platform-mode', headers);
  if (!ok) { printError(body.error ?? `Failed (${body.status})`); return false; }
  printMode(body);

  printInfo('Fetching health...');
  const healthRes = await apiGet(baseUrl, '/admin/platform-mode/health', headers);
  if (healthRes.ok) printHealth(healthRes.body.health);
  return true;
}

async function cmdChangeMode(baseUrl, headers, mode, opts) {
  const strategy = mode === 'shutdown' ? 'immediate' : 'phased';
  const reason = opts.reason || `CLI: switch to ${mode}`;

  const payload = { mode, strategy, reason };
  if (strategy === 'phased') payload.gracePeriodMs = opts.graceMs;
  if (opts.autoRevertMs) payload.autoRevertAfterMs = opts.autoRevertMs;

  printInfo(`Switching platform to ${MODE_BADGE[mode] ?? mode}...`);
  printInfo(`Strategy: ${strategy} | Grace: ${strategy === 'phased' ? `${opts.graceMs}ms` : 'none'}${opts.autoRevertMs ? ` | Auto-revert: ${opts.autoRevertMs}ms` : ''}`);

  const { ok, body } = await apiPut(baseUrl, '/admin/platform-mode', headers, payload);
  if (!ok) { printError(body.error ?? 'Mode change failed'); return false; }

  printSuccess(`Platform mode changed to ${mode}`);
  printMode({ mode: body.mode, graceActive: false, graceRemainingMs: 0, kvFailureCount: 0 });
  return true;
}

async function cmdRollback(baseUrl, headers, opts) {
  const reason = opts.reason || 'CLI: rollback to previous mode';
  const payload = { reason };
  if (opts.skipVerify) payload.skipReconciliation = true;

  printInfo('Rolling back platform mode...');
  const { ok, body } = await apiPost(baseUrl, '/admin/platform-mode/rollback', headers, payload);

  if (!ok) {
    printError(body.error ?? 'Rollback failed');
    if (body.verificationResults) {
      printVerification({ passed: false, results: body.verificationResults });
      printWarn('Use --skip-verify or --force to bypass verification.');
    }
    return false;
  }

  printSuccess('Rollback complete');
  printMode({ mode: body.mode, graceActive: false, graceRemainingMs: 0, kvFailureCount: 0 });
  return true;
}

async function cmdVerify(baseUrl, headers) {
  printInfo('Running recovery verification suite...');
  const { ok, body } = await apiPost(baseUrl, '/admin/platform-mode/verify', headers);
  if (!ok) { printError(body.error ?? 'Verification request failed'); return false; }
  printVerification(body.verification);
  return body.verification.passed;
}

async function cmdHealth(baseUrl, headers) {
  printInfo('Running health checks...');
  const { ok, body } = await apiGet(baseUrl, '/admin/platform-mode/health', headers);
  if (!ok) { printError(body.error ?? 'Health check failed'); return false; }
  printHealth(body.health);
  printInfo(`Current mode: ${MODE_BADGE[body.currentMode] ?? body.currentMode}`);
  console.log(`  Auto-health thresholds: readonly at ${body.autoHealthThresholds.readonlyAt} failures, shutdown at ${body.autoHealthThresholds.shutdownAt} failures, recovery at ${body.autoHealthThresholds.recoveryAt} passes`);
  return true;
}

async function cmdAudit(baseUrl, headers, limit) {
  printInfo(`Fetching last ${limit} audit entries...`);
  const { ok, body } = await apiGet(baseUrl, `/admin/platform-mode/audit-log?limit=${limit}`, headers);
  if (!ok) { printError(body.error ?? 'Audit log fetch failed'); return false; }
  printAudit(body.entries);
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);
  const validCommands = ['status', 'readonly', 'shutdown', 'activate', 'rollback', 'verify', 'health', 'audit', 'help'];

  if (opts.command === 'help' || !validCommands.includes(opts.command)) {
    console.log(`
${COLORS.bold}Kill-Switch CLI${COLORS.reset} — Platform mode control

${COLORS.cyan}Commands:${COLORS.reset}
  status                Show current mode + health
  readonly  [reason]    Switch to read-only (phased, 30s grace)
  shutdown  [reason]    Emergency shutdown (immediate)
  activate  [reason]    Restore to active
  rollback  [reason]    Rollback to previous mode
  verify                Run verification suite
  health                Health check details
  audit     [limit]     Audit log (default: 50 entries)

${COLORS.cyan}Options:${COLORS.reset}
  --grace=MS            Grace period (default: 30000)
  --auto-revert=MS      Auto-revert timer
  --skip-verify         Skip verification on recovery
  --jwt=TOKEN           Admin JWT for auth
  --token=TOKEN         Script token for auth

${COLORS.cyan}Environment:${COLORS.reset}
  ADMIN_JWT             Admin JWT (alternative to --jwt)
  KILL_SWITCH_TOKEN     Script token (alternative to --token)

${COLORS.cyan}Examples:${COLORS.reset}
  node scripts/kill-switch.mjs status
  node scripts/kill-switch.mjs readonly "Deploying hotfix" --auto-revert=900000
  node scripts/kill-switch.mjs shutdown "Security incident"
  node scripts/kill-switch.mjs rollback "All clear"
  node scripts/kill-switch.mjs activate --skip-verify
  npm run kill-switch -- status
`);
    process.exit(opts.command === 'help' ? 0 : 1);
  }

  console.log(`\n${COLORS.bold}🔑 Kill-Switch CLI${COLORS.reset}\n`);

  const baseUrl = await resolveFunctionUrl();
  const anonKey = await resolveAnonKey();
  const token = await resolveToken(baseUrl, anonKey, opts);
  const headers = buildHeaders(token, anonKey);

  let success = false;
  switch (opts.command) {
    case 'status':
      success = await cmdStatus(baseUrl, headers);
      break;
    case 'readonly':
      success = await cmdChangeMode(baseUrl, headers, 'readonly', opts);
      break;
    case 'shutdown':
      success = await cmdChangeMode(baseUrl, headers, 'shutdown', opts);
      break;
    case 'activate':
      success = await cmdChangeMode(baseUrl, headers, 'active', opts);
      break;
    case 'rollback':
      success = await cmdRollback(baseUrl, headers, opts);
      break;
    case 'verify':
      success = await cmdVerify(baseUrl, headers);
      break;
    case 'health':
      success = await cmdHealth(baseUrl, headers);
      break;
    case 'audit':
      success = await cmdAudit(baseUrl, headers, opts.limit);
      break;
  }

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  printError(err.message ?? String(err));
  process.exit(1);
});
