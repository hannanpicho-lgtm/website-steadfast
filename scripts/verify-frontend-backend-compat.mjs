#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { assertProjectRef } from './shared/resolve-runtime-env.mjs';

function readArg(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }
  return process.argv[index + 1];
}

const resolvedEnv = await assertProjectRef(readArg('--project-ref', process.env.SUPABASE_PROJECT_REF ?? '').trim());
const base = readArg('--base', process.env.API_BASE_URL ?? resolvedEnv.apiBaseUrl);
const expectedFunction = readArg('--expected-function', process.env.EXPECTED_FUNCTION ?? resolvedEnv.functionName);
const expectedFrontendContract = readArg('--expected-frontend-contract', process.env.EXPECTED_FRONTEND_CONTRACT ?? resolvedEnv.frontendContractVersion);
const expectedCommit = readArg('--expected-commit', process.env.EXPECTED_COMMIT_SHA ?? '').trim();
const requiredApiVersion = readArg('--require-api-version', process.env.REQUIRED_API_VERSION ?? 'v2');
const requiredFeatures = readArg(
  '--require-features',
  process.env.REQUIRED_API_FEATURES ?? 'startingSnapshotV2,recordsSnapshotV2,activitySnapshotV2,compatibilityTelemetryV2',
);
const expectedProjectRef = readArg('--project-ref', process.env.SUPABASE_PROJECT_REF ?? '').trim();
if (expectedProjectRef) {
  await assertProjectRef(expectedProjectRef);
}

const childArgs = [
  'scripts/verify-live-version.mjs',
  '--expected-function', expectedFunction,
  '--expected-frontend-contract', expectedFrontendContract,
  '--require-api-version', requiredApiVersion,
  '--require-features', requiredFeatures,
];

if (expectedCommit) {
  childArgs.push('--expected-commit', expectedCommit);
}

if (base) {
  childArgs.push('--base', base);
}

const result = spawnSync(process.execPath, childArgs, {
  stdio: 'inherit',
});

if (typeof result.status === 'number' && result.status !== 0) {
  process.exit(result.status);
}

console.log('[FRONTEND-COMPAT] Backend compatibility gate passed. Frontend deploy may proceed.');