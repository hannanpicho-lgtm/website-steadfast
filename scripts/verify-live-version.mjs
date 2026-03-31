#!/usr/bin/env node

import { resolveRuntimeEnvironment } from './shared/resolve-runtime-env.mjs';

function readArg(flag, fallback = '') {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) {
    return fallback;
  }
  return process.argv[i + 1];
}

const runtimeEnv = await resolveRuntimeEnvironment();
const base = readArg('--base', process.env.API_BASE_URL ?? runtimeEnv.apiBaseUrl).replace(/\/$/, '');
const expectedFunction = readArg('--expected-function', runtimeEnv.functionName);
const expectedCommit = readArg('--expected-commit', process.env.EXPECTED_COMMIT_SHA ?? '').trim().toLowerCase();
const maxAgeMinutes = Number(readArg('--max-age-minutes', process.env.MAX_DEPLOY_AGE_MINUTES ?? '240'));
const anonKey = process.env.SUPABASE_ANON_KEY ?? runtimeEnv.anonKey;
const trustedOrigin = readArg('--trusted-origin', process.env.TRUSTED_ORIGIN ?? 'https://steadfastworkbench.org').trim();
const verifyRouteHealthArg = readArg('--verify-route-health', process.env.VERIFY_ROUTE_HEALTH ?? 'false').toLowerCase();
const verifyRouteHealth = verifyRouteHealthArg === 'true' || verifyRouteHealthArg === '1';
const adminJwt = String(process.env.SUPABASE_ADMIN_TEST_JWT ?? '').trim();
const expectedFrontendContract = readArg('--expected-frontend-contract', process.env.EXPECTED_FRONTEND_CONTRACT ?? '').trim();
const requiredApiVersion = readArg('--require-api-version', process.env.REQUIRED_API_VERSION ?? '').trim().toLowerCase();
const requiredFeatures = readArg('--require-features', process.env.REQUIRED_API_FEATURES ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
// --fail-on-stale: exit 1 if live version reports stale=true (default: true when --expected-commit provided)
const failOnStaleArg = readArg('--fail-on-stale', '');
const failOnStale = failOnStaleArg === '' ? Boolean(expectedCommit) : failOnStaleArg !== 'false' && failOnStaleArg !== '0';

async function verifyRouteHealthChecks() {
  const baseHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Origin: trustedOrigin,
    'Content-Type': 'application/json',
  };

  const checks = [
    {
      path: '/admin/kv-config-version-status',
      expectedWithoutAdminJwt: [401],
      expectedWithAdminJwt: [200],
    },
    {
      path: '/admin/rewards-config',
      expectedWithoutAdminJwt: [401],
      expectedWithAdminJwt: [200],
    },
    {
      path: '/cs/admin/chats',
      expectedWithoutAdminJwt: [401],
      expectedWithAdminJwt: [200],
    },
    {
      path: '/cs/support-links',
      expectedWithoutAdminJwt: [200],
      expectedWithAdminJwt: [200],
    },
  ];

  const routeResults = [];

  for (const check of checks) {
    const headers = {
      ...baseHeaders,
      ...(adminJwt ? { 'x-user-jwt': adminJwt } : {}),
    };

    const res = await fetch(`${base}${check.path}`, {
      method: 'GET',
      headers,
    });
    const body = await res.text().catch(() => '');
    const expectedStatuses = adminJwt ? check.expectedWithAdminJwt : check.expectedWithoutAdminJwt;

    if (res.status >= 500) {
      throw new Error(`Route health failed: ${check.path} returned ${res.status} (server error)`);
    }

    if (!expectedStatuses.includes(res.status)) {
      throw new Error(
        `Route health failed: ${check.path} returned ${res.status}, expected one of [${expectedStatuses.join(', ')}]`,
      );
    }

    routeResults.push({
      path: check.path,
      status: res.status,
      expected: expectedStatuses,
      bodyPreview: body.slice(0, 140).replace(/\s+/g, ' ').trim(),
    });
  }

  return routeResults;
}

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
  const api = payload.api && typeof payload.api === 'object' ? payload.api : {};
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

  if (failOnStale && version.stale === true) {
    throw new Error(
      `Deployment appears stale (stale=true, age=${deploymentAgeMinutes ?? 'unknown'}m, threshold=${version.staleThresholdMinutes ?? 'unknown'}m). ` +
      `Use --fail-on-stale=false to suppress this check.`,
    );
  }

  if (expectedFrontendContract) {
    const minimumFrontendContract = typeof api.minimumFrontendContractVersion === 'string'
      ? api.minimumFrontendContractVersion
      : '';
    if (minimumFrontendContract && minimumFrontendContract !== expectedFrontendContract) {
      throw new Error(
        `Frontend contract mismatch: expected minimum '${expectedFrontendContract}', got '${minimumFrontendContract || '<missing>'}'`,
      );
    }
  }

  if (requiredApiVersion) {
    const supportedVersions = Array.isArray(api.supportedVersions) ? api.supportedVersions.map((value) => String(value)) : [];
    if (!supportedVersions.includes(requiredApiVersion)) {
      throw new Error(`Required API version '${requiredApiVersion}' is not supported by live backend.`);
    }
  }

  if (requiredFeatures.length > 0) {
    const features = api.features && typeof api.features === 'object' ? api.features : {};
    for (const featureName of requiredFeatures) {
      const feature = features[featureName];
      if (!feature || feature.enabled !== true) {
        throw new Error(`Required feature '${featureName}' is not enabled in live backend version contract.`);
      }
    }
  }

  const summary = {
    status: payload.status,
    service: version.service,
    deploymentId: version.deploymentId ?? null,
    commitSha: version.commitSha ?? null,
    deployedAtUtc: version.deployedAtUtc ?? null,
    deploymentAgeMinutes: Number.isFinite(deploymentAgeMinutes) ? deploymentAgeMinutes : null,
    stale: Boolean(version.stale),
    api: {
      defaultVersion: typeof api.defaultVersion === 'string' ? api.defaultVersion : null,
      supportedVersions: Array.isArray(api.supportedVersions) ? api.supportedVersions : [],
      minimumFrontendContractVersion: typeof api.minimumFrontendContractVersion === 'string' ? api.minimumFrontendContractVersion : null,
      stage: typeof api.stage === 'string' ? api.stage : null,
      environment: typeof api.environment === 'string' ? api.environment : null,
      features: api.features && typeof api.features === 'object' ? api.features : {},
    },
  };

  if (verifyRouteHealth) {
    summary.routeHealth = await verifyRouteHealthChecks();
    summary.routeHealthUsedAdminJwt = Boolean(adminJwt);
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
});
