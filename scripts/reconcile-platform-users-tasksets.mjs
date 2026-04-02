import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TRUSTED_ORIGIN = 'https://steadfastworkbench.org';
const DEFAULT_MIN_TASK_SET_COUNT = 2;
const DEFAULT_DELAY_MS = 180;

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.round(parsed));
}

async function resolveFunctionUrl(repoRoot) {
  const envUrl = String(process.env.SUPABASE_FUNCTION_URL ?? '').trim();
  if (envUrl) {
    return envUrl;
  }

  const infoPath = path.join(repoRoot, 'utils', 'supabase', 'info.tsx');
  const infoSource = await readFile(infoPath, 'utf8');
  const projectIdMatch = infoSource.match(/projectId\s*=\s*"([^"]+)"/);
  if (!projectIdMatch) {
    throw new Error('Unable to resolve projectId from utils/supabase/info.tsx');
  }

  return `https://${projectIdMatch[1]}.supabase.co/functions/v1/make-server-a1c55d7e`;
}

async function resolveAnonKey(repoRoot) {
  const envKey = String(process.env.SUPABASE_ANON_KEY ?? '').trim();
  if (envKey) {
    return envKey;
  }

  const infoPath = path.join(repoRoot, 'utils', 'supabase', 'info.tsx');
  const infoSource = await readFile(infoPath, 'utf8');
  const keyMatch = infoSource.match(/publicAnonKey\s*=\s*"([^"]+)"/);
  if (!keyMatch) {
    throw new Error('Unable to resolve publicAnonKey from utils/supabase/info.tsx');
  }

  return keyMatch[1];
}

function buildHeaders({ anonKey, adminJwt, adminScriptToken }) {
  return {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    ...(adminJwt ? { 'x-user-jwt': adminJwt } : {}),
    ...(adminScriptToken ? { 'x-admin-script-token': adminScriptToken } : {}),
    Origin: TRUSTED_ORIGIN,
    'Content-Type': 'application/json',
  };
}

async function listPlatformUsers({ functionUrl, headers }) {
  const response = await fetch(`${functionUrl}/admin/platform-users`, {
    method: 'GET',
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Failed to load platform users (${response.status}): ${payload?.error ?? 'unknown error'}`);
  }

  const users = Array.isArray(payload?.users) ? payload.users : [];
  return {
    users,
    total: Number.isFinite(Number(payload?.total)) ? Number(payload.total) : users.length,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateUserTaskSetCount({ functionUrl, headers, username, minTaskSetCount }) {
  const response = await fetch(`${functionUrl}/admin/platform-users/${encodeURIComponent(username)}/task-controls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      taskSetCount: minTaskSetCount,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }

  return payload;
}

async function main() {
  const cliArgs = new Set(process.argv.slice(2));
  const forceApply = cliArgs.has('--apply');
  const forceDryRun = cliArgs.has('--dry-run');

  const repoRoot = process.cwd();
  const functionUrl = await resolveFunctionUrl(repoRoot);
  const anonKey = await resolveAnonKey(repoRoot);

  const adminScriptToken = String(process.env.SUPABASE_ADMIN_SCRIPT_TOKEN ?? '').trim();
  const adminJwt = String(process.env.SUPABASE_ADMIN_TEST_JWT ?? process.env.SUPABASE_SUB_ADMIN_TEST_JWT ?? '').trim();
  if (!adminScriptToken && !adminJwt) {
    throw new Error('Missing admin auth. Set SUPABASE_ADMIN_SCRIPT_TOKEN or SUPABASE_ADMIN_TEST_JWT or SUPABASE_SUB_ADMIN_TEST_JWT.');
  }

  const dryRunFromEnv = String(process.env.RECONCILE_DRY_RUN ?? 'true').toLowerCase() !== 'false';
  const dryRun = forceApply ? false : (forceDryRun ? true : dryRunFromEnv);
  const minTaskSetCount = Math.max(DEFAULT_MIN_TASK_SET_COUNT, toPositiveInt(process.env.RECONCILE_MIN_TASK_SET_COUNT, DEFAULT_MIN_TASK_SET_COUNT));
  const delayMs = toPositiveInt(process.env.RECONCILE_DELAY_MS, DEFAULT_DELAY_MS);

  const headers = buildHeaders({ anonKey, adminJwt, adminScriptToken });
  const initial = await listPlatformUsers({ functionUrl, headers });

  const candidates = initial.users.filter((user) => {
    const count = Number(user?.taskSetCount ?? 0);
    return Number.isFinite(count) && count < minTaskSetCount;
  });

  console.log('Platform user task-set reconciliation');
  console.log(`Function URL: ${functionUrl}`);
  console.log(`Total users: ${initial.total}`);
  console.log(`Users below minimum (${minTaskSetCount}): ${candidates.length}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);

  if (candidates.length === 0) {
    console.log('No users require reconciliation.');
    return;
  }

  if (dryRun) {
    console.log('Dry run preview (first 20 usernames):');
    candidates.slice(0, 20).forEach((user, index) => {
      const existing = Number(user?.taskSetCount ?? 0);
      console.log(`${index + 1}. ${String(user?.username ?? 'unknown')} (${existing} -> ${minTaskSetCount})`);
    });
    if (candidates.length > 20) {
      console.log(`...and ${candidates.length - 20} more`);
    }
    return;
  }

  let updated = 0;
  const failed = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const username = String(candidate?.username ?? '').trim();
    if (!username) {
      failed.push({ username: '(missing)', reason: 'Missing username in payload' });
      continue;
    }

    try {
      await updateUserTaskSetCount({
        functionUrl,
        headers,
        username,
        minTaskSetCount,
      });
      updated += 1;
    } catch (error) {
      failed.push({
        username,
        reason: error instanceof Error ? error.message : String(error),
      });
    }

    if ((index + 1) % 25 === 0 || index + 1 === candidates.length) {
      console.log(`Progress ${index + 1}/${candidates.length} | updated=${updated} failed=${failed.length}`);
    }

    if (delayMs > 0 && index + 1 < candidates.length) {
      await sleep(delayMs);
    }
  }

  const after = await listPlatformUsers({ functionUrl, headers });
  const stillBelowMinimum = after.users.filter((user) => {
    const count = Number(user?.taskSetCount ?? 0);
    return Number.isFinite(count) && count < minTaskSetCount;
  });

  console.log('\nReconciliation summary');
  console.log(JSON.stringify({
    totalUsers: after.total,
    attempted: candidates.length,
    updated,
    failed: failed.length,
    stillBelowMinimum: stillBelowMinimum.length,
    minTaskSetCount,
  }, null, 2));

  if (failed.length > 0) {
    console.log('\nFailures (first 20):');
    failed.slice(0, 20).forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.username}: ${entry.reason}`);
    });
  }

  if (stillBelowMinimum.length > 0) {
    console.error(`Reconciliation incomplete: ${stillBelowMinimum.length} users still below ${minTaskSetCount}.`);
    process.exit(1);
  }

  if (failed.length > 0) {
    console.error(`Reconciliation completed with failures: ${failed.length} failed updates.`);
    process.exit(1);
  }

  console.log('Reconciliation complete: all users now meet minimum task-set count.');
}

main().catch((error) => {
  console.error('Reconciliation failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
