#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const INFO_FILE = path.join(REPO_ROOT, 'utils', 'supabase', 'info.tsx');
const ENV_CONFIG_FILE = path.join(REPO_ROOT, 'utils', 'environment', 'config.ts');

function extractString(source, pattern, label) {
  const match = source.match(pattern);
  if (!match || !match[1]) {
    throw new Error(`Unable to resolve ${label}`);
  }
  return match[1];
}

export async function resolveRuntimeEnvironment() {
  const [infoSource, envConfigSource] = await Promise.all([
    readFile(INFO_FILE, 'utf8'),
    readFile(ENV_CONFIG_FILE, 'utf8'),
  ]);

  const projectRef = extractString(infoSource, /projectId\s*=\s*"([a-z0-9-]+)"/, 'Supabase project ref');
  const anonKey = extractString(infoSource, /publicAnonKey\s*=\s*"([^"]+)"/, 'Supabase anon key');
  const functionName = extractString(envConfigSource, /FUNCTION_SERVICE_NAME\s*=\s*'([^']+)'/, 'function service name');
  const frontendContractVersion = extractString(envConfigSource, /FRONTEND_CONTRACT_VERSION\s*=\s*'([^']+)'/, 'frontend contract version');

  return {
    projectRef,
    anonKey,
    functionName,
    frontendContractVersion,
    apiBaseUrl: `https://${projectRef}.supabase.co/functions/v1/${functionName}`,
  };
}

export async function assertProjectRef(expectedProjectRef) {
  const env = await resolveRuntimeEnvironment();
  if (expectedProjectRef && expectedProjectRef !== env.projectRef) {
    throw new Error(
      `Project ref mismatch: deploy target '${expectedProjectRef}' does not match frontend runtime project '${env.projectRef}'.`,
    );
  }
  return env;
}
