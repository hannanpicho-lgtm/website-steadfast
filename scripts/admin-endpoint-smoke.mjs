import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TRUSTED_ORIGIN = 'https://steadfastworkbench.org';

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

async function probe(url, headers) {
  const response = await fetch(url, { method: 'GET', headers });
  let payload = '';
  try {
    payload = await response.text();
  } catch {
    payload = '';
  }

  return {
    status: response.status,
    payloadPreview: payload.slice(0, 180).replace(/\s+/g, ' ').trim(),
  };
}

async function main() {
  const repoRoot = process.cwd();
  const functionUrl = await resolveFunctionUrl(repoRoot);
  const anonKey = await resolveAnonKey(repoRoot);

  const headers = {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    Origin: TRUSTED_ORIGIN,
  };

  const routes = [
    '/admin/kv-config-version-status',
    '/admin/rewards-config',
    '/admin/users?limit=1',
    '/cs/admin/chats',
  ];

  console.log('Admin endpoint smoke (anti-500 regression)');
  console.log(`Function URL: ${functionUrl}`);

  let failed = 0;

  for (const route of routes) {
    const result = await probe(`${functionUrl}${route}`, headers);
    const isServerError = result.status >= 500;
    const isUnexpectedStatus = ![200, 401, 403, 404].includes(result.status);
    const pass = !isServerError && !isUnexpectedStatus;

    if (!pass) {
      failed += 1;
    }

    console.log(
      `${pass ? 'PASS' : 'FAIL'} ${route} -> ${result.status}${result.payloadPreview ? ` | ${result.payloadPreview}` : ''}`,
    );
  }

  if (failed > 0) {
    console.error(`\nAdmin endpoint smoke failed (${failed} route(s)).`);
    process.exit(1);
  }

  console.log('\nAdmin endpoint smoke passed.');
}

main().catch((error) => {
  console.error('Admin endpoint smoke crashed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
