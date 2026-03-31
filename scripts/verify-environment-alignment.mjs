#!/usr/bin/env node

import { assertProjectRef } from './shared/resolve-runtime-env.mjs';

function readArg(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }
  return process.argv[index + 1];
}

const expectedProjectRef = readArg('--project-ref', process.env.SUPABASE_PROJECT_REF ?? '').trim();

const env = await assertProjectRef(expectedProjectRef);
console.log(JSON.stringify({
  ok: true,
  projectRef: env.projectRef,
  functionName: env.functionName,
  apiBaseUrl: env.apiBaseUrl,
}, null, 2));
