import { FUNCTION_SERVICE_NAME } from '@utils/environment/config';
import { RUNTIME_ENVIRONMENT } from './runtimeEnvironment';

export type ApiVersion = 'v1' | 'v2';
export type CompatibilityFeatureName = 'startingSnapshotV2' | 'recordsSnapshotV2' | 'activitySnapshotV2' | 'compatibilityTelemetryV2';

export const FRONTEND_APP_VERSION = RUNTIME_ENVIRONMENT.frontendAppVersion;
export const FRONTEND_CONTRACT_VERSION = RUNTIME_ENVIRONMENT.frontendContractVersion;
export const FRONTEND_SUPPORTED_API_VERSIONS: ApiVersion[] = ['v1', 'v2'];

const EXPECTED_SERVICE = FUNCTION_SERVICE_NAME;
const BASE_URL = RUNTIME_ENVIRONMENT.apiBaseUrl;
const COMPATIBILITY_CACHE_KEY = `compatibility:${FRONTEND_CONTRACT_VERSION}:${EXPECTED_SERVICE}`;
const COMPATIBILITY_CACHE_TTL_MS = 30 * 1000;

type CompatibilityFeatureState = {
  enabled: boolean;
  apiVersion: ApiVersion;
  versionedPath: string;
  legacyPath: string | null;
  description: string;
};

export type ApiCompatibilityState = {
  service: string;
  frontendAppVersion: string;
  frontendContractVersion: string;
  supportedApiVersions: ApiVersion[];
  defaultApiVersion: ApiVersion;
  minimumFrontendContractVersion: string | null;
  frontendCompatible: boolean;
  environment: string;
  stage: string;
  stale: boolean;
  features: Record<CompatibilityFeatureName, CompatibilityFeatureState>;
};

type CompatibilityEvent = {
  event: 'endpoint_failure' | 'fallback_used' | 'version_mismatch';
  feature?: CompatibilityFeatureName | null;
  endpoint?: string | null;
  expectedApiVersion?: ApiVersion | null;
  status?: number | null;
  reason?: string | null;
  detail?: Record<string, unknown>;
};

const DEFAULT_FEATURES: Record<CompatibilityFeatureName, CompatibilityFeatureState> = {
  startingSnapshotV2: {
    enabled: false,
    apiVersion: 'v2',
    versionedPath: '/v2/me/starting-snapshot',
    legacyPath: null,
    description: 'Versioned starting page snapshot endpoint',
  },
  recordsSnapshotV2: {
    enabled: false,
    apiVersion: 'v2',
    versionedPath: '/v2/me/records-snapshot',
    legacyPath: null,
    description: 'Versioned records page snapshot endpoint',
  },
  activitySnapshotV2: {
    enabled: false,
    apiVersion: 'v2',
    versionedPath: '/v2/me/activity-snapshot',
    legacyPath: null,
    description: 'Versioned activity page snapshot endpoint',
  },
  compatibilityTelemetryV2: {
    enabled: false,
    apiVersion: 'v2',
    versionedPath: '/v2/client/compatibility-events',
    legacyPath: '/client/compatibility-events',
    description: 'Client compatibility telemetry ingestion endpoint',
  },
};

type CachedCompatibilityEnvelope = {
  timestamp: number;
  payload: ApiCompatibilityState;
};

let compatibilityPromise: Promise<ApiCompatibilityState> | null = null;
let mismatchReported = false;
const fallbackReportSet = new Set<string>();

function readCompatibilityCache(): ApiCompatibilityState | null {
  try {
    const raw = sessionStorage.getItem(COMPATIBILITY_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedCompatibilityEnvelope;
    if (!parsed || typeof parsed.timestamp !== 'number' || !parsed.payload) {
      return null;
    }

    if (Date.now() - parsed.timestamp > COMPATIBILITY_CACHE_TTL_MS) {
      sessionStorage.removeItem(COMPATIBILITY_CACHE_KEY);
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
}

function writeCompatibilityCache(payload: ApiCompatibilityState): void {
  try {
    sessionStorage.setItem(COMPATIBILITY_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      payload,
    } satisfies CachedCompatibilityEnvelope));
  } catch {
    // Compatibility cache should never block page use.
  }
}

function normalizeApiVersion(value: unknown, fallback: ApiVersion): ApiVersion {
  return value === 'v2' ? 'v2' : fallback;
}

function parseCompatibilityState(body: any): ApiCompatibilityState {
  const version = body?.version && typeof body.version === 'object' ? body.version : {};
  const api = body?.api && typeof body.api === 'object' ? body.api : {};
  const rawSupportedVersions = Array.isArray(api.supportedVersions) ? api.supportedVersions : ['v1'];
  const supportedApiVersions = rawSupportedVersions.includes('v2') ? ['v1', 'v2'] as ApiVersion[] : ['v1'];
  const defaultApiVersion = normalizeApiVersion(api.defaultVersion, 'v1');
  const rawFeatures = api.features && typeof api.features === 'object' ? api.features : {};

  const features = Object.entries(DEFAULT_FEATURES).reduce((acc, [featureName, fallbackValue]) => {
    const parsed = rawFeatures[featureName] && typeof rawFeatures[featureName] === 'object'
      ? rawFeatures[featureName]
      : {};
    acc[featureName as CompatibilityFeatureName] = {
      enabled: parsed.enabled === true,
      apiVersion: normalizeApiVersion(parsed.apiVersion, fallbackValue.apiVersion),
      versionedPath: typeof parsed.versionedPath === 'string' && parsed.versionedPath
        ? parsed.versionedPath
        : fallbackValue.versionedPath,
      legacyPath: typeof parsed.legacyPath === 'string'
        ? parsed.legacyPath
        : fallbackValue.legacyPath,
      description: typeof parsed.description === 'string' && parsed.description
        ? parsed.description
        : fallbackValue.description,
    };
    return acc;
  }, {} as Record<CompatibilityFeatureName, CompatibilityFeatureState>);

  const minimumFrontendContractVersion = typeof api.minimumFrontendContractVersion === 'string'
    ? api.minimumFrontendContractVersion
    : null;
  const frontendCompatible = !minimumFrontendContractVersion || minimumFrontendContractVersion === FRONTEND_CONTRACT_VERSION;

  return {
    service: typeof version.service === 'string' && version.service ? version.service : EXPECTED_SERVICE,
    frontendAppVersion: FRONTEND_APP_VERSION,
    frontendContractVersion: FRONTEND_CONTRACT_VERSION,
    supportedApiVersions,
    defaultApiVersion,
    minimumFrontendContractVersion,
    frontendCompatible,
    environment: typeof api.environment === 'string' && api.environment ? api.environment : 'unknown',
    stage: typeof api.stage === 'string' && api.stage ? api.stage : 'unknown',
    stale: version.stale === true,
    features,
  };
}

export function getLegacyApiUrl(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getVersionedApiUrl(apiVersion: ApiVersion, path: string): string {
  return `${BASE_URL}/${apiVersion}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizeAdvertisedFeaturePath(path: string): string {
  if (path.startsWith(`/${EXPECTED_SERVICE}/`)) {
    return path.slice(EXPECTED_SERVICE.length + 1);
  }
  return path;
}

export async function getApiCompatibilityState(force = false): Promise<ApiCompatibilityState> {
  if (!force) {
    const cached = readCompatibilityCache();
    if (cached) {
      return cached;
    }
    if (compatibilityPromise) {
      return compatibilityPromise;
    }
  }

  compatibilityPromise = (async () => {
    const versionUrl = getLegacyApiUrl('/version');
    console.log('[compat] fetching /version from:', versionUrl);
    const t0 = performance.now();
    const response = await fetch(versionUrl, {
      headers: {
        apikey: RUNTIME_ENVIRONMENT.publicAnonKey,
        Authorization: `Bearer ${RUNTIME_ENVIRONMENT.publicAnonKey}`,
        'x-client-app-version': FRONTEND_APP_VERSION,
        'x-client-contract-version': FRONTEND_CONTRACT_VERSION,
        'x-client-supported-api-versions': FRONTEND_SUPPORTED_API_VERSIONS.join(','),
      },
    });
    const payload = await response.json().catch(() => ({}));
    console.log('[compat] /version status:', response.status, 'time:', Math.round(performance.now() - t0), 'ms');
    if (!response.ok) {
      throw new Error(`Version endpoint returned ${response.status}`);
    }

    const parsed = parseCompatibilityState(payload);
    console.log('[compat] parsed: frontendCompatible=', parsed.frontendCompatible,
      'supportedVersions=', parsed.supportedApiVersions,
      'features=', Object.entries(parsed.features).map(([k, v]) => `${k}:${(v as any).enabled}`).join(', '));
    writeCompatibilityCache(parsed);

    if (!parsed.frontendCompatible && !mismatchReported) {
      mismatchReported = true;
      void reportClientCompatibilityEvent({
        event: 'version_mismatch',
        expectedApiVersion: parsed.defaultApiVersion,
        reason: 'frontend_contract_mismatch',
        detail: {
          minimumFrontendContractVersion: parsed.minimumFrontendContractVersion,
          frontendContractVersion: FRONTEND_CONTRACT_VERSION,
        },
      });
    }

    return parsed;
  })();

  try {
    return await compatibilityPromise;
  } finally {
    compatibilityPromise = null;
  }
}

export async function warmApiCompatibilityState(): Promise<void> {
  await getApiCompatibilityState(false).catch(() => undefined);
}

export async function resolveFeatureEndpoint(
  featureName: CompatibilityFeatureName,
  fallbackPath: string,
): Promise<{ url: string; usingFallback: boolean; expectedApiVersion: ApiVersion; reason: string | null; state: ApiCompatibilityState }> {
  console.log('[compat] resolveFeatureEndpoint:', featureName);
  const state = await getApiCompatibilityState(false);
  const feature = state.features[featureName] ?? DEFAULT_FEATURES[featureName];
  console.log('[compat] feature state:', featureName, 'enabled=', feature.enabled, 'apiVersion=', feature.apiVersion,
    'frontendCompatible=', state.frontendCompatible, 'supportedVersions=', state.supportedApiVersions);

  if (!state.frontendCompatible) {
    const reason = 'frontend_contract_mismatch';
    console.warn('[compat] FALLBACK:', featureName, 'reason=', reason);
    const dedupeKey = `${featureName}:${reason}`;
    if (!fallbackReportSet.has(dedupeKey)) {
      fallbackReportSet.add(dedupeKey);
      void reportClientCompatibilityEvent({
        event: 'fallback_used',
        feature: featureName,
        expectedApiVersion: feature.apiVersion,
        reason,
      });
    }
    return {
        url: getLegacyApiUrl(fallbackPath),
      usingFallback: true,
      expectedApiVersion: state.defaultApiVersion,
      reason,
      state,
    };
  }

  if (!feature.enabled || !state.supportedApiVersions.includes(feature.apiVersion)) {
    const reason = feature.enabled ? 'backend_api_version_unsupported' : 'feature_disabled';
    const dedupeKey = `${featureName}:${reason}`;
    if (!fallbackReportSet.has(dedupeKey)) {
      fallbackReportSet.add(dedupeKey);
      void reportClientCompatibilityEvent({
        event: 'fallback_used',
        feature: featureName,
        expectedApiVersion: feature.apiVersion,
        reason,
      });
    }
    return {
      url: getLegacyApiUrl(fallbackPath),
      usingFallback: true,
      expectedApiVersion: state.defaultApiVersion,
      reason,
      state,
    };
  }

  const v2Url = `${BASE_URL}${normalizeAdvertisedFeaturePath(feature.versionedPath)}`;
  console.log('[compat] V2 resolved:', featureName, 'url=', v2Url);
  return {
    url: v2Url,
    usingFallback: false,
    expectedApiVersion: feature.apiVersion,
    reason: null,
    state,
  };
}

export async function reportClientCompatibilityEvent(input: CompatibilityEvent): Promise<void> {
  try {
    await fetch(getLegacyApiUrl('/client/compatibility-events'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        apikey: RUNTIME_ENVIRONMENT.publicAnonKey,
        Authorization: `Bearer ${RUNTIME_ENVIRONMENT.publicAnonKey}`,
        'x-client-app-version': FRONTEND_APP_VERSION,
        'x-client-contract-version': FRONTEND_CONTRACT_VERSION,
        'x-client-supported-api-versions': FRONTEND_SUPPORTED_API_VERSIONS.join(','),
        ...(input.expectedApiVersion ? { 'x-client-expected-api-version': input.expectedApiVersion } : {}),
      },
      body: JSON.stringify({
        event: input.event,
        feature: input.feature ?? null,
        endpoint: input.endpoint ?? null,
        expectedApiVersion: input.expectedApiVersion ?? null,
        status: input.status ?? null,
        reason: input.reason ?? null,
        detail: input.detail ?? null,
      }),
    });
  } catch {
    // Compatibility telemetry is best-effort only.
  }
}

export function buildUserScopedCacheKey(baseKey: string, username: string | null | undefined, apiVersion: ApiVersion = 'v1'): string {
  const normalizedUser = typeof username === 'string' && username.trim()
    ? username.trim().toLowerCase()
    : 'anonymous';
  return `cache:${FRONTEND_CONTRACT_VERSION}:${apiVersion}:user:${normalizedUser}:${baseKey}`;
}

export function buildPublicCacheKey(baseKey: string, apiVersion: ApiVersion = 'v1'): string {
  return `cache:${FRONTEND_CONTRACT_VERSION}:${apiVersion}:public:${baseKey}`;
}