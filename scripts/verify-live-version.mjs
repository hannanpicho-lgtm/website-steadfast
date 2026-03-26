#!/usr/bin/env node

const DEFAULT_PROJECT_REF = 'gvqwvuqeenkusdayosty';
const DEFAULT_FUNCTION = 'make-server-a1c55d7e';
const DEFAULT_BASE = `https://${DEFAULT_PROJECT_REF}.supabase.co/functions/v1/${DEFAULT_FUNCTION}`;
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A';

function readArg(flag, fallback = '') {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) {
    return fallback;
  }
  return process.argv[i + 1];
}

const base = readArg('--base', process.env.API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
const expectedFunction = readArg('--expected-function', DEFAULT_FUNCTION);
const expectedCommit = readArg('--expected-commit', process.env.EXPECTED_COMMIT_SHA ?? '').trim().toLowerCase();
const maxAgeMinutes = Number(readArg('--max-age-minutes', process.env.MAX_DEPLOY_AGE_MINUTES ?? '240'));
const anonKey = process.env.SUPABASE_ANON_KEY ?? DEFAULT_ANON_KEY;

async function main() {
  const res = await fetch(`${base}/version`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload || typeof payload !== 'object') {
    throw new Error(`Version endpoint failed with status ${res.status}`);
  }

  const version = payload.version;
  if (!version || typeof version !== 'object') {
    throw new Error('Version endpoint returned malformed payload: missing version object');
  }

  if (version.service !== expectedFunction) {
    throw new Error(`Function mismatch: expected '${expectedFunction}', got '${String(version.service)}'`);
  }

  const commitSha = typeof version.commitSha === 'string' ? version.commitSha.toLowerCase() : '';
  if (expectedCommit && commitSha !== expectedCommit) {
    throw new Error(`Commit mismatch: expected ${expectedCommit}, got ${commitSha || '<missing>'}`);
  }

  const deploymentAgeMinutes = Number(version.deploymentAgeMinutes);
  if (Number.isFinite(maxAgeMinutes) && Number.isFinite(deploymentAgeMinutes) && deploymentAgeMinutes > maxAgeMinutes) {
    throw new Error(`Deployment too old: age=${deploymentAgeMinutes}m exceeds max=${maxAgeMinutes}m`);
  }

  const summary = {
    status: payload.status,
    service: version.service,
    deploymentId: version.deploymentId ?? null,
    commitSha: version.commitSha ?? null,
    deployedAtUtc: version.deployedAtUtc ?? null,
    deploymentAgeMinutes: Number.isFinite(deploymentAgeMinutes) ? deploymentAgeMinutes : null,
    stale: Boolean(version.stale),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
});
