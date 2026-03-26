#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function readArg(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }
  return String(process.argv[index + 1] ?? fallback);
}

function redactValue(value) {
  if (!value) {
    return null;
  }

  const text = String(value);
  if (text.length <= 8) {
    return `${'*'.repeat(Math.max(0, text.length - 2))}${text.slice(-2)}`;
  }

  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

async function fetchVersion(baseUrl, anonKey, trustedOrigin) {
  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/version`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Origin: trustedOrigin,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);
  return {
    status: response.status,
    ok: response.ok,
    payload,
  };
}

async function main() {
  const repoRoot = process.cwd();
  const timestamp = new Date().toISOString();
  const phase = readArg('--phase', 'unknown');
  const projectRef = readArg('--project-ref', process.env.SUPABASE_PROJECT_REF ?? '');
  const functionName = readArg('--function-name', process.env.SUPABASE_FUNCTION_NAME ?? '');
  const baseUrl = readArg('--base-url', process.env.API_BASE_URL ?? '');
  const trustedOrigin = readArg('--trusted-origin', process.env.TRUSTED_ORIGIN ?? 'https://steadfastworkbench.org');
  const anonKey = String(process.env.SUPABASE_ANON_KEY ?? '');

  const requiredKeys = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CORS_ALLOWED_ORIGINS',
    'APP_ENV',
    'ENVIRONMENT',
    'NODE_ENV',
    'DEPLOY_COMMIT_SHA',
    'DEPLOY_COMMIT_SHORT',
    'DEPLOYED_AT_UTC',
  ];

  const envSnapshot = {};
  for (const key of requiredKeys) {
    const raw = process.env[key];
    envSnapshot[key] = {
      present: typeof raw === 'string' && raw.length > 0,
      length: typeof raw === 'string' ? raw.length : 0,
      valuePreview: /KEY|TOKEN|SECRET|PASSWORD/i.test(key) ? redactValue(raw) : (raw ?? null),
    };
  }

  const versionProbe = await fetchVersion(baseUrl, anonKey, trustedOrigin).catch((error) => ({
    ok: false,
    status: 0,
    payload: { error: error instanceof Error ? error.message : String(error) },
  }));

  const reportsDir = path.join(repoRoot, 'deployment_reports', 'supabase');
  await mkdir(reportsDir, { recursive: true });

  const safePhase = phase.replace(/[^a-z0-9_-]/gi, '_');
  const fileStamp = timestamp.replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `env_audit_${safePhase}_${fileStamp}.json`);

  const report = {
    timestampUtc: timestamp,
    phase,
    projectRef,
    functionName,
    baseUrl: baseUrl || null,
    trustedOrigin,
    envSnapshot,
    versionProbe,
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(reportPath);
}

main().catch((error) => {
  console.error('record-deploy-env failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
