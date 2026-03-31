#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

function readArg(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }
  return process.argv[index + 1];
}

const base = readArg('--base', process.env.API_BASE_URL ?? '');
const expectedFunction = readArg('--expected-function', process.env.EXPECTED_FUNCTION ?? 'make-server-a1c55d7e');
const expectedFrontendContract = readArg('--expected-frontend-contract', process.env.EXPECTED_FRONTEND_CONTRACT ?? '2026-03-31-contract-v1');
const requiredApiVersion = readArg('--require-api-version', process.env.REQUIRED_API_VERSION ?? 'v2');
const requiredFeatures = readArg(
  '--require-features',
  process.env.REQUIRED_API_FEATURES ?? 'startingSnapshotV2,recordsSnapshotV2,activitySnapshotV2,compatibilityTelemetryV2',
);

const childArgs = [
  'scripts/verify-live-version.mjs',
  '--expected-function', expectedFunction,
  '--expected-frontend-contract', expectedFrontendContract,
  '--require-api-version', requiredApiVersion,
  '--require-features', requiredFeatures,
];

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