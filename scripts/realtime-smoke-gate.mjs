#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const isCi = String(process.env.CI ?? '').toLowerCase() === 'true';
const requiredFlag = String(process.env.REALTIME_SMOKE_REQUIRED ?? '').toLowerCase() === 'true';
const explicitRun = String(process.env.RUN_REALTIME_SMOKE_LOCAL ?? '').toLowerCase() === 'true';

if (!isCi && !requiredFlag && !explicitRun) {
  console.log('Realtime smoke gate: skipped outside CI. Set RUN_REALTIME_SMOKE_LOCAL=true to force local execution.');
  process.exit(0);
}

const result = spawnSync('node', ['scripts/realtime-smoke-test.mjs'], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(`Realtime smoke gate failed to launch: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
