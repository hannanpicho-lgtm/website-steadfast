import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TRUSTED_ORIGIN = 'https://steadfastworkbench.org';
const isCi = String(process.env.CI ?? '').toLowerCase() === 'true';
const enforceFlag = String(process.env.ENFORCE_ADMIN_PLATFORM_USERS_GUARD ?? '').toLowerCase() === 'true';

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

function parseCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function probePlatformUsers({ functionUrl, anonKey, jwt, label }) {
  const startedAt = Date.now();
  const response = await fetch(`${functionUrl}/admin/platform-users`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'x-user-jwt': jwt,
      Origin: TRUSTED_ORIGIN,
    },
  });
  const elapsedMs = Date.now() - startedAt;

  let payload = null;
  let payloadPreview = '';
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!payload) {
    try {
      const text = await response.text();
      payloadPreview = text.slice(0, 240).replace(/\s+/g, ' ').trim();
    } catch {
      payloadPreview = '';
    }
  }

  return {
    label,
    status: response.status,
    elapsedMs,
    payload,
    payloadPreview,
  };
}

async function main() {
  const repoRoot = process.cwd();
  const functionUrl = await resolveFunctionUrl(repoRoot);
  const anonKey = await resolveAnonKey(repoRoot);

  const adminJwt = String(process.env.SUPABASE_ADMIN_TEST_JWT ?? '').trim();
  const subAdminJwt = String(process.env.SUPABASE_SUB_ADMIN_TEST_JWT ?? '').trim();

  if (!adminJwt && !subAdminJwt) {
    if (isCi || enforceFlag) {
      console.error('Missing JWT(s): set SUPABASE_SUB_ADMIN_TEST_JWT (preferred) or SUPABASE_ADMIN_TEST_JWT.');
      process.exit(1);
    }

    console.log('Skipping admin platform-users regression guard outside CI (no JWT provided).');
    process.exit(0);
  }

  const maxResponseMs = Math.max(2000, Number(process.env.ADMIN_PLATFORM_USERS_MAX_RESPONSE_MS ?? '12000'));
  const expectedUsernames = new Set(parseCsv(process.env.ADMIN_SCOPE_EXPECT_USERNAMES));
  const minExpectedTotal = Number(process.env.ADMIN_SCOPE_MIN_TOTAL ?? '0');

  const probes = [];
  if (subAdminJwt) {
    probes.push({ label: 'sub-admin', jwt: subAdminJwt });
  } else if (adminJwt) {
    probes.push({ label: 'admin-fallback', jwt: adminJwt });
    console.log('Warning: SUPABASE_SUB_ADMIN_TEST_JWT not set; using SUPABASE_ADMIN_TEST_JWT fallback.');
  }

  let failed = 0;
  console.log('Admin platform-users regression guard');
  console.log(`Function URL: ${functionUrl}`);

  for (const probe of probes) {
    const result = await probePlatformUsers({
      functionUrl,
      anonKey,
      jwt: probe.jwt,
      label: probe.label,
    });

    const users = Array.isArray(result.payload?.users) ? result.payload.users : [];
    const total = Number(result.payload?.total ?? users.length);
    const usernames = new Set(
      users
        .map((user) => (typeof user?.username === 'string' ? user.username : ''))
        .filter(Boolean),
    );

    const hasShape = Array.isArray(result.payload?.users)
      && typeof result.payload?.scoped === 'boolean'
      && Number.isFinite(total);
    const isStatusOk = result.status === 200;
    const withinBudget = result.elapsedMs <= maxResponseMs;
    const usernamesMatch = expectedUsernames.size === 0
      || Array.from(expectedUsernames).every((username) => usernames.has(username));
    const totalMatches = !Number.isFinite(minExpectedTotal) || minExpectedTotal <= 0 || total >= minExpectedTotal;

    const pass = isStatusOk && hasShape && withinBudget && usernamesMatch && totalMatches;

    if (!pass) {
      failed += 1;
    }

    const reasons = [];
    if (!isStatusOk) reasons.push(`status=${result.status}`);
    if (!hasShape) reasons.push('invalid-shape');
    if (!withinBudget) reasons.push(`slow=${result.elapsedMs}ms>${maxResponseMs}ms`);
    if (!usernamesMatch) reasons.push('missing-expected-usernames');
    if (!totalMatches) reasons.push(`total=${total}<${minExpectedTotal}`);

    console.log(
      `${pass ? 'PASS' : 'FAIL'} ${probe.label} /admin/platform-users`
      + ` -> status=${result.status} elapsed=${result.elapsedMs}ms total=${total}`
      + (reasons.length ? ` | ${reasons.join(', ')}` : ''),
    );

    if (!pass) {
      if (result.payload) {
        console.log(`Payload preview: ${JSON.stringify(result.payload).slice(0, 320)}`);
      } else if (result.payloadPreview) {
        console.log(`Payload preview: ${result.payloadPreview}`);
      }
    }
  }

  if (failed > 0) {
    console.error(`\nAdmin platform-users regression guard failed (${failed} probe(s)).`);
    process.exit(1);
  }

  console.log('\nAdmin platform-users regression guard passed.');
}

main().catch((error) => {
  console.error('Admin platform-users regression guard crashed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
