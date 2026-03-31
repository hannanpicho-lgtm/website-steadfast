import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
const app = new Hono();

const FUNCTION_SERVICE_NAME = "make-server-a1c55d7e";
const SERVER_STARTED_AT_UTC = new Date().toISOString();
const DEPLOYMENT_ID = Deno.env.get("DENO_DEPLOYMENT_ID") ?? null;
const DEPLOY_COMMIT_SHA = Deno.env.get("DEPLOY_COMMIT_SHA") ?? null;
const DEPLOY_COMMIT_SHORT = Deno.env.get("DEPLOY_COMMIT_SHORT") ?? null;
const DEPLOYED_AT_UTC = Deno.env.get("DEPLOYED_AT_UTC") ?? null;
const DEBUG_DEPLOYMENT_LOG = Deno.env.get("DEBUG_DEPLOYMENT_LOG") === "1";
const DEPLOYMENT_STALE_THRESHOLD_MINUTES = Math.max(1, Number(Deno.env.get("DEPLOYMENT_STALE_THRESHOLD_MINUTES") ?? "1440"));

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? '';
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const authClient = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

const appEnvironment = (Deno.env.get('APP_ENV')
  ?? Deno.env.get('ENVIRONMENT')
  ?? Deno.env.get('NODE_ENV')
  ?? (Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development'))
  .trim()
  .toLowerCase();
const isProductionEnvironment = appEnvironment === 'production';
const COMMISSION_RESET_TIMEZONE = (Deno.env.get('COMMISSION_RESET_TIMEZONE')
  ?? Deno.env.get('APP_TIMEZONE')
  ?? 'UTC')
  .trim() || 'UTC';
type ApiVersionIdentifier = 'v1' | 'v2';

type CompatibilityFeatureDefinition = {
  enabled: boolean;
  apiVersion: ApiVersionIdentifier;
  versionedPath: string;
  legacyPath: string | null;
  description: string;
};

const API_DEFAULT_VERSION: ApiVersionIdentifier = 'v1';
const API_SUPPORTED_VERSIONS: ApiVersionIdentifier[] = ['v1', 'v2'];
const FRONTEND_CONTRACT_MIN_VERSION = Deno.env.get('FRONTEND_CONTRACT_MIN_VERSION') ?? '2026-03-31-contract-v1';
const DEPLOYMENT_STAGE = appEnvironment === 'production'
  ? 'production'
  : (appEnvironment === 'staging' ? 'staging' : 'development');
const COMPATIBILITY_FALLBACK_ALERT_THRESHOLD = Math.max(1, Number(Deno.env.get('COMPATIBILITY_FALLBACK_ALERT_THRESHOLD') ?? '5'));
const COMPATIBILITY_VERSION_MISMATCH_ALERT_THRESHOLD = Math.max(1, Number(Deno.env.get('COMPATIBILITY_VERSION_MISMATCH_ALERT_THRESHOLD') ?? '1'));

function readBooleanEnvFlag(name: string, fallback: boolean): boolean {
  const raw = Deno.env.get(name);
  if (typeof raw !== 'string' || !raw.trim()) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return fallback;
}

function buildApiCompatibilityFeatureFlags(): Record<string, CompatibilityFeatureDefinition> {
  return {
    startingSnapshotV2: {
      enabled: readBooleanEnvFlag('FEATURE_STARTING_SNAPSHOT_V2', true),
      apiVersion: 'v2',
      versionedPath: `/${FUNCTION_SERVICE_NAME}/v2/me/starting-snapshot`,
      legacyPath: null,
      description: 'Versioned starting page snapshot endpoint',
    },
    recordsSnapshotV2: {
      enabled: readBooleanEnvFlag('FEATURE_RECORDS_SNAPSHOT_V2', true),
      apiVersion: 'v2',
      versionedPath: `/${FUNCTION_SERVICE_NAME}/v2/me/records-snapshot`,
      legacyPath: null,
      description: 'Versioned records page snapshot endpoint',
    },
    activitySnapshotV2: {
      enabled: readBooleanEnvFlag('FEATURE_ACTIVITY_SNAPSHOT_V2', true),
      apiVersion: 'v2',
      versionedPath: `/${FUNCTION_SERVICE_NAME}/v2/me/activity-snapshot`,
      legacyPath: null,
      description: 'Versioned activity page snapshot endpoint',
    },
    compatibilityTelemetryV2: {
      enabled: readBooleanEnvFlag('FEATURE_COMPATIBILITY_TELEMETRY_V2', true),
      apiVersion: 'v2',
      versionedPath: `/${FUNCTION_SERVICE_NAME}/v2/client/compatibility-events`,
      legacyPath: `/${FUNCTION_SERVICE_NAME}/client/compatibility-events`,
      description: 'Client compatibility telemetry ingestion endpoint',
    },
  };
}

function buildApiCompatibilityPayload(requestedVersion: string | null = null) {
  return {
    defaultVersion: API_DEFAULT_VERSION,
    requestedVersion,
    supportedVersions: API_SUPPORTED_VERSIONS,
    minimumFrontendContractVersion: FRONTEND_CONTRACT_MIN_VERSION,
    environment: appEnvironment,
    stage: DEPLOYMENT_STAGE,
    features: buildApiCompatibilityFeatureFlags(),
  };
}

const ADMIN_RATE_LIMIT_WINDOW_MS = 60_000;
const ADMIN_RATE_LIMIT_MAX_REQUESTS = 60;
const adminRateLimitStore = new Map<string, { count: number; resetAt: number }>();
const REFERRAL_PARENT_RATE = 0.2;
const ROOT_REFERRAL_USERNAME = 'steadfast_root';
const ROOT_REFERRAL_INVITE_CODE = 'STF01';

const DEFAULT_PRODUCTION_CORS_ALLOWED_ORIGINS = [
  'https://website-steadfast.pages.dev',
  'https://steadfastworkbench.org',
  'https://www.steadfastworkbench.org',
];

const envCorsAllowedOrigins = (Deno.env.get('CORS_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

const CORS_ALLOWED_ORIGINS = envCorsAllowedOrigins.length > 0
  ? envCorsAllowedOrigins
  : (isProductionEnvironment ? DEFAULT_PRODUCTION_CORS_ALLOWED_ORIGINS : []);

const configuredCorsAllowedOrigins = new Set(CORS_ALLOWED_ORIGINS);

function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (configuredCorsAllowedOrigins.size === 0) {
    return !isProductionEnvironment;
  }

  return configuredCorsAllowedOrigins.has(origin);
}

function resolveCorsOrigin(origin: string | undefined): string {
  if (!origin) {
    return isProductionEnvironment && configuredCorsAllowedOrigins.size === 0 ? '' : '*';
  }

  if (configuredCorsAllowedOrigins.size === 0) {
    return isProductionEnvironment ? '' : origin;
  }

  return configuredCorsAllowedOrigins.has(origin) ? origin : '';
}

function buildErrorBody(code: string, error: string, details: Record<string, unknown> = {}) {
  return {
    code,
    error,
    ...details,
  };
}

function jsonError(
  c: any,
  status: number,
  code: string,
  error: string,
  details: Record<string, unknown> = {},
) {
  return c.json(buildErrorBody(code, error, details), status);
}

function extractOriginFromUrlString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isUnsafeMethod(method: string): boolean {
  const normalized = method.trim().toUpperCase();
  return normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE';
}

function resolveSessionRequestOrigin(c: any): string | null {
  const originHeader = c.req.header('origin');
  if (originHeader) {
    return originHeader.trim();
  }

  return extractOriginFromUrlString(c.req.header('referer'));
}

function ensureTrustedSessionOrigin(c: any) {
  const requestOrigin = resolveSessionRequestOrigin(c);
  const allowlistConfigured = configuredCorsAllowedOrigins.size > 0;

  if (!allowlistConfigured) {
    if (isProductionEnvironment) {
      return jsonError(c, 503, 'cors_allowlist_required', 'Trusted origins are not configured for production session traffic.');
    }

    return null;
  }

  if (!requestOrigin) {
    if (isUnsafeMethod(c.req.method)) {
      return jsonError(c, 403, 'csrf_origin_required', 'Origin or Referer header is required for authenticated state changes.');
    }

    return null;
  }

  if (!configuredCorsAllowedOrigins.has(requestOrigin)) {
    logStructuredEvent(c, 'session_origin_rejected', 'warn', {
      origin: requestOrigin,
      method: c.req.method,
      path: c.req.path,
    });
    return jsonError(c, 403, 'csrf_origin_untrusted', 'Authenticated session request origin is not trusted.');
  }

  return null;
}

function resolveRequestId(c: any): string {
  const forwarded = c.req.header('x-request-id');
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.trim().slice(0, 128);
  }

  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function requestSource(c: any): string {
  const forwardedFor = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? 'unknown-ip';
  return forwardedFor.split(',')[0].trim();
}

function buildDeploymentVersionPayload() {
  const nowUtc = new Date().toISOString();
  const deployedAtRaw = DEPLOYED_AT_UTC;
  const deployedAtMs = deployedAtRaw ? Date.parse(deployedAtRaw) : NaN;
  const deployedAtUtc = Number.isFinite(deployedAtMs) ? new Date(deployedAtMs).toISOString() : null;
  const ageMinutes = Number.isFinite(deployedAtMs)
    ? Math.max(0, Math.round((Date.now() - deployedAtMs) / 60000))
    : null;
  const isStale = typeof ageMinutes === 'number' ? ageMinutes > DEPLOYMENT_STALE_THRESHOLD_MINUTES : false;

  return {
    service: FUNCTION_SERVICE_NAME,
    deploymentId: DEPLOYMENT_ID,
    commitSha: DEPLOY_COMMIT_SHA,
    commitShort: DEPLOY_COMMIT_SHORT,
    deployedAtUtc,
    serverStartedAtUtc: SERVER_STARTED_AT_UTC,
    nowUtc,
    deploymentAgeMinutes: ageMinutes,
    staleThresholdMinutes: DEPLOYMENT_STALE_THRESHOLD_MINUTES,
    stale: isStale,
    environment: appEnvironment,
    stage: DEPLOYMENT_STAGE,
  };
}

function buildVersionResponsePayload(requestedVersion: string | null = null) {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: buildDeploymentVersionPayload(),
    api: buildApiCompatibilityPayload(requestedVersion),
  };
}

function getClientRequestMetadata(c: any) {
  const clientIp = requestSource(c);
  const country = (c.req.header('cf-ipcountry') ?? '').trim();
  const region = (c.req.header('cf-region') ?? '').trim();
  const city = (c.req.header('cf-ipcity') ?? '').trim();
  const location = [city, region, country].filter(Boolean).join(', ');

  return {
    clientIp,
    location: location || 'Unknown location',
  };
}

function baseRequestContext(c: any): Record<string, unknown> {
  return {
    requestId: c.get('requestId') ?? null,
    path: c.req.path,
    method: c.req.method,
    source: requestSource(c),
  };
}

function statusClass(status: number): '1xx' | '2xx' | '3xx' | '4xx' | '5xx' {
  if (status >= 500) return '5xx';
  if (status >= 400) return '4xx';
  if (status >= 300) return '3xx';
  if (status >= 200) return '2xx';
  return '1xx';
}

function latencyBucketMs(latencyMs: number): '<=100ms' | '<=500ms' | '<=1000ms' | '<=5000ms' | '>5000ms' {
  if (latencyMs <= 100) return '<=100ms';
  if (latencyMs <= 500) return '<=500ms';
  if (latencyMs <= 1000) return '<=1000ms';
  if (latencyMs <= 5000) return '<=5000ms';
  return '>5000ms';
}

type RuntimeObservedEvent = {
  atMs: number;
  at: string;
  event: string;
  severity: 'info' | 'warn' | 'error';
  path: string;
  method: string;
  statusClass?: string;
  durationMs?: number;
};

const RUNTIME_OBSERVABILITY_RETENTION_MS = 60 * 60 * 1000;
const RUNTIME_OBSERVABILITY_MAX_EVENTS = 5000;
const runtimeObservedEvents: RuntimeObservedEvent[] = [];

function pruneRuntimeObservedEvents(now = Date.now()): void {
  const cutoff = now - RUNTIME_OBSERVABILITY_RETENTION_MS;
  while (runtimeObservedEvents.length > 0 && runtimeObservedEvents[0].atMs < cutoff) {
    runtimeObservedEvents.shift();
  }

  if (runtimeObservedEvents.length > RUNTIME_OBSERVABILITY_MAX_EVENTS) {
    runtimeObservedEvents.splice(0, runtimeObservedEvents.length - RUNTIME_OBSERVABILITY_MAX_EVENTS);
  }
}

function recordRuntimeObservedEvent(
  c: any,
  event: string,
  severity: 'info' | 'warn' | 'error',
  details: Record<string, unknown>,
): void {
  const now = Date.now();
  runtimeObservedEvents.push({
    atMs: now,
    at: new Date(now).toISOString(),
    event,
    severity,
    path: c.req.path,
    method: c.req.method,
    statusClass: typeof details.statusClass === 'string' ? details.statusClass : undefined,
    durationMs: typeof details.durationMs === 'number' ? details.durationMs : undefined,
  });
  pruneRuntimeObservedEvents(now);
}

type SecurityAlertRule = {
  id: string;
  severity: 'warning' | 'critical';
  triggered: boolean;
  observed: number | null;
  threshold: number;
  unit: string;
};

function percentile(values: number[], percentileTarget: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentileTarget * sorted.length) - 1));
  return sorted[index];
}

type EndpointLatencyStats = {
  endpoint: string;
  count: number;
  successCount: number;
  failureCount: number;
  failureRatePct: number;
  p50Ms: number | null;
  p95Ms: number | null;
};

function computeEndpointLatencyStats(
  requestEvents: RuntimeObservedEvent[],
  endpoints: string[],
): EndpointLatencyStats[] {
  return endpoints.map((endpoint) => {
    const endpointEvents = requestEvents.filter((entry) => entry.path === endpoint);
    const durations = endpointEvents
      .map((entry) => entry.durationMs)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    const failureCount = endpointEvents.filter((entry) => entry.statusClass === '4xx' || entry.statusClass === '5xx').length;
    const successCount = endpointEvents.length - failureCount;

    return {
      endpoint,
      count: endpointEvents.length,
      successCount,
      failureCount,
      failureRatePct: endpointEvents.length > 0 ? roundMoney((failureCount / endpointEvents.length) * 100) : 0,
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
    };
  });
}

function buildEndpointLatencyComparison(
  latest: EndpointLatencyStats[],
  previous: EndpointLatencyStats[],
) {
  const previousMap = new Map(previous.map((entry) => [entry.endpoint, entry]));

  return latest.map((entry) => {
    const baseline = previousMap.get(entry.endpoint);
    const p50DeltaMs = baseline && typeof baseline.p50Ms === 'number' && typeof entry.p50Ms === 'number'
      ? roundMoney(entry.p50Ms - baseline.p50Ms)
      : null;
    const p95DeltaMs = baseline && typeof baseline.p95Ms === 'number' && typeof entry.p95Ms === 'number'
      ? roundMoney(entry.p95Ms - baseline.p95Ms)
      : null;
    const failureRateDeltaPct = baseline
      ? roundMoney(entry.failureRatePct - baseline.failureRatePct)
      : null;

    return {
      endpoint: entry.endpoint,
      latest: entry,
      previous: baseline ?? null,
      delta: {
        p50Ms: p50DeltaMs,
        p95Ms: p95DeltaMs,
        failureRatePct: failureRateDeltaPct,
      },
    };
  });
}

function buildCompatibilityTelemetrySummary(windowEvents: RuntimeObservedEvent[], windowMinutes: number) {
  const fallbackEvents = windowEvents.filter((entry) => entry.event === 'client_fallback_used');
  const mismatchEvents = windowEvents.filter((entry) => entry.event === 'client_version_mismatch');
  const endpointFailureEvents = windowEvents.filter((entry) => entry.event === 'client_endpoint_failure');
  const perMinuteDivisor = Math.max(windowMinutes, 1);
  const fallbackPerMinute = Number((fallbackEvents.length / perMinuteDivisor).toFixed(2));

  return {
    totals: {
      fallbackEvents: fallbackEvents.length,
      versionMismatches: mismatchEvents.length,
      endpointFailures: endpointFailureEvents.length,
      fallbackPerMinute,
    },
    alerts: [
      {
        id: 'fallback_usage_spike',
        triggered: fallbackEvents.length >= COMPATIBILITY_FALLBACK_ALERT_THRESHOLD,
        observed: fallbackEvents.length,
        threshold: COMPATIBILITY_FALLBACK_ALERT_THRESHOLD,
        unit: 'events_per_window',
      },
      {
        id: 'version_mismatch_detected',
        triggered: mismatchEvents.length >= COMPATIBILITY_VERSION_MISMATCH_ALERT_THRESHOLD,
        observed: mismatchEvents.length,
        threshold: COMPATIBILITY_VERSION_MISMATCH_ALERT_THRESHOLD,
        unit: 'events_per_window',
      },
    ],
  };
}

function evaluateSecurityAlerts(
  windowEvents: RuntimeObservedEvent[],
  windowMinutes: number,
  thresholds: {
    errorRate5xxPctThreshold: number;
    authFailuresPerMinuteThreshold: number;
    rateLimitEventsPerMinuteThreshold: number;
    requestLatencyP95MsThreshold: number;
  },
): {
  overallStatus: 'ok' | 'warning' | 'critical';
  rules: SecurityAlertRule[];
} {
  const perMinuteDivisor = Math.max(windowMinutes, 1);
  const requestMetrics = windowEvents.filter((entry) => entry.event === 'request_metric');

  const totalRequests = requestMetrics.length;
  const total5xx = requestMetrics.filter((entry) => entry.statusClass === '5xx').length;
  const errorRate5xxPct = totalRequests > 0 ? (total5xx / totalRequests) * 100 : 0;

  const authEventsPerMinute = (
    windowEvents.filter((entry) =>
      entry.event === 'admin_auth_failure' ||
      entry.event === 'user_session_missing_or_expired' ||
      entry.event === 'session_username_mismatch')
      .length
  ) / perMinuteDivisor;

  const rateLimitEventsPerMinute = (
    windowEvents.filter((entry) =>
      entry.event === 'admin_rate_limit_exceeded' || entry.event === 'user_rate_limit_exceeded')
      .length
  ) / perMinuteDivisor;

  const requestDurations = requestMetrics
    .map((entry) => entry.durationMs)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const p95DurationMs = percentile(requestDurations, 0.95);

  const rules: SecurityAlertRule[] = [
    {
      id: 'error_rate_5xx_pct',
      severity: 'critical',
      triggered: errorRate5xxPct >= thresholds.errorRate5xxPctThreshold,
      observed: Number(errorRate5xxPct.toFixed(2)),
      threshold: thresholds.errorRate5xxPctThreshold,
      unit: 'percent',
    },
    {
      id: 'auth_failures_per_minute',
      severity: 'warning',
      triggered: authEventsPerMinute >= thresholds.authFailuresPerMinuteThreshold,
      observed: Number(authEventsPerMinute.toFixed(2)),
      threshold: thresholds.authFailuresPerMinuteThreshold,
      unit: 'events_per_minute',
    },
    {
      id: 'rate_limit_events_per_minute',
      severity: 'warning',
      triggered: rateLimitEventsPerMinute >= thresholds.rateLimitEventsPerMinuteThreshold,
      observed: Number(rateLimitEventsPerMinute.toFixed(2)),
      threshold: thresholds.rateLimitEventsPerMinuteThreshold,
      unit: 'events_per_minute',
    },
    {
      id: 'request_latency_p95_ms',
      severity: 'warning',
      triggered: typeof p95DurationMs === 'number' && p95DurationMs >= thresholds.requestLatencyP95MsThreshold,
      observed: p95DurationMs,
      threshold: thresholds.requestLatencyP95MsThreshold,
      unit: 'milliseconds',
    },
  ];

  const overallStatus = rules.some((rule) => rule.triggered && rule.severity === 'critical')
    ? 'critical'
    : rules.some((rule) => rule.triggered)
      ? 'warning'
      : 'ok';

  return { overallStatus, rules };
}

function logStructuredEvent(
  c: any,
  event: string,
  severity: 'info' | 'warn' | 'error' = 'info',
  details: Record<string, unknown> = {},
) {
  recordRuntimeObservedEvent(c, event, severity, details);

  const payload = {
    event,
    severity,
    at: new Date().toISOString(),
    ...baseRequestContext(c),
    ...details,
  };

  const text = JSON.stringify(payload);
  if (severity === 'error') {
    console.error(text);
    return;
  }
  if (severity === 'warn') {
    console.warn(text);
    return;
  }
  console.log(text);
}

function applySecurityHeaders(c: any): void {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

function applyApiCompatibilityHeaders(c: any): void {
  c.header('X-Api-Default-Version', API_DEFAULT_VERSION);
  c.header('X-Api-Supported-Versions', API_SUPPORTED_VERSIONS.join(','));
  c.header('X-Frontend-Contract-Min', FRONTEND_CONTRACT_MIN_VERSION);
  c.header('X-Deployment-Stage', DEPLOYMENT_STAGE);
}

app.use('*', async (c, next) => {
  const requestId = resolveRequestId(c);
  const startedAt = Date.now();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  applySecurityHeaders(c);
  applyApiCompatibilityHeaders(c);
  await next();
  const totalMs = Date.now() - startedAt;
  if (c.req.method !== 'OPTIONS') {
    logStructuredEvent(c, 'request_metric', 'info', {
      status: c.res.status,
      statusClass: statusClass(c.res.status),
      durationMs: totalMs,
      durationBucket: latencyBucketMs(totalMs),
    });

    if (DEBUG_DEPLOYMENT_LOG) {
      logStructuredEvent(c, 'deployment_request_trace', 'info', {
        deploymentId: DEPLOYMENT_ID,
        commitSha: DEPLOY_COMMIT_SHA,
        deployedAtUtc: DEPLOYED_AT_UTC,
      });
    }
  }
  c.header('X-Request-Id', requestId);
  applySecurityHeaders(c);
  applyApiCompatibilityHeaders(c);
});

app.use('*', async (c, next) => {
  const origin = c.req.header('origin');
  if (!isCorsOriginAllowed(origin)) {
    logStructuredEvent(c, 'cors_origin_rejected', 'warn', {
      origin,
      allowlistConfigured: configuredCorsAllowedOrigins.size > 0,
    });
    return jsonError(c, 403, 'origin_not_allowed', 'Origin not allowed');
  }

  await next();
});

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
// All sensitive endpoints require JWT authentication so allowing all origins is safe.
app.use(
  "/*",
  cors({
    origin: (origin) => resolveCorsOrigin(origin),
    credentials: true,
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "apikey",
      "x-admin-secret",
      "x-user-jwt",
      "x-user-session-token",
      "x-client-contract-version",
      "x-client-app-version",
      "x-client-platform"
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 600,
  }),
);

// ── Admin authorization helper ──────────────────────────────────────────────
// Admin access is granted only to authenticated Supabase users with an admin
// role in app_metadata/user_metadata. Example app_metadata:
// { "role": "admin" } or { "roles": ["admin"] }
function hasAdminRole(user: any): boolean {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const roles = new Set<string>();
  const appMetadata = typeof user.app_metadata === 'object' && user.app_metadata ? user.app_metadata : {};
  const userMetadata = typeof user.user_metadata === 'object' && user.user_metadata ? user.user_metadata : {};

  if (typeof appMetadata.role === 'string') {
    roles.add(appMetadata.role.toLowerCase());
  }
  if (Array.isArray(appMetadata.roles)) {
    appMetadata.roles.forEach((role: unknown) => {
      if (typeof role === 'string') {
        roles.add(role.toLowerCase());
      }
    });
  }
  if (typeof userMetadata.role === 'string') {
    roles.add(userMetadata.role.toLowerCase());
  }
  if (Array.isArray(userMetadata.roles)) {
    userMetadata.roles.forEach((role: unknown) => {
      if (typeof role === 'string') {
        roles.add(role.toLowerCase());
      }
    });
  }

  return roles.has('admin') || roles.has('super_admin');
}

function adminRequestContext(c: any) {
  const adminUser = c.get('adminUser');
  return {
    ...baseRequestContext(c),
    userId: adminUser?.id ?? null,
  };
}

function logAdminAuthFailure(c: any, reason: string, details: Record<string, unknown> = {}) {
  logStructuredEvent(c, 'admin_auth_failure', 'warn', {
    reason,
    ...adminRequestContext(c),
    ...details,
  });
}

function logAdminRateLimit(c: any, bucket: string, retryAfterSeconds: number) {
  logStructuredEvent(c, 'admin_rate_limit_exceeded', 'warn', {
    bucket,
    retryAfterSeconds,
    ...adminRequestContext(c),
  });
}

async function requireAdmin(c: any) {
  if (!authClient) {
    logAdminAuthFailure(c, 'auth_client_missing');
    return c.json({ error: 'Server auth configuration missing' }, 500);
  }

  const authorization = c.req.header('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    logAdminAuthFailure(c, 'missing_gateway_authorization');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const authHeaderToken = authorization.slice('Bearer '.length).trim();
  const forwardedUserJwt = c.req.header('x-user-jwt')?.trim() ?? '';
  const isGatewayToken = authHeaderToken === supabaseAnonKey || authHeaderToken === supabaseServiceRoleKey;
  if (!forwardedUserJwt && isGatewayToken) {
    logAdminAuthFailure(c, 'gateway_token_without_user_jwt');
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const tokenSource = forwardedUserJwt ? 'x-user-jwt' : 'authorization';
  const accessToken = forwardedUserJwt || authHeaderToken;
  if (!accessToken) {
    logAdminAuthFailure(c, 'missing_access_token_after_header_parse');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) {
    logAdminAuthFailure(c, 'invalid_or_expired_admin_token', {
      tokenSource,
      authError: error?.message ?? null,
    });
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!hasAdminRole(data.user)) {
    logAdminAuthFailure(c, 'admin_role_missing', {
      tokenSource,
      userId: data.user.id,
    });
    return c.json({ error: 'Forbidden' }, 403);
  }

  c.set('adminUser', data.user);
  return null;
}

function enforceAdminRateLimit(c: any, bucket: string) {
  const now = Date.now();
  const adminUser = c.get('adminUser');
  const userId = adminUser?.id ?? 'unknown-user';
  const forwardedFor = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? 'unknown-ip';
  const source = forwardedFor.split(',')[0].trim();
  const key = `${bucket}:${userId}:${source}`;

  const current = adminRateLimitStore.get(key);
  if (!current || now > current.resetAt) {
    adminRateLimitStore.set(key, {
      count: 1,
      resetAt: now + ADMIN_RATE_LIMIT_WINDOW_MS,
    });
    return null;
  }

  if (current.count >= ADMIN_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    c.header('Retry-After', String(retryAfterSeconds));
    logAdminRateLimit(c, bucket, retryAfterSeconds);
    recordRateLimitViolation(bucket, userId, source, retryAfterSeconds).catch(err => console.error('Failed to record rate limit violation:', err));
    return c.json({ error: 'Rate limit exceeded. Please retry shortly.' }, 429);
  }

  current.count += 1;
  adminRateLimitStore.set(key, current);
  return null;
}

function normalizeAdminRoleToken(role: unknown): string | null {
  if (typeof role !== 'string') {
    return null;
  }

  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized || null;
}

function getAdminRoleClaim(user: any): 'admin' | 'super_admin' {
  const roles = new Set<string>();
  const appMetadata = typeof user?.app_metadata === 'object' && user.app_metadata ? user.app_metadata : {};
  const userMetadata = typeof user?.user_metadata === 'object' && user.user_metadata ? user.user_metadata : {};

  const appRole = normalizeAdminRoleToken(appMetadata.role);
  if (appRole) {
    roles.add(appRole);
  }
  if (Array.isArray(appMetadata.roles)) {
    appMetadata.roles.forEach((role: unknown) => {
      const normalizedRole = normalizeAdminRoleToken(role);
      if (normalizedRole) {
        roles.add(normalizedRole);
      }
    });
  }
  const userRole = normalizeAdminRoleToken(userMetadata.role);
  if (userRole) {
    roles.add(userRole);
  }
  if (Array.isArray(userMetadata.roles)) {
    userMetadata.roles.forEach((role: unknown) => {
      const normalizedRole = normalizeAdminRoleToken(role);
      if (normalizedRole) {
        roles.add(normalizedRole);
      }
    });
  }

  return roles.has('super_admin') ? 'super_admin' : 'admin';
}

function getAdminRoleName(user: any): string {
  const appMetadata = typeof user?.app_metadata === 'object' && user.app_metadata ? user.app_metadata : {};
  const userMetadata = typeof user?.user_metadata === 'object' && user.user_metadata ? user.user_metadata : {};
  const explicitRoleName = userMetadata.role_name ?? appMetadata.admin_role_name;
  if (typeof explicitRoleName === 'string' && explicitRoleName.trim()) {
    return explicitRoleName.trim();
  }
  return getAdminRoleClaim(user) === 'super_admin' ? 'Super Admin' : 'Admin';
}

function getAdminRoleColor(user: any): string {
  const appMetadata = typeof user?.app_metadata === 'object' && user.app_metadata ? user.app_metadata : {};
  const userMetadata = typeof user?.user_metadata === 'object' && user.user_metadata ? user.user_metadata : {};
  const explicitColor = userMetadata.role_color ?? appMetadata.admin_role_color;
  if (typeof explicitColor === 'string' && explicitColor.trim()) {
    return explicitColor.trim();
  }
  return getAdminRoleClaim(user) === 'super_admin' ? 'red' : 'blue';
}

function formatAdminLastLogin(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return 'Never';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date).replace(',', '');
}

function buildAvatar(fullName: string, fallback = 'AD'): string {
  const avatar = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return avatar || fallback;
}

function mapAuthUserToAdminRecord(user: any) {
  const email = typeof user?.email === 'string' ? user.email : '';
  const userMetadata = typeof user?.user_metadata === 'object' && user.user_metadata ? user.user_metadata : {};
  const fullName = typeof userMetadata.full_name === 'string' && userMetadata.full_name.trim()
    ? userMetadata.full_name.trim()
    : (typeof userMetadata.name === 'string' && userMetadata.name.trim()
      ? userMetadata.name.trim()
      : (email ? email.split('@')[0] : 'Admin User'));
  const username = typeof userMetadata.username === 'string' && userMetadata.username.trim()
    ? userMetadata.username.trim()
    : (email ? email.split('@')[0] : String(user?.id ?? 'admin'));
  const bannedUntil = typeof user?.banned_until === 'string' ? new Date(user.banned_until) : null;
  const isSuspended = Boolean(bannedUntil && !Number.isNaN(bannedUntil.getTime()) && bannedUntil.getTime() > Date.now());
  const factors = Array.isArray(user?.factors) ? user.factors : [];

  return {
    id: String(user?.id ?? username),
    username,
    email,
    fullName,
    roleId: getAdminRoleClaim(user) === 'super_admin' ? 1 : 0,
    roleName: getAdminRoleName(user),
    roleColor: getAdminRoleColor(user),
    status: isSuspended ? 'Suspended' : 'Active',
    lastLogin: formatAdminLastLogin(user?.last_sign_in_at),
    createdDate: typeof user?.created_at === 'string' ? user.created_at.slice(0, 10) : '',
    phone: typeof userMetadata.phone === 'string' && userMetadata.phone.trim() ? userMetadata.phone.trim() : '-',
    department: typeof userMetadata.department === 'string' && userMetadata.department.trim() ? userMetadata.department.trim() : 'General',
    avatar: buildAvatar(fullName, username.slice(0, 2).toUpperCase()),
    twoFactorEnabled: factors.length > 0,
    loginAttempts: 0,
  };
}

// ── Password hashing (PBKDF2 via Web Crypto) ───────────────────────────────
// Format stored in KV: "pbkdf2v1:<base64-salt>:<base64-hash>"
// The "pbkdf2v1:" prefix lets verifyPassword detect hashed vs. legacy plaintext.
const PBKDF2_ITERATIONS = 200_000;
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_KEY_LENGTH = 32; // bytes

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8,
  );
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  return `pbkdf2v1:${saltB64}:${hashB64}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Backward-compatible: if not a hash, fall back to plaintext comparison
  if (!stored.startsWith('pbkdf2v1:')) {
    return stored === password;
  }
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const salt = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
  const expectedHash = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8,
  );
  const actualHash = new Uint8Array(hashBuffer);
  // Constant-time comparison to prevent timing attacks
  if (actualHash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHash.length; i++) {
    diff |= actualHash[i] ^ expectedHash[i];
  }
  return diff === 0;
}

// ── Input sanitizers ─────────────────────────────────────────────────────────
// All of these prevent colon-injection attacks against KV key namespaces.
function sanitizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Allow alphanumeric, underscore, hyphen, dot — max 64 chars
  if (!/^[a-zA-Z0-9_.\-]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizeInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (!/^(?=.*\d)[A-Z0-9]{5}$/.test(normalized)) return null;
  return normalized;
}

function sanitizeAdminInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  // Admin invitation codes are exactly 5 alphanumeric characters.
  if (!/^[A-Z0-9]{5}$/.test(normalized)) return null;
  return normalized;
}

function generateAdminInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 5;
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('');
}

function generateAdminShortCode(): string {
  return generateAdminInviteCode();
}

function generateUserInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const digits = '0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let code = Array.from(bytes).map((b) => chars[b % chars.length]).join('');
  const digitIndex = bytes[0] % 5;
  code = `${code.slice(0, digitIndex)}${digits[bytes[1] % digits.length]}${code.slice(digitIndex + 1)}`;
  return code;
}

async function resolveCanonicalUsername(username: string): Promise<string | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  const lookup = await kv.get(`user:lookup:${normalized}`);
  if (typeof lookup === 'string' && lookup) {
    return lookup;
  }

  const exact = await kv.get(`user:${username}`);
  if (exact) {
    return username;
  }

  const lowerRecord = await kv.get(`user:${normalized}`);
  if (lowerRecord) {
    return normalized;
  }

  return null;
}

async function assignUsernameLookup(username: string): Promise<void> {
  await kv.set(`user:lookup:${username.toLowerCase()}`, username);
}

async function findAuthUserForPlatformUsername(username: string): Promise<any | null> {
  if (!authClient?.auth?.admin?.listUsers) {
    return null;
  }

  const normalized = sanitizeUsername(username);
  if (!normalized) {
    return null;
  }

  const perPage = 200;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await authClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('auth admin listUsers failed while resolving ghost user:', error.message);
      return null;
    }

    const users = Array.isArray(data?.users) ? data.users : [];
    for (const authUser of users) {
      const metadataUsername = sanitizeUsername(
        typeof authUser?.user_metadata?.username === 'string' ? authUser.user_metadata.username : '',
      );
      const emailLocal = sanitizeUsername(
        typeof authUser?.email === 'string' ? (authUser.email.split('@')[0] ?? '') : '',
      );

      if (metadataUsername === normalized || emailLocal === normalized) {
        return authUser;
      }
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

async function bootstrapMissingPlatformUserRecord(
  username: string,
  options?: { referredByAdminId?: string | null },
) {
  const canonicalUsername = sanitizeUsername(username);
  if (!canonicalUsername) {
    throw new Error('Invalid username for bootstrap');
  }

  const created = await syncUserWithVipConfig(defaultUserRecord(canonicalUsername), canonicalUsername);
  created.referredByAdminId = typeof options?.referredByAdminId === 'string' ? options.referredByAdminId : created.referredByAdminId;
  await kv.set(`user:${canonicalUsername}`, created);
  await assignUsernameLookup(canonicalUsername);
  return created;
}

function isSuperAdmin(user: any): boolean {
  return getAdminRoleClaim(user) === 'super_admin';
}

const VIP_CONFIG_EDITOR_ALLOWLIST = new Set([
  'hillarydark6@gmail.com',
]);

function canEditVipConfig(user: any): boolean {
  if (isSuperAdmin(user)) {
    return true;
  }

  const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
  return email.length > 0 && VIP_CONFIG_EDITOR_ALLOWLIST.has(email);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function getCommissionDateKey(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: COMMISSION_RESET_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

const COMMISSION_PLAN_MAX_GENERATION_ATTEMPTS = 16;

function toMoneyCents(value: number): number {
  return Math.max(0, Math.round(value * 100));
}

function randomIntInclusive(min: number, max: number): number {
  const safeMin = Math.ceil(Math.min(min, max));
  const safeMax = Math.floor(Math.max(min, max));
  if (safeMax <= safeMin) {
    return safeMin;
  }
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

const TRANSACTION_KEY_PREFIX = 'transaction:';
const TRANSACTION_USER_KEY_PREFIX = 'transaction-user:';
const WITHDRAWAL_KEY_PREFIX = 'withdrawal:';
const FINANCIAL_LEDGER_KEY_PREFIX = 'financial-ledger:';
const TASK_CATALOG_KEY_PREFIX = 'task-catalog:';
const VIP_CONFIG_KEY_PREFIX = 'vip-config:';
const DISTRIBUTED_LOCK_KEY_PREFIX = 'dist-lock:';
const DISTRIBUTED_RATE_LIMIT_KEY_PREFIX = 'rate-limit:';
const DISTRIBUTED_RATE_LIMIT_LOCK_PREFIX = 'rate-limit-lock:';
const REWARDS_CONFIG_SCHEMA_VERSION = 2;
const REWARDS_CONFIG_KEY = `rewards-config:v${REWARDS_CONFIG_SCHEMA_VERSION}:primary`;
const LEGACY_REWARDS_CONFIG_KEYS = ['rewards-config:primary'];
const ADMIN_SALARY_PROJECT_KEY = 'admin-salary:project:primary';
const ADMIN_SALARY_AUDIT_LOG_KEY = 'admin-salary:audit-log:primary';
const ADMIN_PLATFORM_SETTINGS_KEY = 'admin-platform-settings:primary';
const ADMIN_OBSERVABILITY_ALERT_CONFIG_KEY = 'admin-observability:security-alert-config:primary';
const ADMIN_OBSERVABILITY_ALERT_HISTORY_KEY = 'admin-observability:security-alert-history:primary';
const ADMIN_OBSERVABILITY_AUDIT_LOG_KEY = 'admin-observability:audit-log:primary';
const ADMIN_OBSERVABILITY_MAX_AUDIT_EVENTS = 100;
const ADMIN_OBSERVABILITY_RATE_LIMIT_VIOLATIONS_KEY = 'admin-observability:rate-limit-violations:primary';
const ADMIN_OBSERVABILITY_MAX_RATE_LIMIT_VIOLATIONS = 200;
const ADMIN_SALARY_MAX_RESTORE_POINTS = 10;
const ADMIN_SALARY_MAX_AUDIT_EVENTS = 50;
const PREMIUM_SETTLEMENT_FIX_DEPLOYED_AT_MS = new Date('2026-03-25T02:53:42.000Z').getTime();
const RECONCILIATION_EPSILON = 0.009;
const TASK_CATALOG_RUNTIME_CACHE_TTL_MS = 20_000;

let taskCatalogRuntimeCacheAll: { expiresAt: number; tasks: any[] } | null = null;
let taskCatalogRuntimeCacheActive: { expiresAt: number; tasks: any[] } | null = null;

function parsePositiveIntQuery(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function cloneTaskCatalogRecords(tasks: any[]): any[] {
  return tasks.map((task) => ({ ...task }));
}

function invalidateTaskCatalogRuntimeCache(): void {
  taskCatalogRuntimeCacheAll = null;
  taskCatalogRuntimeCacheActive = null;
}

const defaultTaskCatalog = [
  {
    id: 'task-amazon-headphones',
    merchant: 'Amazon',
    product: 'Premium Wireless Headphones with Noise Cancellation',
    price: 299.99,
    commission: 0.015,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop',
    rating: 4.5,
    productUrl: 'https://example.com/products/premium-wireless-headphones',
  },
  {
    id: 'task-walmart-smartwatch',
    merchant: 'Walmart',
    product: 'Smart Watch Pro with Fitness Tracking',
    price: 399.0,
    commission: 0.02,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=300&fit=crop',
    rating: 4.2,
    productUrl: 'https://example.com/products/smart-watch-pro',
  },
  {
    id: 'task-target-tablet',
    merchant: 'Target',
    product: '10-inch Tablet with 128GB Storage',
    price: 549.99,
    commission: 0.018,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop',
    rating: 4.1,
    productUrl: 'https://example.com/products/10-inch-tablet',
  },
  {
    id: 'task-bestbuy-webcam',
    merchant: 'Best Buy',
    product: '4K Webcam with Built-in Microphone',
    price: 129.99,
    commission: 0.012,
    status: 'Paused',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop',
    rating: 4.3,
    productUrl: 'https://example.com/products/4k-webcam',
  },
];

const defaultVipConfig = [
  { level: 1, name: 'VIP 1', investment: 100, dailyTasks: 40, commission: 0.005, color: 'bronze' },
  { level: 2, name: 'VIP 2', investment: 500, dailyTasks: 45, commission: 0.01, color: 'silver' },
  { level: 3, name: 'VIP 3', investment: 1600, dailyTasks: 50, commission: 0.015, color: 'gold' },
  { level: 4, name: 'VIP 4', investment: 5500, dailyTasks: 55, commission: 0.02, color: 'platinum' },
  { level: 5, name: 'VIP 5', investment: 10000, dailyTasks: 60, commission: 0.025, color: 'diamond' },
];

const legacyVipConfigBaseline = [
  { level: 1, investment: 100, dailyTasks: 10, commission: 0.005 },
  { level: 2, investment: 500, dailyTasks: 15, commission: 0.01 },
  { level: 3, investment: 2000, dailyTasks: 20, commission: 0.015 },
  { level: 4, investment: 5000, dailyTasks: 25, commission: 0.02 },
  { level: 5, investment: 10000, dailyTasks: 30, commission: 0.025 },
];

const defaultRewardsConfig = {
  workday: [
    { id: 1, days: 1, salary: 204, enabled: true },
    { id: 2, days: 7, salary: 1428, enabled: true },
    { id: 3, days: 15, salary: 3060, enabled: true },
    { id: 4, days: 22, salary: 4488, enabled: true },
    { id: 5, days: 30, salary: 6120, enabled: true },
  ],
  reset: [
    { id: 1, deposit: 100, reward: 10, label: 'Starter', color: 'bg-cyan-100', labelColor: 'bg-cyan-600', enabled: true },
    { id: 2, deposit: 500, reward: 60, label: 'Hot Picks', color: 'bg-cyan-100', labelColor: 'bg-[#f0a23a]', enabled: true },
    { id: 3, deposit: 1000, reward: 120, label: 'Value', color: 'bg-cyan-100', labelColor: 'bg-cyan-600', enabled: true },
    { id: 4, deposit: 1600, reward: 200, label: 'Limited Offer', color: 'bg-cyan-100', labelColor: 'bg-[#e3b23c]', enabled: true },
    { id: 5, deposit: 5500, reward: 1200, label: 'Growth', color: 'bg-cyan-100', labelColor: 'bg-cyan-600', enabled: true },
    { id: 6, deposit: 10000, reward: 2400, label: 'Best Deal', color: 'bg-cyan-100', labelColor: 'bg-[#cf4d64]', enabled: true },
  ],
  accumulated: [
    { id: 1, minDeposit: 1500, maxDeposit: 9999, rate: 0.04, enabled: true },
    { id: 2, minDeposit: 10000, maxDeposit: 19999, rate: 0.08, enabled: true },
    { id: 3, minDeposit: 20000, maxDeposit: 49999, rate: 0.12, enabled: true },
    { id: 4, minDeposit: 50000, maxDeposit: null, rate: 0.20, enabled: true },
  ],
  productSystem: {
    productsPerSet: 10,
    maxSetsPerDay: 5,
    minTimePerProduct: 30,
    autoApproveCommission: true,
    requireProductConfirmation: true,
    premiumEnabled: true,
    premiumTriggerTaskNumber: 10,
    premiumBaseValue: 300,
    premiumValueMode: 'multiplier',
    vipPremiumAdjustments: [
      { vipLevel: 1, multiplier: 1.1, minValue: 220, maxValue: 420 },
      { vipLevel: 2, multiplier: 1.2, minValue: 300, maxValue: 620 },
      { vipLevel: 3, multiplier: 1.35, minValue: 500, maxValue: 1300 },
      { vipLevel: 4, multiplier: 1.5, minValue: 900, maxValue: 2600 },
      { vipLevel: 5, multiplier: 1.8, minValue: 1800, maxValue: 5200 },
    ],
  },
};

function createFinanceId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function sanitizeWalletAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 256 || /[\u0000-\u001F]/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function sanitizeWalletText(value: unknown, maxLength = 128): string {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001F]/.test(trimmed)) {
    return '';
  }
  return trimmed;
}

const CLIENT_FINANCIAL_MUTATION_FIELDS = new Set([
  'balance',
  'todayCommission',
  'referralEarnings',
  'holdAmount',
  'availableAmount',
  'luckyBonus',
  'tasksCompleted',
  'tasksLimit',
  'tasksCompletedInSet',
  'completedTaskSets',
]);

function getForbiddenClientFinancialFields(body: unknown): string[] {
  if (!body || typeof body !== 'object') {
    return [];
  }

  const source = body as Record<string, unknown>;
  return Object.keys(source).filter((key) => CLIENT_FINANCIAL_MUTATION_FIELDS.has(key));
}

function sanitizeIdempotencyKey(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) {
    return null;
  }

  if (!/^[a-zA-Z0-9_.:-]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function resolveRequestIdempotencyKey(c: any, body: unknown): string | null {
  const headerKey = sanitizeIdempotencyKey(c.req.header('x-idempotency-key'));
  if (headerKey) {
    return headerKey;
  }

  if (!body || typeof body !== 'object') {
    return null;
  }

  const source = body as Record<string, unknown>;
  return sanitizeIdempotencyKey(source.idempotencyKey);
}

type BankingWalletProfile = {
  type: 'banking';
  accountName: string;
  accountNumber: string;
  bankName: string;
  swiftCode: string;
  routingNumber: string;
  country: string;
  updatedAt: string;
};

type CryptoWalletProfile = {
  type: 'crypto';
  walletType: string;
  walletAddress: string;
  network: string;
  updatedAt: string;
};

type WalletProfile = BankingWalletProfile | CryptoWalletProfile;

function getWalletProfileDestination(profile: WalletProfile | null): string {
  if (!profile) {
    return '';
  }

  return profile.type === 'crypto'
    ? profile.walletAddress
    : profile.accountNumber;
}

function formatWalletAssetLabel(walletType: string): string {
  const normalized = sanitizeFinanceMethod(walletType, 'crypto').trim().toLowerCase();
  switch (normalized) {
    case 'bitcoin':
      return 'BTC';
    case 'ethereum':
      return 'ETH';
    case 'usdt':
      return 'USDT';
    default:
      return normalized ? normalized.toUpperCase() : 'CRYPTO';
  }
}

function resolveWithdrawalMethodDetails(profile: WalletProfile | null, requestedMethod: string) {
  if (!profile) {
    return {
      method: sanitizeFinanceMethod(requestedMethod, 'USDT'),
      network: '',
    };
  }

  if (profile.type === 'crypto') {
    return {
      method: formatWalletAssetLabel(profile.walletType),
      network: sanitizeFinanceMethod(profile.network, 'mainnet'),
    };
  }

  return {
    method: sanitizeFinanceMethod(profile.bankName, 'BANK'),
    network: sanitizeFinanceMethod(profile.country, ''),
  };
}

function walletDestinationsMatch(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function normalizeWalletType(value: unknown): 'banking' | 'crypto' | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'banking' || normalized === 'crypto') {
    return normalized;
  }
  return null;
}

function normalizeStoredWalletProfile(value: unknown): WalletProfile | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const type = normalizeWalletType(source.type);
  const updatedAt = typeof source.updatedAt === 'string' && source.updatedAt
    ? source.updatedAt
    : new Date().toISOString();

  if (type === 'banking') {
    const accountName = sanitizeWalletText(source.accountName);
    const accountNumber = sanitizeWalletText(source.accountNumber, 64);
    const bankName = sanitizeWalletText(source.bankName);
    const country = sanitizeWalletText(source.country, 8);
    if (!accountName || !accountNumber || !bankName || !country) {
      return null;
    }
    return {
      type: 'banking',
      accountName,
      accountNumber,
      bankName,
      swiftCode: sanitizeWalletText(source.swiftCode, 32),
      routingNumber: sanitizeWalletText(source.routingNumber, 32),
      country,
      updatedAt,
    };
  }

  if (type === 'crypto') {
    const walletAddress = sanitizeWalletAddress(source.walletAddress);
    if (!walletAddress) {
      return null;
    }
    return {
      type: 'crypto',
      walletType: sanitizeFinanceMethod(source.walletType, 'bitcoin'),
      walletAddress,
      network: sanitizeFinanceMethod(source.network, 'mainnet'),
      updatedAt,
    };
  }

  return null;
}

function parseWalletProfileInput(body: unknown): { ok: true; walletProfile: WalletProfile } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body is required' };
  }

  const source = body as Record<string, unknown>;
  const type = normalizeWalletType(source.type);
  if (!type) {
    return { ok: false, error: 'type must be banking or crypto' };
  }

  if (type === 'banking') {
    const accountName = sanitizeWalletText(source.accountName);
    const accountNumber = sanitizeWalletText(source.accountNumber, 64);
    const bankName = sanitizeWalletText(source.bankName);
    const country = sanitizeWalletText(source.country, 8);
    if (!accountName || !accountNumber || !bankName || !country) {
      return { ok: false, error: 'accountName, accountNumber, bankName, and country are required' };
    }

    return {
      ok: true,
      walletProfile: {
        type: 'banking',
        accountName,
        accountNumber,
        bankName,
        swiftCode: sanitizeWalletText(source.swiftCode, 32),
        routingNumber: sanitizeWalletText(source.routingNumber, 32),
        country,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const walletAddress = sanitizeWalletAddress(source.walletAddress);
  if (!walletAddress) {
    return { ok: false, error: 'walletAddress is required' };
  }

  return {
    ok: true,
    walletProfile: {
      type: 'crypto',
      walletType: sanitizeFinanceMethod(source.walletType, 'bitcoin'),
      walletAddress,
      network: sanitizeFinanceMethod(source.network, 'mainnet'),
      updatedAt: new Date().toISOString(),
    },
  };
}

function sanitizeFinanceMethod(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 32) {
    return fallback;
  }
  return trimmed;
}

function sanitizeTaskId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_:\-.]{1,128}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function sanitizeAdminSalaryRewardTab(value: unknown): string {
  const valid = new Set(['workday', 'reset', 'accumulated', 'product-system', 'salary-payments']);
  return typeof value === 'string' && valid.has(value) ? value : 'workday';
}

function sanitizeAdminSalaryBulkOption(value: unknown): 'all' | 'auto' | 'manual' {
  return value === 'auto' || value === 'manual' ? value : 'all';
}

function sanitizeAdminSalaryPayment(value: unknown): any | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    !Number.isFinite(Number(candidate.id)) ||
    typeof candidate.username !== 'string' ||
    !Number.isFinite(Number(candidate.daysWorked)) ||
    !Number.isFinite(Number(candidate.salaryDue)) ||
    typeof candidate.dueDate !== 'string'
  ) {
    return null;
  }

  const status = candidate.status === 'Paid' ? 'Paid' : 'Pending';
  const paymentMode = candidate.paymentMode === 'Manual' ? 'Manual' : 'Automatic';

  return {
    id: Number(candidate.id),
    username: candidate.username.trim(),
    daysWorked: Math.max(0, Math.round(Number(candidate.daysWorked))),
    salaryDue: Math.max(0, roundMoney(Number(candidate.salaryDue))),
    status,
    dueDate: String(candidate.dueDate),
    paidDate: typeof candidate.paidDate === 'string' ? candidate.paidDate : undefined,
    paymentMode,
  };
}

function sanitizeAdminSalaryRestorePoint(value: unknown): any | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const payments = Array.isArray(candidate.payments)
    ? candidate.payments
        .map((payment) => sanitizeAdminSalaryPayment(payment))
        .filter((payment): payment is Record<string, unknown> => payment !== null)
    : [];

  if (payments.length === 0) {
    return null;
  }

  return {
    id: Number.isFinite(Number(candidate.id)) ? Number(candidate.id) : Date.now(),
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : 'Imported backup',
    payments,
  };
}

function sanitizeAdminSalaryProject(value: unknown): any | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const payments = Array.isArray(source.payments)
    ? source.payments
        .map((payment) => sanitizeAdminSalaryPayment(payment))
        .filter((payment): payment is Record<string, unknown> => payment !== null)
    : [];
  const points = Array.isArray(source.points)
    ? source.points
        .map((point) => sanitizeAdminSalaryRestorePoint(point))
        .filter((point): point is Record<string, unknown> => point !== null)
        .slice(0, ADMIN_SALARY_MAX_RESTORE_POINTS)
    : [];

  if (payments.length === 0) {
    return null;
  }

  const uiState = typeof source.uiState === 'object' && source.uiState ? source.uiState as Record<string, unknown> : {};

  return {
    version: 1,
    savedAt: typeof source.savedAt === 'string' ? source.savedAt : new Date().toISOString(),
    checksum: typeof source.checksum === 'string' ? source.checksum : '',
    uiState: {
      activeRewardTab: sanitizeAdminSalaryRewardTab(uiState.activeRewardTab),
      selectedBulkOption: sanitizeAdminSalaryBulkOption(uiState.selectedBulkOption),
      autoBackupEnabled: typeof uiState.autoBackupEnabled === 'boolean' ? uiState.autoBackupEnabled : true,
      autoBackupIntervalMinutes: Math.min(60, Math.max(1, Math.round(Number(uiState.autoBackupIntervalMinutes ?? 1)))),
      backupRetentionDays: Math.min(365, Math.max(1, Math.round(Number(uiState.backupRetentionDays ?? 30)))),
    },
    payments,
    points,
  };
}

function sanitizeAdminSalaryAuditEvent(value: unknown): any | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  if (!Number.isFinite(Number(source.id)) || typeof source.action !== 'string') {
    return null;
  }

  return {
    id: Number(source.id),
    at: typeof source.at === 'string' ? source.at : new Date().toISOString(),
    action: source.action,
    detail: typeof source.detail === 'string' ? source.detail : '',
  };
}

function sanitizeAdminSalaryAuditLog(values: unknown): any[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => sanitizeAdminSalaryAuditEvent(value))
    .filter((event): event is Record<string, unknown> => event !== null)
    .slice(0, ADMIN_SALARY_MAX_AUDIT_EVENTS);
}

function sanitizeWinnersTickerEntries(value: unknown) {
  const fallback = [
    { emoji: '🏆', user: 'Fugene55', amount: '$15,257.00 USD' },
    { emoji: '🎉', user: 'RewardKing_89', amount: '$12,450.00 USD' },
    { emoji: '💰', user: 'SleepAre8', amount: '$77.00 USD' },
    { emoji: '🌟', user: 'PlatinumUser7', amount: '$18,000.00 USD' },
    { emoji: '🏆', user: 'Diamond_Quest88', amount: '$22,300.00 USD' },
    { emoji: '🎉', user: 'Lamar_K', amount: '$4,820.00 USD' },
    { emoji: '💰', user: 'CryptoEagle9', amount: '$5,750.00 USD' },
    { emoji: '🌟', user: 'MastermindQ', amount: '$14,500.00 USD' },
    { emoji: '🏆', user: 'jhoman1988', amount: '$2,350.00 USD' },
    { emoji: '🎉', user: 'ProfitPilot', amount: '$9,100.00 USD' },
    { emoji: '💰', user: 'TechMaster_Pro', amount: '$3,125.00 USD' },
    { emoji: '🌟', user: 'GoldenPath_X', amount: '$8,900.00 USD' },
  ];

  if (!Array.isArray(value)) {
    return fallback;
  }

  const entries = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const source = entry as Record<string, unknown>;
      const user = typeof source.user === 'string' ? source.user.trim() : '';
      const amount = typeof source.amount === 'string' ? source.amount.trim() : '';
      const emoji = typeof source.emoji === 'string' && source.emoji.trim() ? source.emoji.trim().slice(0, 4) : '🏆';

      if (!user || !amount) {
        return null;
      }

      return {
        emoji,
        user: user.slice(0, 64),
        amount: amount.slice(0, 64),
      };
    })
    .filter((entry): entry is { emoji: string; user: string; amount: string } => entry !== null)
    .slice(0, 32);

  return entries.length > 0 ? entries : fallback;
}

function sanitizeAdminPlatformSettings(value: unknown) {
  const defaults = {
    maintenanceMode: false,
    allowNewRegistration: true,
    minWithdrawal: 50,
    maxWithdrawal: 10_000,
    withdrawalFee: 2,
    minDeposit: 10,
    taskRefreshHours: 24,
    autoAssignTasks: 'Enabled',
    platformHoursEnabled: false,
    platformHoursStart: 9,
    platformHoursEnd: 22,
    defaultTaskSetCount: 2,
    winnersTicker: sanitizeWinnersTickerEntries(null),
    savedAt: new Date().toISOString(),
  };

  if (!value || typeof value !== 'object') {
    return defaults;
  }

  const source = value as Record<string, unknown>;
  const minWithdrawal = Number(source.minWithdrawal);
  const maxWithdrawal = Number(source.maxWithdrawal);
  const withdrawalFee = Number(source.withdrawalFee);
  const minDeposit = Number(source.minDeposit);
  const taskRefreshHours = Number(source.taskRefreshHours);

  const boundedMinWithdrawal = Number.isFinite(minWithdrawal)
    ? Math.min(1_000_000, Math.max(1, roundMoney(minWithdrawal)))
    : defaults.minWithdrawal;
  const boundedMaxWithdrawalRaw = Number.isFinite(maxWithdrawal)
    ? Math.min(1_000_000, Math.max(1, roundMoney(maxWithdrawal)))
    : defaults.maxWithdrawal;
  const boundedMaxWithdrawal = boundedMaxWithdrawalRaw <= boundedMinWithdrawal
    ? Math.min(1_000_000, boundedMinWithdrawal + 1)
    : boundedMaxWithdrawalRaw;

  return {
    maintenanceMode: source.maintenanceMode === true,
    allowNewRegistration: source.allowNewRegistration !== false,
    minWithdrawal: boundedMinWithdrawal,
    maxWithdrawal: boundedMaxWithdrawal,
    withdrawalFee: Number.isFinite(withdrawalFee) ? Math.min(50, Math.max(0, roundMoney(withdrawalFee))) : defaults.withdrawalFee,
    minDeposit: Number.isFinite(minDeposit) ? Math.min(1_000_000, Math.max(1, roundMoney(minDeposit))) : defaults.minDeposit,
    taskRefreshHours: Number.isFinite(taskRefreshHours) ? Math.min(168, Math.max(1, Math.round(taskRefreshHours))) : defaults.taskRefreshHours,
    autoAssignTasks: source.autoAssignTasks === 'Disabled' ? 'Disabled' : 'Enabled',
    platformHoursEnabled: source.platformHoursEnabled === true,
    platformHoursStart: Number.isInteger(Number(source.platformHoursStart)) ? Math.min(23, Math.max(0, Math.round(Number(source.platformHoursStart)))) : defaults.platformHoursStart,
    platformHoursEnd: Number.isInteger(Number(source.platformHoursEnd)) ? Math.min(24, Math.max(1, Math.round(Number(source.platformHoursEnd)))) : defaults.platformHoursEnd,
    defaultTaskSetCount: Number.isFinite(Number(source.defaultTaskSetCount)) ? Math.min(10, Math.max(1, Math.round(Number(source.defaultTaskSetCount)))) : 2,
    winnersTicker: sanitizeWinnersTickerEntries(source.winnersTicker),
    savedAt: typeof source.savedAt === 'string' && source.savedAt ? source.savedAt : new Date().toISOString(),
  };
}

function isPlatformWithinHours(settings: { platformHoursEnabled: boolean; platformHoursStart: number; platformHoursEnd: number }): boolean {
  if (!settings.platformHoursEnabled) return true;
  // EST = UTC-5 (fixed offset; DST shift ignored for simplicity)
  const estHour = (new Date().getUTCHours() - 5 + 24) % 24;
  return estHour >= settings.platformHoursStart && estHour < settings.platformHoursEnd;
}

function sanitizeAdminObservabilityAlertConfig(value: unknown) {
  const defaults = {
    errorRate5xxPctThreshold: 2,
    authFailuresPerMinuteThreshold: 30,
    rateLimitEventsPerMinuteThreshold: 50,
    requestLatencyP95MsThreshold: 1500,
    savedAt: new Date().toISOString(),
  };

  if (!value || typeof value !== 'object') {
    return defaults;
  }

  const source = value as Record<string, unknown>;
  const errorRate5xxPctThreshold = Number(source.errorRate5xxPctThreshold);
  const authFailuresPerMinuteThreshold = Number(source.authFailuresPerMinuteThreshold);
  const rateLimitEventsPerMinuteThreshold = Number(source.rateLimitEventsPerMinuteThreshold);
  const requestLatencyP95MsThreshold = Number(source.requestLatencyP95MsThreshold);

  return {
    errorRate5xxPctThreshold: Number.isFinite(errorRate5xxPctThreshold)
      ? Math.min(100, Math.max(0.1, roundMoney(errorRate5xxPctThreshold)))
      : defaults.errorRate5xxPctThreshold,
    authFailuresPerMinuteThreshold: Number.isFinite(authFailuresPerMinuteThreshold)
      ? Math.min(10_000, Math.max(1, Math.round(authFailuresPerMinuteThreshold)))
      : defaults.authFailuresPerMinuteThreshold,
    rateLimitEventsPerMinuteThreshold: Number.isFinite(rateLimitEventsPerMinuteThreshold)
      ? Math.min(10_000, Math.max(1, Math.round(rateLimitEventsPerMinuteThreshold)))
      : defaults.rateLimitEventsPerMinuteThreshold,
    requestLatencyP95MsThreshold: Number.isFinite(requestLatencyP95MsThreshold)
      ? Math.min(300_000, Math.max(50, Math.round(requestLatencyP95MsThreshold)))
      : defaults.requestLatencyP95MsThreshold,
    savedAt: typeof source.savedAt === 'string' && source.savedAt ? source.savedAt : new Date().toISOString(),
  };
}

function sanitizeAdminObservabilityAlertHistoryEntry(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  if (typeof source.generatedAt !== 'string' || typeof source.windowMinutes !== 'number') {
    return null;
  }

  const overallStatus = source.overallStatus;
  if (overallStatus !== 'ok' && overallStatus !== 'warning' && overallStatus !== 'critical') {
    return null;
  }

  return {
    generatedAt: source.generatedAt,
    windowMinutes: source.windowMinutes,
    overallStatus,
    rules: Array.isArray(source.rules) ? source.rules : [],
  };
}

function sanitizeAdminObservabilityAlertHistory(values: unknown): Record<string, unknown>[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => sanitizeAdminObservabilityAlertHistoryEntry(value))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .slice(-200);
}

function sanitizeAdminObservabilityAuditEvent(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  if (typeof source.action !== 'string' || !source.action) {
    return null;
  }

  return {
    id: typeof source.id === 'string' ? source.id : `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    at: typeof source.at === 'string' ? source.at : new Date().toISOString(),
    action: source.action,
    actor: typeof source.actor === 'string' ? source.actor : 'unknown',
    detail: typeof source.detail === 'string' ? source.detail : '',
  };
}

function sanitizeAdminObservabilityAuditLog(values: unknown): Record<string, unknown>[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => sanitizeAdminObservabilityAuditEvent(value))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .slice(-ADMIN_OBSERVABILITY_MAX_AUDIT_EVENTS);
}

async function recordObservabilityAuditEvent(action: string, actor: string, detail: string): Promise<void> {
  const existing = sanitizeAdminObservabilityAuditLog(await kv.get(ADMIN_OBSERVABILITY_AUDIT_LOG_KEY));
  existing.push({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    at: new Date().toISOString(),
    action,
    actor,
    detail,
  });
  await kv.set(ADMIN_OBSERVABILITY_AUDIT_LOG_KEY, existing.slice(-ADMIN_OBSERVABILITY_MAX_AUDIT_EVENTS));
}

function sanitizeAdminObservabilityRateLimitViolation(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  if (!(typeof source.bucket === 'string' && typeof source.userId === 'string' && typeof source.sourceIp === 'string')) {
    return null;
  }

  return {
    id: typeof source.id === 'string' ? source.id : `violation_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    at: typeof source.at === 'string' ? source.at : new Date().toISOString(),
    bucket: source.bucket,
    userId: source.userId,
    sourceIp: source.sourceIp,
    actionAttempt: typeof source.actionAttempt === 'string' ? source.actionAttempt : 'rate-limit-exceeded',
    retryAfterSeconds: typeof source.retryAfterSeconds === 'number' ? Math.round(source.retryAfterSeconds) : 0,
  };
}

function sanitizeAdminObservabilityRateLimitViolations(values: unknown): Record<string, unknown>[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => sanitizeAdminObservabilityRateLimitViolation(value))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .slice(-ADMIN_OBSERVABILITY_MAX_RATE_LIMIT_VIOLATIONS);
}

async function recordRateLimitViolation(bucket: string, userId: string, sourceIp: string, retryAfterSeconds: number): Promise<void> {
  const existing = sanitizeAdminObservabilityRateLimitViolations(await kv.get(ADMIN_OBSERVABILITY_RATE_LIMIT_VIOLATIONS_KEY));
  existing.push({
    id: `violation_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    at: new Date().toISOString(),
    bucket,
    userId,
    sourceIp,
    actionAttempt: 'rate-limit-exceeded',
    retryAfterSeconds,
  });
  await kv.set(ADMIN_OBSERVABILITY_RATE_LIMIT_VIOLATIONS_KEY, existing.slice(-ADMIN_OBSERVABILITY_MAX_RATE_LIMIT_VIOLATIONS));
}

function sanitizeTaskStatus(value: unknown): 'Active' | 'Paused' {
  if (typeof value !== 'string') {
    return 'Active';
  }
  return value.trim().toLowerCase() === 'paused' ? 'Paused' : 'Active';
}

function sanitizeTaskText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length <= 256 ? trimmed : trimmed.slice(0, 256);
}

function sanitizeTaskUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    return '';
  }
}

function inferMerchantFromTaskUrls(...values: unknown[]): string {
  for (const value of values) {
    const sanitized = sanitizeTaskUrl(value);
    if (!sanitized) {
      continue;
    }

    try {
      const host = new URL(sanitized).hostname.toLowerCase();
      if (host.includes('amazon')) return 'Amazon';
      if (host.includes('ebay')) return 'eBay';
      if (host.includes('walmart')) return 'Walmart';
      if (host.includes('target')) return 'Target';
      if (host.includes('bestbuy')) return 'Best Buy';
      if (host.includes('aliexpress')) return 'AliExpress';
      if (host.includes('temu')) return 'Temu';
      if (host.includes('shopify')) return 'Shopify';

      const primaryLabel = host.replace(/^www\./, '').split('.')[0] ?? '';
      if (primaryLabel) {
        return primaryLabel.charAt(0).toUpperCase() + primaryLabel.slice(1);
      }
    } catch {
      // Ignore invalid URL parsing errors.
    }
  }

  return 'Marketplace';
}

function inferPriceFromTaskUrls(...values: unknown[]): number | null {
  const pricedPatterns = [
    /(?:price|amount|value|usd|\$)[^\d]{0,6}(\d{1,6}(?:\.\d{1,2})?)/i,
    /[?&](?:price|amount|value)=([\d.]+)/i,
    /\b(\d{1,6}\.\d{1,2})\b/,
  ];

  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) {
      continue;
    }

    const decodedValue = decodeURIComponent(value);
    for (const pattern of pricedPatterns) {
      const match = decodedValue.match(pattern);
      const parsed = Number(match?.[1] ?? NaN);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1_000_000) {
        return roundMoney(parsed);
      }
    }
  }

  return null;
}

function deriveDeterministicTaskPrice(...values: unknown[]): number {
  const seedSource = values
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => String(value).trim().toLowerCase())
    .join('|');

  let hash = 0;
  for (let i = 0; i < seedSource.length; i += 1) {
    hash = (hash * 31 + seedSource.charCodeAt(i)) >>> 0;
  }

  const normalizedHash = hash || 1;
  const dollars = 35 + (normalizedHash % 1965);
  const cents = Math.floor(normalizedHash / 1965) % 100;
  return roundMoney(dollars + cents / 100);
}

function resolveAutomaticTaskPrice(record: any) {
  const inferredPrice = inferPriceFromTaskUrls(
    record?.productUrl,
    record?.image,
    record?.product,
    record?.merchant,
  );

  if (Number.isFinite(inferredPrice) && Number(inferredPrice) > 0) {
    return {
      price: roundMoney(Number(inferredPrice)),
      priceSource: 'inferred',
    };
  }

  return {
    price: deriveDeterministicTaskPrice(record?.product, record?.merchant, record?.productUrl, record?.image),
    priceSource: 'derived',
  };
}

function inferTaskImageUrl(imageValue: unknown, productUrlValue: unknown): string {
  const imageUrl = sanitizeTaskUrl(imageValue);
  if (imageUrl) {
    return imageUrl;
  }

  const productUrl = sanitizeTaskUrl(productUrlValue);
  if (/\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(productUrl)) {
    return productUrl;
  }

  return '';
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function normalizeWorkdayRewardRecord(record: any, index: number) {
  const id = Number.isFinite(Number(record?.id)) ? Math.max(1, Math.round(Number(record.id))) : index + 1;
  return {
    id,
    days: Math.max(1, Math.round(Number(record?.days ?? 1))),
    salary: Math.max(0, roundMoney(Number(record?.salary ?? 0))),
    enabled: normalizeBoolean(record?.enabled, true),
  };
}

function normalizeResetRewardRecord(record: any, index: number) {
  const id = Number.isFinite(Number(record?.id)) ? Math.max(1, Math.round(Number(record.id))) : index + 1;
  return {
    id,
    deposit: Math.max(0, roundMoney(Number(record?.deposit ?? 0))),
    reward: Math.max(0, roundMoney(Number(record?.reward ?? 0))),
    label: sanitizeTaskText(record?.label, `Tier ${id}`),
    color: sanitizeTaskText(record?.color, 'bg-gray-300'),
    labelColor: sanitizeTaskText(record?.labelColor, 'bg-gray-600'),
    enabled: normalizeBoolean(record?.enabled, true),
  };
}

function normalizeAccumulatedRewardRecord(record: any, index: number) {
  const id = Number.isFinite(Number(record?.id)) ? Math.max(1, Math.round(Number(record.id))) : index + 1;
  const minDeposit = Math.max(0, roundMoney(Number(record?.minDeposit ?? 0)));
  const hasExplicitMax = record?.maxDeposit !== null && record?.maxDeposit !== undefined && record?.maxDeposit !== '';
  const rawMax = hasExplicitMax ? Number(record?.maxDeposit) : NaN;
  const maxDeposit = hasExplicitMax && Number.isFinite(rawMax)
    ? Math.max(minDeposit, roundMoney(rawMax))
    : null;
  const rate = Number.isFinite(Number(record?.rate)) ? Math.max(0, Number(record.rate)) : 0;

  return {
    id,
    minDeposit,
    maxDeposit,
    rate,
    enabled: normalizeBoolean(record?.enabled, true),
  };
}

function normalizeProductSystemConfig(record: any) {
  const source = typeof record === 'object' && record ? record : {};
  const rawAdjustments = Array.isArray(source.vipPremiumAdjustments) ? source.vipPremiumAdjustments : [];
  const defaultAdjustments = Array.isArray(defaultRewardsConfig.productSystem.vipPremiumAdjustments)
    ? defaultRewardsConfig.productSystem.vipPremiumAdjustments
    : [];

  const vipPremiumAdjustments = (rawAdjustments.length > 0 ? rawAdjustments : defaultAdjustments)
    .map((entry: any, index: number) => {
      const fallback = defaultAdjustments[index] ?? defaultAdjustments[defaultAdjustments.length - 1] ?? {
        vipLevel: index + 1,
        multiplier: 1,
        minValue: 0,
        maxValue: 0,
        upholdAmount: 0,
      };
      const vipLevel = Number.isFinite(Number(entry?.vipLevel))
        ? Math.max(1, Math.round(Number(entry.vipLevel)))
        : Number(fallback.vipLevel);
      const multiplier = Number.isFinite(Number(entry?.multiplier))
        ? Math.max(0.1, Number(entry.multiplier))
        : Number(fallback.multiplier);
      const minValue = Number.isFinite(Number(entry?.minValue))
        ? Math.max(0, roundMoney(Number(entry.minValue)))
        : roundMoney(Number(fallback.minValue));
      const maxCandidate = Number.isFinite(Number(entry?.maxValue))
        ? roundMoney(Number(entry.maxValue))
        : roundMoney(Number(fallback.maxValue));
      const maxValue = Math.max(minValue, maxCandidate);
      const upholdAmount = Number.isFinite(Number(entry?.upholdAmount))
        ? Math.max(0, roundMoney(Number(entry.upholdAmount)))
        : roundMoney(Number(fallback.upholdAmount ?? 0));

      return {
        vipLevel,
        multiplier,
        minValue,
        maxValue,
        upholdAmount,
      };
    })
    .sort((left, right) => left.vipLevel - right.vipLevel);

  const premiumValueModeRaw = typeof source.premiumValueMode === 'string' ? source.premiumValueMode.toLowerCase() : 'multiplier';
  const premiumValueMode = premiumValueModeRaw === 'range' ? 'range' : 'multiplier';

  return {
    productsPerSet: Math.max(1, Math.round(Number(source?.productsPerSet ?? 10))),
    maxSetsPerDay: Math.max(1, Math.round(Number(source?.maxSetsPerDay ?? 5))),
    minTimePerProduct: Math.max(1, Math.round(Number(source?.minTimePerProduct ?? 30))),
    autoApproveCommission: normalizeBoolean(source?.autoApproveCommission, true),
    requireProductConfirmation: normalizeBoolean(source?.requireProductConfirmation, true),
    premiumEnabled: normalizeBoolean(source?.premiumEnabled, true),
    premiumTriggerTaskNumber: Math.max(1, Math.round(Number(source?.premiumTriggerTaskNumber ?? 10))),
    premiumBaseValue: Math.max(0, roundMoney(Number(source?.premiumBaseValue ?? 300))),
    premiumValueMode,
    vipPremiumAdjustments,
  };
}

function resolveVipPremiumAdjustment(
  vipLevel: number,
  productSystem: ReturnType<typeof normalizeProductSystemConfig>,
) {
  const direct = productSystem.vipPremiumAdjustments.find((entry) => entry.vipLevel === vipLevel);
  if (direct) {
    return direct;
  }

  const below = [...productSystem.vipPremiumAdjustments]
    .reverse()
    .find((entry) => entry.vipLevel <= vipLevel);
  if (below) {
    return below;
  }

  return productSystem.vipPremiumAdjustments[0] ?? {
    vipLevel,
    multiplier: 1,
    minValue: productSystem.premiumBaseValue,
    maxValue: productSystem.premiumBaseValue,
  };
}

function computePremiumValueForVip(
  vipLevel: number,
  productSystem: ReturnType<typeof normalizeProductSystemConfig>,
): number {
  const adjustment = resolveVipPremiumAdjustment(vipLevel, productSystem);

  if (productSystem.premiumValueMode === 'range') {
    // Deterministic: always use minValue for range mode (no randomness)
    return roundMoney(adjustment.minValue);
  }

  return roundMoney(Math.max(0, productSystem.premiumBaseValue * adjustment.multiplier));
}

function resolveUpholdAmountForVip(
  vipLevel: number,
  premiumValue: number,
  userBalance: number,
  productSystem: ReturnType<typeof normalizeProductSystemConfig>,
): number {
  const adjustment = resolveVipPremiumAdjustment(vipLevel, productSystem);
  const configuredUphold = Number(adjustment.upholdAmount ?? 0);
  // If admin configured a deterministic uphold amount per VIP, use it; otherwise fall back to calculated
  if (configuredUphold > 0) {
    return roundMoney(configuredUphold);
  }
  return roundMoney(Math.max(0, premiumValue - userBalance));
}

function buildPremiumRequirementResponse(activePremium: any) {
  const requiredAmount = roundMoney(Number(activePremium?.topUpRequired ?? activePremium?.negativeAmount ?? 0));
  return {
    id: activePremium?.id ?? null,
    requiredAmount,
    requiredAmountDisplay: `-${requiredAmount.toFixed(2)}`,
    triggerTaskNumber: Number.isFinite(Number(activePremium?.triggerTaskNumber)) ? Number(activePremium.triggerTaskNumber) : null,
    vipLevel: Number.isFinite(Number(activePremium?.vipLevel)) ? Number(activePremium.vipLevel) : null,
    premiumValue: Number.isFinite(Number(activePremium?.premiumProductValue)) ? Number(activePremium.premiumProductValue) : 0,
    mode: typeof activePremium?.valueMode === 'string' ? activePremium.valueMode : 'multiplier',
    status: typeof activePremium?.status === 'string' ? activePremium.status : 'awaiting_funds',
  };
}

function sortPremiumAssignmentsByTrigger(assignments: any[]): any[] {
  return [...assignments].sort((left, right) => {
    const leftTrigger = Number.isFinite(Number(left?.triggerTaskNumber))
      ? Math.max(1, Math.round(Number(left.triggerTaskNumber)))
      : Number.MAX_SAFE_INTEGER;
    const rightTrigger = Number.isFinite(Number(right?.triggerTaskNumber))
      ? Math.max(1, Math.round(Number(right.triggerTaskNumber)))
      : Number.MAX_SAFE_INTEGER;

    if (leftTrigger !== rightTrigger) {
      return leftTrigger - rightTrigger;
    }

    const leftAssignedAt = Date.parse(String(left?.assignedAt ?? ''));
    const rightAssignedAt = Date.parse(String(right?.assignedAt ?? ''));
    if (Number.isFinite(leftAssignedAt) && Number.isFinite(rightAssignedAt) && leftAssignedAt !== rightAssignedAt) {
      return leftAssignedAt - rightAssignedAt;
    }

    return String(left?.id ?? '').localeCompare(String(right?.id ?? ''));
  });
}

function userHasPendingPremiumRequirement(userData: any): boolean {
  const requiredAmount = Number(userData?.activePremium?.topUpRequired ?? userData?.activePremium?.negativeAmount ?? 0);
  return Boolean(userData?.activePremium) && requiredAmount > 0;
}

function normalizeRewardsConfigRecord(record: any) {
  const source = typeof record === 'object' && record ? record : defaultRewardsConfig;
  const workday = Array.isArray(source.workday) && source.workday.length > 0
    ? source.workday.map((entry: any, index: number) => normalizeWorkdayRewardRecord(entry, index))
    : defaultRewardsConfig.workday.map((entry, index) => normalizeWorkdayRewardRecord(entry, index));
  const reset = Array.isArray(source.reset) && source.reset.length > 0
    ? source.reset.map((entry: any, index: number) => normalizeResetRewardRecord(entry, index))
    : defaultRewardsConfig.reset.map((entry, index) => normalizeResetRewardRecord(entry, index));
  const accumulated = Array.isArray(source.accumulated) && source.accumulated.length > 0
    ? source.accumulated.map((entry: any, index: number) => normalizeAccumulatedRewardRecord(entry, index))
    : defaultRewardsConfig.accumulated.map((entry, index) => normalizeAccumulatedRewardRecord(entry, index));

  return {
    workday,
    reset,
    accumulated,
    productSystem: normalizeProductSystemConfig(source.productSystem ?? defaultRewardsConfig.productSystem),
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt
      ? source.updatedAt
      : new Date().toISOString(),
  };
}

function hasLegacyResetBaseline(resetRewards: any[]) {
  const expectedDeposits = new Set([100, 500, 1000, 1600, 5500, 10000]);

  if (!Array.isArray(resetRewards) || resetRewards.length !== expectedDeposits.size) {
    return true;
  }

  const actualDeposits = resetRewards.map((e: any) => roundMoney(Number(e?.deposit ?? 0)));
  if (!actualDeposits.every((d) => expectedDeposits.has(d)) || new Set(actualDeposits).size !== expectedDeposits.size) {
    return true;
  }

  const legacyRewardByDeposit = new Map<number, number>([
    [100, 28], [500, 158], [1600, 688], [5500, 1788], [10000, 3888], [30000, 12888],
  ]);

  return resetRewards.some((entry: any) => {
    const deposit = roundMoney(Number(entry?.deposit ?? 0));
    const reward = roundMoney(Number(entry?.reward ?? 0));
    const legacyReward = legacyRewardByDeposit.get(deposit);
    return legacyReward !== undefined && legacyReward === reward;
  });
}

function hasLegacyAccumulatedBaseline(accumulatedRewards: any[]) {
  const expectedByMinDeposit = new Map<number, { maxDeposit: number | null; rate: number }>([
    [1500, { maxDeposit: 9999, rate: 0.04 }],
    [10000, { maxDeposit: 19999, rate: 0.08 }],
    [20000, { maxDeposit: 49999, rate: 0.12 }],
    [50000, { maxDeposit: null, rate: 0.2 }],
  ]);

  if (!Array.isArray(accumulatedRewards) || accumulatedRewards.length !== expectedByMinDeposit.size) {
    return true;
  }

  const seen = new Set<number>();

  for (const entry of accumulatedRewards) {
    const minDeposit = roundMoney(Number(entry?.minDeposit ?? 0));
    const expected = expectedByMinDeposit.get(minDeposit);
    if (!expected || seen.has(minDeposit)) {
      return true;
    }

    const rawMax = entry?.maxDeposit;
    const maxDeposit = rawMax === null || rawMax === undefined || rawMax === ''
      ? null
      : roundMoney(Number(rawMax));
    const rate = Number(entry?.rate ?? 0);

    if (maxDeposit !== expected.maxDeposit || Math.abs(rate - expected.rate) > 0.000001) {
      return true;
    }

    seen.add(minDeposit);
  }

  return seen.size !== expectedByMinDeposit.size;
}

function applyRewardsConfigMigrations(record: any) {
  const normalized = normalizeRewardsConfigRecord(record);

  if (hasLegacyResetBaseline(normalized.reset)) {
    normalized.reset = defaultRewardsConfig.reset.map((entry, index) => normalizeResetRewardRecord(entry, index));
  }

  if (hasLegacyAccumulatedBaseline(normalized.accumulated)) {
    normalized.accumulated = defaultRewardsConfig.accumulated.map((entry, index) => normalizeAccumulatedRewardRecord(entry, index));
  }

  return normalized;
}

async function getRewardsConfigRecord() {
  const existing = await kv.get(REWARDS_CONFIG_KEY);
  if (existing) {
    const normalized = applyRewardsConfigMigrations(existing);
    await kv.set(REWARDS_CONFIG_KEY, normalized);
    return normalized;
  }

  for (const legacyKey of LEGACY_REWARDS_CONFIG_KEYS) {
    const legacy = await kv.get(legacyKey);
    if (!legacy) {
      continue;
    }

    const migrated = applyRewardsConfigMigrations(legacy);
    await kv.set(REWARDS_CONFIG_KEY, migrated);
    await kv.delete(legacyKey);
    return migrated;
  }

  const seeded = applyRewardsConfigMigrations(defaultRewardsConfig);
  await kv.set(REWARDS_CONFIG_KEY, seeded);
  return seeded;
}

function normalizeVipConfigRecord(record: any) {
  const level = Number.isFinite(Number(record?.level)) ? Number(record.level) : 1;
  const createdAt = typeof record?.createdAt === 'string' && record.createdAt
    ? record.createdAt
    : new Date().toISOString();
  const updatedAt = typeof record?.updatedAt === 'string' && record.updatedAt
    ? record.updatedAt
    : createdAt;

  return {
    level,
    name: sanitizeTaskText(record?.name, `VIP ${level}`),
    investment: roundMoney(Number(record?.investment ?? 0)),
    dailyTasks: Math.max(1, Math.round(Number(record?.dailyTasks ?? 1))),
    commission: Number.isFinite(Number(record?.commission)) ? Number(record.commission) : 0.005,
    color: sanitizeTaskText(record?.color, 'bronze'),
    taskPriceMin: Number.isFinite(Number(record?.taskPriceMin)) ? roundMoney(Number(record.taskPriceMin)) : 0,
    taskPriceMax: Number.isFinite(Number(record?.taskPriceMax)) ? roundMoney(Number(record.taskPriceMax)) : 0,
    createdAt,
    updatedAt,
  };
}

async function ensureVipConfigSeeded() {
  const existing = await kv.getByPrefix(VIP_CONFIG_KEY_PREFIX);
  if (existing.length > 0) {
    const normalized = existing
      .map((tier) => normalizeVipConfigRecord(tier))
      .sort((left, right) => left.level - right.level);

    const matchesLegacyDefaults =
      normalized.length === legacyVipConfigBaseline.length
      && legacyVipConfigBaseline.every((legacyTier, index) => {
        const currentTier = normalized[index];
        return currentTier
          && currentTier.level === legacyTier.level
          && currentTier.investment === legacyTier.investment
          && currentTier.dailyTasks === legacyTier.dailyTasks
          && Math.abs(currentTier.commission - legacyTier.commission) < 0.000001;
      });

    if (matchesLegacyDefaults) {
      for (const tier of defaultVipConfig) {
        const normalizedTier = normalizeVipConfigRecord({
          ...tier,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await kv.set(`${VIP_CONFIG_KEY_PREFIX}${normalizedTier.level}`, normalizedTier);
      }
    }
    return;
  }

  for (const tier of defaultVipConfig) {
    const normalized = normalizeVipConfigRecord({
      ...tier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await kv.set(`${VIP_CONFIG_KEY_PREFIX}${normalized.level}`, normalized);
  }
}

async function listVipConfigRecords() {
  await ensureVipConfigSeeded();
  const tiers = await kv.getByPrefix(VIP_CONFIG_KEY_PREFIX);
  return tiers
    .map((tier) => normalizeVipConfigRecord(tier))
    .sort((left, right) => left.level - right.level);
}

async function getVipConfigForLevel(level: number) {
  const tiers = await listVipConfigRecords();
  if (tiers.length === 0) {
    return normalizeVipConfigRecord(defaultVipConfig[0]);
  }

  const exact = tiers.find((tier) => tier.level === level);
  if (exact) {
    return exact;
  }

  const highestBelow = [...tiers].reverse().find((tier) => tier.level <= level);
  return highestBelow ?? tiers[0];
}

function normalizeTaskCatalogRecord(record: any) {
  const createdAt = typeof record?.createdAt === 'string' && record.createdAt
    ? record.createdAt
    : new Date().toISOString();
  const updatedAt = typeof record?.updatedAt === 'string' && record.updatedAt
    ? record.updatedAt
    : createdAt;

  const rawVipTier = Number(record?.vipTier);
  const vipTier = Number.isInteger(rawVipTier) && rawVipTier >= 1 && rawVipTier <= 5
    ? rawVipTier
    : 0;

  const validSources = ['Manual', 'AI Generated', 'Bulk Import'];
  const source = typeof record?.source === 'string' && validSources.includes(record.source)
    ? record.source
    : 'Manual';

  return {
    id: sanitizeTaskId(record?.id) ?? createFinanceId('task'),
    merchant: sanitizeTaskText(record?.merchant, 'Marketplace'),
    product: sanitizeTaskText(record?.product, 'Task Product'),
    price: roundMoney(Number(record?.price ?? 0)),
    priceSource: typeof record?.priceSource === 'string' && record.priceSource
      ? record.priceSource
      : 'manual',
    commission: Number.isFinite(Number(record?.commission)) ? Number(record.commission) : 0.01,
    status: sanitizeTaskStatus(record?.status),
    image: sanitizeTaskText(record?.image),
    rating: Number.isFinite(Number(record?.rating)) ? Number(record.rating) : 4,
    productUrl: sanitizeTaskUrl(record?.productUrl),
    category: typeof record?.category === 'string' ? record.category : '',
    vipTier,
    source,
    createdAt,
    updatedAt,
  };
}

async function ensureTaskCatalogSeeded() {
  const existing = await kv.getByPrefix(TASK_CATALOG_KEY_PREFIX);
  if (existing.length > 0) {
    return;
  }

  for (const task of defaultTaskCatalog) {
    const normalized = normalizeTaskCatalogRecord({
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await kv.set(`${TASK_CATALOG_KEY_PREFIX}${normalized.id}`, normalized);
  }

  invalidateTaskCatalogRuntimeCache();
}

async function listTaskCatalogRecords(includePaused = true) {
  const now = Date.now();
  const cached = includePaused ? taskCatalogRuntimeCacheAll : taskCatalogRuntimeCacheActive;
  if (cached && cached.expiresAt > now) {
    return cloneTaskCatalogRecords(cached.tasks);
  }

  await ensureTaskCatalogSeeded();
  const rawTasks = await kv.getByPrefix(TASK_CATALOG_KEY_PREFIX);

  // Auto-repair historical fallback/default prices so each task carries its own value.
  let repairedCount = 0;
  const repairedTasks = await Promise.all(rawTasks.map(async (task: any) => {
    const taskId = sanitizeTaskId(task?.id);
    if (!taskId) {
      return task;
    }

    const hasPriceSource = typeof task?.priceSource === 'string' && task.priceSource.trim().length > 0;
    const currentPrice = roundMoney(Number(task?.price ?? 0));
    const shouldRepairLegacyFallback = !hasPriceSource && (currentPrice <= 0 || currentPrice === 123.45);

    if (!shouldRepairLegacyFallback) {
      return task;
    }

    const autoPrice = resolveAutomaticTaskPrice(task);
    const repairedTask = normalizeTaskCatalogRecord({
      ...task,
      price: autoPrice.price,
      priceSource: autoPrice.priceSource,
      updatedAt: new Date().toISOString(),
    });

    await kv.set(`${TASK_CATALOG_KEY_PREFIX}${taskId}`, repairedTask);
    repairedCount += 1;
    return repairedTask;
  }));

  if (repairedCount > 0) {
    invalidateTaskCatalogRuntimeCache();
  }

  const normalized = repairedTasks
    .map((task) => normalizeTaskCatalogRecord(task))
    .filter((task) => includePaused || task.status === 'Active')
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  const cacheEntry = {
    expiresAt: now + TASK_CATALOG_RUNTIME_CACHE_TTL_MS,
    tasks: cloneTaskCatalogRecords(normalized),
  };
  if (includePaused) {
    taskCatalogRuntimeCacheAll = cacheEntry;
  } else {
    taskCatalogRuntimeCacheActive = cacheEntry;
  }

  return normalized;
}

async function getTaskCatalogRecord(taskId: string) {
  await ensureTaskCatalogSeeded();
  const task = await kv.get(`${TASK_CATALOG_KEY_PREFIX}${taskId}`);
  return task ? normalizeTaskCatalogRecord(task) : null;
}

function normalizeTransactionStatus(value: unknown): 'Pending' | 'Completed' | 'Rejected' | 'Failed' {
  if (typeof value !== 'string') {
    return 'Pending';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'approved') {
    return 'Completed';
  }
  if (normalized === 'rejected') {
    return 'Rejected';
  }
  if (normalized === 'failed') {
    return 'Failed';
  }
  return 'Pending';
}

function normalizeWithdrawalStatus(value: unknown): 'Pending' | 'Approved' | 'Rejected' {
  if (typeof value !== 'string') {
    return 'Pending';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'approved') {
    return 'Approved';
  }
  if (normalized === 'rejected') {
    return 'Rejected';
  }
  return 'Pending';
}

function normalizeTransactionType(value: unknown): 'Deposit' | 'Withdrawal' | 'Commission' {
  if (typeof value !== 'string') {
    return 'Commission';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'deposit') {
    return 'Deposit';
  }
  if (normalized === 'withdrawal') {
    return 'Withdrawal';
  }
  return 'Commission';
}

function normalizeTransactionRecord(record: any) {
  const createdAt = typeof record?.createdAt === 'string' && record.createdAt
    ? record.createdAt
    : new Date().toISOString();
  const updatedAt = typeof record?.updatedAt === 'string' && record.updatedAt
    ? record.updatedAt
    : createdAt;

  return {
    id: typeof record?.id === 'string' && record.id ? record.id : createFinanceId('tx'),
    username: typeof record?.username === 'string' ? record.username : '',
    type: normalizeTransactionType(record?.type),
    amount: roundMoney(Number(record?.amount ?? 0)),
    status: normalizeTransactionStatus(record?.status),
    date: typeof record?.date === 'string' && record.date ? record.date : createdAt,
    txHash: typeof record?.txHash === 'string' && record.txHash ? record.txHash : '',
    method: sanitizeFinanceMethod(record?.method, 'System'),
    source: typeof record?.source === 'string' && record.source ? record.source : 'system',
    description: typeof record?.description === 'string' && record.description ? record.description : '',
    referenceId: typeof record?.referenceId === 'string' && record.referenceId ? record.referenceId : '',
    createdAt,
    updatedAt,
  };
}

function normalizeWithdrawalRecord(record: any) {
  const requestedDate = typeof record?.requestedDate === 'string' && record.requestedDate
    ? record.requestedDate
    : new Date().toISOString();

  return {
    id: typeof record?.id === 'string' && record.id ? record.id : createFinanceId('wd'),
    username: typeof record?.username === 'string' ? record.username : '',
    amount: roundMoney(Number(record?.amount ?? 0)),
    walletAddress: typeof record?.walletAddress === 'string' ? record.walletAddress : '',
    status: normalizeWithdrawalStatus(record?.status),
    requestedDate,
    method: sanitizeFinanceMethod(record?.method, 'USDT'),
    network: typeof record?.network === 'string' ? sanitizeFinanceMethod(record.network, '') : '',
    transactionId: typeof record?.transactionId === 'string' && record.transactionId ? record.transactionId : '',
    reviewedAt: typeof record?.reviewedAt === 'string' && record.reviewedAt ? record.reviewedAt : null,
    txHash: typeof record?.txHash === 'string' && record.txHash ? record.txHash : '',
    rejectionReason: typeof record?.rejectionReason === 'string' && record.rejectionReason ? record.rejectionReason : '',
    reviewerId: typeof record?.reviewerId === 'string' && record.reviewerId ? record.reviewerId : null,
    reviewerEmail: typeof record?.reviewerEmail === 'string' && record.reviewerEmail ? record.reviewerEmail : null,
  };
}

async function createTransactionRecord(input: {
  username: string;
  type: 'Deposit' | 'Withdrawal' | 'Commission';
  amount: number;
  status?: 'Pending' | 'Completed' | 'Rejected' | 'Failed';
  method?: string;
  txHash?: string;
  source?: string;
  description?: string;
  referenceId?: string;
}) {
  const transaction = buildTransactionRecord(input);
  await persistKvEntries([
    { key: `${TRANSACTION_KEY_PREFIX}${transaction.id}`, value: transaction },
    { key: `${TRANSACTION_USER_KEY_PREFIX}${transaction.username}:${transaction.id}`, value: transaction },
  ]);
  return transaction;
}

async function listTransactionRecords(username?: string) {
  const normalizedUsername = sanitizeUsername(username);
  if (normalizedUsername) {
    const userScopedRecords = await kv.getByPrefix(`${TRANSACTION_USER_KEY_PREFIX}${normalizedUsername}:`);
    if (userScopedRecords.length > 0) {
      return userScopedRecords
        .map((record) => normalizeTransactionRecord(record))
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
    }
  }

  const records = await kv.getByPrefix(TRANSACTION_KEY_PREFIX);
  const normalized = records
    .map((record) => normalizeTransactionRecord(record))
    .filter((record) => !normalizedUsername || record.username === normalizedUsername)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  if (normalizedUsername && normalized.length > 0) {
    const mirrorWrites = normalized.slice(0, 300).map((record) => ({
      key: `${TRANSACTION_USER_KEY_PREFIX}${normalizedUsername}:${record.id}`,
      value: record,
    }));

    if (mirrorWrites.length > 0) {
      await persistKvEntries(mirrorWrites).catch(() => {
        // Best-effort optimization path.
      });
    }
  }

  return normalized;
}

async function listWithdrawalRecords(username?: string) {
  const records = await kv.getByPrefix(WITHDRAWAL_KEY_PREFIX);
  return records
    .map((record) => normalizeWithdrawalRecord(record))
    .filter((record) => !username || record.username === username)
    .sort((left, right) => new Date(right.requestedDate).getTime() - new Date(left.requestedDate).getTime());
}

function snapshotFinancialState(user: any) {
  return {
    balance: roundMoney(Number(user?.balance ?? 0)),
    holdAmount: roundMoney(Number(user?.holdAmount ?? 0)),
    financialStateVersion: Number.isFinite(Number(user?.financialStateVersion))
      ? Math.max(0, Math.round(Number(user.financialStateVersion)))
      : 0,
  };
}

async function persistFinancialState(params: {
  username: string;
  user: any;
  operation: string;
  before: { balance: number; holdAmount: number; financialStateVersion: number };
  writes?: Array<{ key: string; value: unknown }>;
  ledgerMetadata?: Record<string, unknown>;
}) {
  const normalizedUser = normalizeUserRecord(params.user, params.username);
  const nextVersion = params.before.financialStateVersion + 1;
  normalizedUser.financialStateVersion = nextVersion;

  const ledgerRecord = buildFinancialLedgerRecord({
    username: params.username,
    operation: params.operation,
    stateVersion: nextVersion,
    balanceBefore: params.before.balance,
    balanceAfter: normalizedUser.balance,
    holdBefore: params.before.holdAmount,
    holdAfter: normalizedUser.holdAmount,
    metadata: params.ledgerMetadata,
  });

  const mirroredWrites = (params.writes ?? [])
    .filter((write) => typeof write?.key === 'string' && write.key.startsWith(TRANSACTION_KEY_PREFIX))
    .map((write) => normalizeTransactionRecord(write.value))
    .map((transaction) => ({
      key: `${TRANSACTION_USER_KEY_PREFIX}${sanitizeUsername(transaction.username) || params.username}:${transaction.id}`,
      value: transaction,
    }));

  await persistKvEntries([
    { key: `user:${params.username}`, value: normalizedUser },
    { key: `${FINANCIAL_LEDGER_KEY_PREFIX}${ledgerRecord.id}`, value: ledgerRecord },
    ...(params.writes ?? []),
    ...mirroredWrites,
  ]);

  return {
    user: normalizedUser,
    ledgerRecord,
  };
}

function defaultUserRecord(username: string) {
  return {
    username,
    vipLevel: 1,
    manualVipLevel: null as number | null,
    balance: 0,
    todayCommission: 0,
    lastCommissionResetDate: getCommissionDateKey(),
    holdAmount: 0,
    luckyBonus: 0,
    tasksCompleted: 0,
    tasksLimit: 10,
    taskSetCount: 2,
    tasksPerSet: defaultRewardsConfig.productSystem.productsPerSet,
    tasksCompletedInSet: 0,
    completedTaskSets: 0,
    pendingTaskReset: false,
    currentSetCommissionPlan: [] as number[],
    currentSetCommissionPlanMarker: 0,
    currentSetCommissionPlanGeneratedAt: null as string | null,
    taskSetCountOverride: null as number | null,
    tasksPerSetOverride: null as number | null,
    lastReset: getCommissionDateKey(),
    isFrozen: false,
    isSuspended: false,
    activePremium: null,
    premiumQueue: [],
    invitationCode: null,
    invitedByCode: null,
    referralEarnings: 0,
    children: [],
    workdayQualifiedDays: 0,
    lastQualifiedWorkdayDate: null as string | null,
    claimedWorkdayRewardIds: [] as number[],
    claimedResetRewardIds: [] as number[],
    accumulatedRewardClaims: {} as Record<string, { tierId: number; depositTotal: number; rewardCredited: number; creditedAt: string }> ,
    referredByAdminId: null as string | null,
    walletProfile: null as WalletProfile | null,
    phone: '',
    gender: '',
    lastLoginAt: null as string | null,
    lastLoginIp: null as string | null,
    lastLoginLocation: null as string | null,
    lastActivityAt: null as string | null,
    lastActivityIp: null as string | null,
    lastActivityLocation: null as string | null,
    createdAt: new Date().toISOString(),
    creditScore: 100,
    financialStateVersion: 0,
  };
}

function normalizeUserRecord(userData: any, username: string) {
  const normalized = {
    ...defaultUserRecord(username),
    ...(typeof userData === 'object' && userData ? userData : {}),
  };

  normalized.username = username;
  normalized.balance = Number.isFinite(Number(normalized.balance)) ? Number(normalized.balance) : 0;
  normalized.todayCommission = Number.isFinite(Number(normalized.todayCommission)) ? Number(normalized.todayCommission) : 0;
  normalized.holdAmount = Number.isFinite(Number(normalized.holdAmount)) ? Number(normalized.holdAmount) : 0;
  normalized.luckyBonus = Number.isFinite(Number(normalized.luckyBonus)) ? Number(normalized.luckyBonus) : 0;
  normalized.tasksCompleted = Number.isFinite(Number(normalized.tasksCompleted)) ? Number(normalized.tasksCompleted) : 0;
  normalized.tasksLimit = Number.isFinite(Number(normalized.tasksLimit)) ? Number(normalized.tasksLimit) : 40;
  normalized.taskSetCountOverride = Number.isFinite(Number(normalized.taskSetCountOverride))
    ? Math.max(1, Math.round(Number(normalized.taskSetCountOverride)))
    : null;
  normalized.tasksPerSetOverride = Number.isFinite(Number(normalized.tasksPerSetOverride))
    ? Math.max(1, Math.round(Number(normalized.tasksPerSetOverride)))
    : null;
  normalized.taskSetCount = Number.isFinite(Number(normalized.taskSetCount))
    ? Math.max(1, Math.round(Number(normalized.taskSetCount)))
    : 2;
  normalized.manualVipLevel = Number.isFinite(Number(normalized.manualVipLevel))
    ? Math.max(1, Math.min(5, Math.round(Number(normalized.manualVipLevel))))
    : null;
  normalized.tasksPerSet = Number.isFinite(Number(normalized.tasksPerSet))
    ? Math.max(1, Math.round(Number(normalized.tasksPerSet)))
    : defaultRewardsConfig.productSystem.productsPerSet;
  normalized.tasksCompletedInSet = Number.isFinite(Number(normalized.tasksCompletedInSet))
    ? Math.max(0, Math.round(Number(normalized.tasksCompletedInSet)))
    : 0;
  normalized.completedTaskSets = Number.isFinite(Number(normalized.completedTaskSets))
    ? Math.max(0, Math.round(Number(normalized.completedTaskSets)))
    : 0;
  normalized.pendingTaskReset = Boolean(normalized.pendingTaskReset);
  normalized.isSuspended = Boolean(normalized.isSuspended);
  normalized.referralEarnings = Number.isFinite(Number(normalized.referralEarnings)) ? Number(normalized.referralEarnings) : 0;
  normalized.children = Array.isArray(normalized.children) ? normalized.children : [];
  normalized.workdayQualifiedDays = Number.isFinite(Number(normalized.workdayQualifiedDays))
    ? Math.max(0, Math.round(Number(normalized.workdayQualifiedDays)))
    : 0;
  normalized.lastQualifiedWorkdayDate = typeof normalized.lastQualifiedWorkdayDate === 'string' && normalized.lastQualifiedWorkdayDate
    ? normalized.lastQualifiedWorkdayDate
    : null;
  normalized.claimedWorkdayRewardIds = Array.isArray(normalized.claimedWorkdayRewardIds)
    ? Array.from(new Set(
      normalized.claimedWorkdayRewardIds
        .map((value: any) => Number(value))
        .filter((value: number) => Number.isFinite(value) && value > 0)
        .map((value: number) => Math.round(value)),
    ))
    : [];
  normalized.claimedResetRewardIds = Array.isArray(normalized.claimedResetRewardIds)
    ? Array.from(new Set(
      normalized.claimedResetRewardIds
        .map((value: any) => Number(value))
        .filter((value: number) => Number.isFinite(value) && value > 0)
        .map((value: number) => Math.round(value)),
    ))
    : [];
  if (!normalized.accumulatedRewardClaims || typeof normalized.accumulatedRewardClaims !== 'object') {
    normalized.accumulatedRewardClaims = {};
  }
  normalized.referredByAdminId = typeof normalized.referredByAdminId === 'string' && normalized.referredByAdminId
    ? normalized.referredByAdminId
    : null;
  normalized.walletProfile = normalizeStoredWalletProfile(normalized.walletProfile);
  normalized.phone = typeof normalized.phone === 'string' ? normalized.phone : '';
  normalized.gender = typeof normalized.gender === 'string' ? normalized.gender : '';
  normalized.createdAt = typeof normalized.createdAt === 'string' && normalized.createdAt
    ? normalized.createdAt
    : new Date().toISOString();
  normalized.lastLoginAt = typeof normalized.lastLoginAt === 'string' && normalized.lastLoginAt
    ? normalized.lastLoginAt
    : null;
  normalized.lastLoginIp = typeof normalized.lastLoginIp === 'string' && normalized.lastLoginIp
    ? normalized.lastLoginIp
    : null;
  normalized.lastLoginLocation = typeof normalized.lastLoginLocation === 'string' && normalized.lastLoginLocation
    ? normalized.lastLoginLocation
    : null;
  normalized.lastActivityAt = typeof normalized.lastActivityAt === 'string' && normalized.lastActivityAt
    ? normalized.lastActivityAt
    : null;
  normalized.lastActivityIp = typeof normalized.lastActivityIp === 'string' && normalized.lastActivityIp
    ? normalized.lastActivityIp
    : null;
  normalized.lastActivityLocation = typeof normalized.lastActivityLocation === 'string' && normalized.lastActivityLocation
    ? normalized.lastActivityLocation
    : null;

  normalized.creditScore = Number.isFinite(Number(normalized.creditScore))
    ? Math.min(100, Math.max(0, Math.round(Number(normalized.creditScore))))
    : 100;
  normalized.financialStateVersion = Number.isFinite(Number(normalized.financialStateVersion))
    ? Math.max(0, Math.round(Number(normalized.financialStateVersion)))
    : 0;
  normalized.currentSetCommissionPlan = Array.isArray(normalized.currentSetCommissionPlan)
    ? normalized.currentSetCommissionPlan
      .map((value: any) => roundMoney(Number(value)))
      .filter((value: number) => Number.isFinite(value) && value > 0)
    : [];
  normalized.currentSetCommissionPlanMarker = Number.isFinite(Number(normalized.currentSetCommissionPlanMarker))
    ? Math.max(0, Math.round(Number(normalized.currentSetCommissionPlanMarker)))
    : Math.max(
      0,
      Math.round(Number(normalized.tasksCompleted ?? 0) - Number(normalized.tasksCompletedInSet ?? 0)),
    );
  normalized.currentSetCommissionPlanGeneratedAt = typeof normalized.currentSetCommissionPlanGeneratedAt === 'string'
    && normalized.currentSetCommissionPlanGeneratedAt
    ? normalized.currentSetCommissionPlanGeneratedAt
    : null;
  
  // Reset todayCommission if a new day has started
  const today = getCommissionDateKey();
  const lastResetDate = typeof normalized.lastCommissionResetDate === 'string' ? normalized.lastCommissionResetDate : '';
  if (lastResetDate !== today) {
    normalized.todayCommission = 0;
    normalized.lastCommissionResetDate = today;
  }

  return normalized;
}

function buildTransactionRecord(input: {
  username: string;
  type: 'Deposit' | 'Withdrawal' | 'Commission';
  amount: number;
  status?: 'Pending' | 'Completed' | 'Rejected' | 'Failed';
  method?: string;
  txHash?: string;
  source?: string;
  description?: string;
  referenceId?: string;
}) {
  const timestamp = new Date().toISOString();
  return normalizeTransactionRecord({
    id: createFinanceId('tx'),
    username: input.username,
    type: input.type,
    amount: roundMoney(input.amount),
    status: input.status ?? 'Completed',
    method: input.method ?? 'System',
    txHash: input.txHash ?? '',
    source: input.source ?? 'system',
    description: input.description ?? '',
    referenceId: input.referenceId ?? '',
    createdAt: timestamp,
    updatedAt: timestamp,
    date: timestamp,
  });
}

function buildFinancialLedgerRecord(input: {
  username: string;
  operation: string;
  stateVersion: number;
  balanceBefore: number;
  balanceAfter: number;
  holdBefore: number;
  holdAfter: number;
  metadata?: Record<string, unknown>;
}) {
  const createdAt = new Date().toISOString();
  return {
    id: createFinanceId('led'),
    username: input.username,
    operation: input.operation,
    stateVersion: input.stateVersion,
    balanceBefore: roundMoney(input.balanceBefore),
    balanceAfter: roundMoney(input.balanceAfter),
    holdBefore: roundMoney(input.holdBefore),
    holdAfter: roundMoney(input.holdAfter),
    metadata: input.metadata ?? {},
    createdAt,
  };
}

async function persistKvEntries(entries: Array<{ key: string; value: unknown }>): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  await kv.mset(
    entries.map((entry) => entry.key),
    entries.map((entry) => entry.value),
  );
}

async function acquireDistributedLock(lockName: string, timeoutMs = 8_000, leaseMs = 30_000): Promise<() => Promise<void>> {
  const lockKey = `${DISTRIBUTED_LOCK_KEY_PREFIX}${lockName}`;
  const startedAt = Date.now();
  const ownerToken = crypto.randomUUID();

  while (Date.now() - startedAt < timeoutMs) {
    const expiresAt = new Date(Date.now() + leaseMs).toISOString();
    const acquired = await kv.setIfNotExists(lockKey, {
      token: ownerToken,
      expiresAt,
      createdAt: new Date().toISOString(),
    });
    if (acquired) {
      return async () => {
        try {
          await kv.delIfJsonFieldMatches(lockKey, 'token', ownerToken);
        } catch {
          // Best-effort release. The lease keeps stale locks bounded.
        }
      };
    }

    const existing = await kv.get(lockKey);
    const expiresAtMs = Date.parse(String(existing?.expiresAt ?? ''));
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
      await kv.del(lockKey).catch(() => undefined);
    }

    await delay(50);
  }

  throw new Error(`Timed out acquiring distributed lock '${lockName}'`);
}

async function withDistributedLock<T>(lockName: string, work: () => Promise<T>): Promise<T> {
  const release = await acquireDistributedLock(lockName);
  try {
    return await work();
  } finally {
    await release();
  }
}

async function withUserFinancialLock<T>(username: string, work: () => Promise<T>): Promise<T> {
  return withDistributedLock(`financial:${username}`, work);
}

async function syncUserWithVipConfig(userData: any, username: string) {
  const normalized = normalizeUserRecord(userData, username);
  const persistedVipLevel = Number.isFinite(Number(normalized.vipLevel))
    ? Math.max(1, Math.round(Number(normalized.vipLevel)))
    : 1;

  const targetVipLevel = Number.isFinite(Number(normalized.manualVipLevel))
    ? Math.max(1, Math.min(5, Math.round(Number(normalized.manualVipLevel))))
    : persistedVipLevel;
  const vipConfig = await getVipConfigForLevel(targetVipLevel);
  const previousVipLevel = Number.isFinite(Number(normalized.vipLevel))
    ? Math.max(1, Math.round(Number(normalized.vipLevel)))
    : vipConfig.level;

  // VIP chart is the primary source of truth for required products/tasks per user.
  // New users default to two sets, while admin overrides remain authoritative.
  const platformSettings = sanitizeAdminPlatformSettings(await kv.get(ADMIN_PLATFORM_SETTINGS_KEY));
  const defaultVipTaskSetCount = platformSettings.defaultTaskSetCount ?? 2;
  const vipTaskBaselineByLevel: Record<number, number> = {
    1: 40,
    2: 45,
    3: 50,
    4: 55,
    5: 60,
  };
  const configuredTasksPerSet = Math.max(1, Math.round(Number(vipConfig.dailyTasks ?? 1)));
  const baselineTasksPerSet = vipTaskBaselineByLevel[vipConfig.level] ?? configuredTasksPerSet;
  const defaultVipTasksPerSet = Math.max(configuredTasksPerSet, baselineTasksPerSet);

  normalized.vipLevel = vipConfig.level;

  if (previousVipLevel !== vipConfig.level) {
    // Tier changed due to balance threshold crossing; invalidate stale set plan.
    normalized.currentSetCommissionPlan = [];
    normalized.currentSetCommissionPlanGeneratedAt = null;
    normalized.currentSetCommissionPlanMarker = Math.max(
      0,
      Math.round(Number(normalized.tasksCompleted ?? 0) - Number(normalized.tasksCompletedInSet ?? 0)),
    );
  }
  normalized.taskSetCount = normalized.taskSetCountOverride ?? defaultVipTaskSetCount;
  // Tasks per set is always derived from VIP tier dailyTasks.
  normalized.tasksPerSetOverride = null;
  normalized.tasksPerSet = defaultVipTasksPerSet;
  normalized.tasksLimit = normalized.taskSetCount * normalized.tasksPerSet;
  normalized.completedTaskSets = Math.min(
    Math.max(0, normalized.completedTaskSets),
    normalized.taskSetCount,
  );
  normalized.tasksCompletedInSet = Math.min(
    Math.max(0, normalized.tasksCompletedInSet),
    normalized.tasksPerSet,
  );
  // Derive tasksCompleted from set-level counters so it stays consistent after
  // admin resets and VIP-config changes.  This replaces the old raw-accumulator
  // approach that could drift when tasksLimit changed.
  normalized.tasksCompleted = Math.min(
    Math.max(0, (normalized.completedTaskSets * normalized.tasksPerSet) + normalized.tasksCompletedInSet),
    normalized.tasksLimit,
  );

  if (normalized.completedTaskSets >= normalized.taskSetCount) {
    // Do NOT clear pendingTaskReset or zero the in-set counter here. Progress
    // must remain stable across refreshes until admin task controls explicitly reset it.
  }

  return normalized;
}

function extractIsoDatePrefix(value: string): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.slice(0, 10) : null;
}

async function applyAutomaticRewardsForUser(username: string, userData: any) {
  const normalizedUser = normalizeUserRecord(userData, username);
  const rewardsConfig = await getRewardsConfigRecord();
  const today = getCommissionDateKey();
  const rewardsApplied: Array<{ category: 'workday' | 'reset' | 'accumulated'; amount: number; reference: string }> = [];

  const creditReward = async (
    category: 'workday' | 'reset' | 'accumulated',
    amount: number,
    source: string,
    description: string,
    reference: string,
  ) => {
    const safeAmount = roundMoney(Number(amount));
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
      return;
    }

    normalizedUser.balance = roundMoney(Number(normalizedUser.balance ?? 0) + safeAmount);
    normalizedUser.todayCommission = roundMoney(Number(normalizedUser.todayCommission ?? 0) + safeAmount);
    rewardsApplied.push({ category, amount: safeAmount, reference });

    await createTransactionRecord({
      username,
      type: 'Commission',
      amount: safeAmount,
      method: 'Auto Reward',
      source,
      description,
      referenceId: reference,
    });
  };

  if (Number(normalizedUser.tasksLimit ?? 0) > 0 && Number(normalizedUser.tasksCompleted ?? 0) >= Number(normalizedUser.tasksLimit ?? 0)) {
    if (normalizedUser.lastQualifiedWorkdayDate !== today) {
      normalizedUser.workdayQualifiedDays = Math.max(0, Number(normalizedUser.workdayQualifiedDays ?? 0)) + 1;
      normalizedUser.lastQualifiedWorkdayDate = today;
    }
  }

  const workdayRewards = Array.isArray(rewardsConfig.workday)
    ? rewardsConfig.workday
      .filter((reward: any) => reward?.enabled)
      .sort((left: any, right: any) => Number(left?.days ?? 0) - Number(right?.days ?? 0))
    : [];

  for (const reward of workdayRewards) {
    const rewardId = Math.round(Number(reward?.id ?? 0));
    const requiredDays = Math.max(1, Math.round(Number(reward?.days ?? 0)));
    const salary = roundMoney(Number(reward?.salary ?? 0));
    if (!rewardId || salary <= 0) {
      continue;
    }

    const alreadyClaimed = normalizedUser.claimedWorkdayRewardIds.includes(rewardId);
    if (!alreadyClaimed && Number(normalizedUser.workdayQualifiedDays ?? 0) >= requiredDays) {
      await creditReward(
        'workday',
        salary,
        'workday_reward',
        `Workday reward milestone credited (${requiredDays} days)`,
        `workday:${rewardId}:${requiredDays}`,
      );
      normalizedUser.claimedWorkdayRewardIds.push(rewardId);
    }
  }

  const transactions = await listTransactionRecords(username);
  const completedDeposits = transactions.filter((transaction) => transaction.type === 'Deposit' && transaction.status === 'Completed');
  const lifetimeDepositTotal = roundMoney(
    completedDeposits.reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0),
  );

  const resetRewards = Array.isArray(rewardsConfig.reset)
    ? rewardsConfig.reset
      .filter((reward: any) => reward?.enabled)
      .sort((left: any, right: any) => Number(left?.deposit ?? 0) - Number(right?.deposit ?? 0))
    : [];

  for (const reward of resetRewards) {
    const rewardId = Math.round(Number(reward?.id ?? 0));
    const requiredDeposit = roundMoney(Number(reward?.deposit ?? 0));
    const bonus = roundMoney(Number(reward?.reward ?? 0));
    if (!rewardId || requiredDeposit <= 0 || bonus <= 0) {
      continue;
    }

    const alreadyClaimed = normalizedUser.claimedResetRewardIds.includes(rewardId);
    if (!alreadyClaimed && lifetimeDepositTotal >= requiredDeposit) {
      await creditReward(
        'reset',
        bonus,
        'reset_advance_reward',
        `Reset advance reward credited (deposit threshold: $${requiredDeposit})`,
        `reset:${rewardId}:${requiredDeposit}`,
      );
      normalizedUser.claimedResetRewardIds.push(rewardId);
    }
  }

  const todayDepositTotal = roundMoney(
    completedDeposits
      .filter((transaction) => extractIsoDatePrefix(String(transaction.date ?? transaction.createdAt ?? '')) === today)
      .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0),
  );

  const accumulatedRewards = Array.isArray(rewardsConfig.accumulated)
    ? rewardsConfig.accumulated
      .filter((reward: any) => reward?.enabled)
      .sort((left: any, right: any) => Number(left?.minDeposit ?? 0) - Number(right?.minDeposit ?? 0))
    : [];

  const claimsSource = normalizedUser.accumulatedRewardClaims && typeof normalizedUser.accumulatedRewardClaims === 'object'
    ? normalizedUser.accumulatedRewardClaims
    : {};

  const normalizedClaims: Record<string, { tierId: number; depositTotal: number; rewardCredited: number; creditedAt: string }> = {};
  for (const [claimDate, claimValue] of Object.entries(claimsSource)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(claimDate) || !claimValue || typeof claimValue !== 'object') {
      continue;
    }
    normalizedClaims[claimDate] = {
      tierId: Math.max(1, Math.round(Number((claimValue as any).tierId ?? 1))),
      depositTotal: roundMoney(Number((claimValue as any).depositTotal ?? 0)),
      rewardCredited: roundMoney(Number((claimValue as any).rewardCredited ?? 0)),
      creditedAt: typeof (claimValue as any).creditedAt === 'string' && (claimValue as any).creditedAt
        ? String((claimValue as any).creditedAt)
        : new Date().toISOString(),
    };
  }

  if (todayDepositTotal > 0 && accumulatedRewards.length > 0) {
    const eligibleTier = [...accumulatedRewards].reverse().find((reward: any) => {
      const minDeposit = roundMoney(Number(reward?.minDeposit ?? 0));
      const maxDeposit = reward?.maxDeposit == null ? null : roundMoney(Number(reward.maxDeposit));
      if (todayDepositTotal < minDeposit) {
        return false;
      }
      if (maxDeposit != null && todayDepositTotal > maxDeposit) {
        return false;
      }
      return true;
    });

    if (eligibleTier) {
      const tierId = Math.round(Number(eligibleTier?.id ?? 0));
      const rate = Number(eligibleTier?.rate ?? 0);
      const targetReward = roundMoney(todayDepositTotal * rate);
      const existingClaim = normalizedClaims[today];
      const alreadyCredited = roundMoney(Number(existingClaim?.rewardCredited ?? 0));
      const incrementalReward = roundMoney(targetReward - alreadyCredited);

      if (tierId > 0 && Number.isFinite(rate) && rate > 0 && incrementalReward > 0) {
        await creditReward(
          'accumulated',
          incrementalReward,
          'accumulated_deposit_reward',
          `Accumulated daily deposit reward credited (${(rate * 100).toFixed(2)}%)`,
          `accumulated:${today}:${tierId}`,
        );
      }

      normalizedClaims[today] = {
        tierId: tierId > 0 ? tierId : existingClaim?.tierId ?? 1,
        depositTotal: todayDepositTotal,
        rewardCredited: roundMoney(alreadyCredited + Math.max(0, incrementalReward)),
        creditedAt: new Date().toISOString(),
      };
    }
  }

  normalizedUser.accumulatedRewardClaims = normalizedClaims;

  return {
    normalizedUser,
    rewardsApplied,
  };
}

function buildUserTaskProgress(userData: any) {
  return {
    taskSetCount: Number(userData?.taskSetCount ?? 1),
    tasksPerSet: Number(userData?.tasksPerSet ?? 1),
    tasksCompleted: Number(userData?.tasksCompleted ?? 0),
    tasksCompletedInSet: Number(userData?.tasksCompletedInSet ?? 0),
    completedTaskSets: Number(userData?.completedTaskSets ?? 0),
    tasksLimit: Number(userData?.tasksLimit ?? 0),
    pendingTaskReset: Boolean(userData?.pendingTaskReset),
  };
}

function resolveVipCommissionRangeConfig(vipConfig: any, tasksPerSet: number) {
  const safeTasksPerSet = Math.max(1, Math.round(Number(tasksPerSet ?? 1)));
  const commissionRate = Number(vipConfig?.commission ?? 0);
  const taskPriceMin = roundMoney(Number(vipConfig?.taskPriceMin ?? 0));
  const taskPriceMax = roundMoney(Number(vipConfig?.taskPriceMax ?? 0));

  if (!Number.isFinite(commissionRate) || commissionRate <= 0) {
    return null;
  }

  if (!(taskPriceMin > 0 && taskPriceMax > 0 && taskPriceMax >= taskPriceMin)) {
    return null;
  }

  const perTaskMinCommission = roundMoney(taskPriceMin * commissionRate);
  const perTaskMaxCommission = roundMoney(taskPriceMax * commissionRate);
  if (!(perTaskMinCommission > 0 && perTaskMaxCommission >= perTaskMinCommission)) {
    return null;
  }

  const minTotalCommission = roundMoney(perTaskMinCommission * safeTasksPerSet);
  const maxTotalCommission = roundMoney(perTaskMaxCommission * safeTasksPerSet);
  if (!(maxTotalCommission >= minTotalCommission && maxTotalCommission > 0)) {
    return null;
  }

  return {
    tasksPerSet: safeTasksPerSet,
    commissionRate,
    taskPriceMin,
    taskPriceMax,
    perTaskMinCommission,
    perTaskMaxCommission,
    minTotalCommission,
    maxTotalCommission,
  };
}

function isTaskPriceValidForRange(taskPrice: number, rangeConfig: ReturnType<typeof resolveVipCommissionRangeConfig>) {
  if (!rangeConfig) {
    return true;
  }
  const normalizedTaskPrice = roundMoney(Number(taskPrice ?? 0));
  return normalizedTaskPrice >= rangeConfig.taskPriceMin
    && normalizedTaskPrice <= rangeConfig.taskPriceMax;
}

function collectTierTaskCandidates(
  taskCatalog: any[],
  vipLevel: number,
  rangeConfig: ReturnType<typeof resolveVipCommissionRangeConfig>,
) {
  const activeTasks = taskCatalog.filter((task) => task?.status === 'Active');
  if (activeTasks.length === 0) {
    return [];
  }

  if (rangeConfig) {
    const inRange = activeTasks.filter((task) => isTaskPriceValidForRange(task?.price, rangeConfig));
    const tierTaggedInRange = inRange.filter((task) => Number(task?.vipTier ?? 0) === vipLevel);
    return tierTaggedInRange.length > 0 ? tierTaggedInRange : inRange;
  }

  const tierTagged = activeTasks.filter((task) => Number(task?.vipTier ?? 0) === vipLevel);
  if (tierTagged.length > 0) {
    return tierTagged;
  }

  return activeTasks;
}

function pickClosestTaskByPrice(candidates: any[], targetPrice: number) {
  if (candidates.length === 0) {
    return null;
  }

  const normalizedTarget = roundMoney(Number(targetPrice ?? 0));
  return candidates.reduce((closest, task) => {
    if (!closest) {
      return task;
    }
    const closestDelta = Math.abs(roundMoney(Number(closest.price ?? 0)) - normalizedTarget);
    const taskDelta = Math.abs(roundMoney(Number(task?.price ?? 0)) - normalizedTarget);
    return taskDelta < closestDelta ? task : closest;
  }, null as any);
}

function buildControlledCommissionPlan(rangeConfig: ReturnType<typeof resolveVipCommissionRangeConfig>) {
  if (!rangeConfig) {
    return null;
  }

  const minTotalCents = toMoneyCents(rangeConfig.minTotalCommission);
  const maxTotalCents = toMoneyCents(rangeConfig.maxTotalCommission);
  const perTaskMinCents = toMoneyCents(rangeConfig.perTaskMinCommission);
  const perTaskMaxCents = toMoneyCents(rangeConfig.perTaskMaxCommission);
  const taskCount = rangeConfig.tasksPerSet;

  if (taskCount <= 0 || perTaskMaxCents < perTaskMinCents) {
    return null;
  }

  const targetTotalCents = randomIntInclusive(minTotalCents, maxTotalCents);
  const baseTotalCents = perTaskMinCents * taskCount;
  const perTaskCapacityCents = perTaskMaxCents - perTaskMinCents;
  const totalCapacityCents = perTaskCapacityCents * taskCount;

  if (targetTotalCents < baseTotalCents || targetTotalCents > baseTotalCents + totalCapacityCents) {
    return null;
  }

  const increments = Array.from({ length: taskCount }, () => 0);
  const remainingCapacity = Array.from({ length: taskCount }, () => perTaskCapacityCents);
  let remainingExtraCents = targetTotalCents - baseTotalCents;

  while (remainingExtraCents > 0) {
    const candidates = remainingCapacity
      .map((capacity, index) => ({ capacity, index }))
      .filter((entry) => entry.capacity > 0);

    if (candidates.length === 0) {
      return null;
    }

    const selected = candidates[randomIntInclusive(0, candidates.length - 1)];
    const stepUpper = Math.max(1, Math.min(selected.capacity, remainingExtraCents, 25));
    const step = randomIntInclusive(1, stepUpper);

    increments[selected.index] += step;
    remainingCapacity[selected.index] -= step;
    remainingExtraCents -= step;
  }

  const planCents = increments.map((extra) => perTaskMinCents + extra);
  if (
    perTaskCapacityCents > 0
    && taskCount > 1
    && new Set(planCents).size <= 1
  ) {
    return null;
  }

  return planCents.map((value) => roundMoney(value / 100));
}

function isControlledCommissionPlanValid(
  plan: number[],
  rangeConfig: ReturnType<typeof resolveVipCommissionRangeConfig>,
) {
  if (!rangeConfig || !Array.isArray(plan) || plan.length !== rangeConfig.tasksPerSet) {
    return false;
  }

  const total = roundMoney(plan.reduce((sum, value) => sum + Number(value ?? 0), 0));
  if (total < rangeConfig.minTotalCommission || total > rangeConfig.maxTotalCommission) {
    return false;
  }

  const outOfBounds = plan.some((value) => {
    const normalized = roundMoney(Number(value ?? 0));
    return normalized < rangeConfig.perTaskMinCommission || normalized > rangeConfig.perTaskMaxCommission;
  });
  if (outOfBounds) {
    return false;
  }

  if (
    rangeConfig.perTaskMaxCommission > rangeConfig.perTaskMinCommission
    && rangeConfig.tasksPerSet > 1
    && new Set(plan.map((value) => roundMoney(value))).size <= 1
  ) {
    return false;
  }

  return true;
}

function ensureUserControlledCommissionPlanForCurrentSet(userData: any, vipConfig: any) {
  const tasksPerSet = Math.max(1, Math.round(Number(userData?.tasksPerSet ?? 1)));
  const rangeConfig = resolveVipCommissionRangeConfig(vipConfig, tasksPerSet);

  if (!rangeConfig) {
    userData.currentSetCommissionPlan = [];
    userData.currentSetCommissionPlanGeneratedAt = null;
    userData.currentSetCommissionPlanMarker = Math.max(
      0,
      Math.round(Number(userData?.tasksCompleted ?? 0) - Number(userData?.tasksCompletedInSet ?? 0)),
    );
    return {
      controlled: false,
      rangeConfig: null,
      plan: [],
    };
  }

  const setMarker = Math.max(
    0,
    Math.round(Number(userData?.tasksCompleted ?? 0) - Number(userData?.tasksCompletedInSet ?? 0)),
  );
  const existingPlan = Array.isArray(userData?.currentSetCommissionPlan)
    ? userData.currentSetCommissionPlan
      .map((value: any) => roundMoney(Number(value)))
      .filter((value: number) => Number.isFinite(value) && value > 0)
    : [];
  const currentMarker = Number.isFinite(Number(userData?.currentSetCommissionPlanMarker))
    ? Math.max(0, Math.round(Number(userData.currentSetCommissionPlanMarker)))
    : -1;

  const needsRegeneration =
    currentMarker !== setMarker
    || !isControlledCommissionPlanValid(existingPlan, rangeConfig);

  if (!needsRegeneration) {
    return {
      controlled: true,
      rangeConfig,
      plan: existingPlan,
    };
  }

  for (let attempt = 0; attempt < COMMISSION_PLAN_MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = buildControlledCommissionPlan(rangeConfig);
    if (!candidate) {
      continue;
    }
    if (!isControlledCommissionPlanValid(candidate, rangeConfig)) {
      continue;
    }

    userData.currentSetCommissionPlan = candidate;
    userData.currentSetCommissionPlanMarker = setMarker;
    userData.currentSetCommissionPlanGeneratedAt = new Date().toISOString();
    return {
      controlled: true,
      rangeConfig,
      plan: candidate,
    };
  }

  userData.currentSetCommissionPlan = [];
  userData.currentSetCommissionPlanMarker = setMarker;
  userData.currentSetCommissionPlanGeneratedAt = null;
  return {
    controlled: false,
    rangeConfig,
    plan: [],
  };
}

async function getUserRecordWithDailyReset(username: string) {
  const canonicalUsername = (await resolveCanonicalUsername(username)) ?? username;
  const userKey = `user:${canonicalUsername}`;
  const userData = await kv.get(userKey);
  const normalizedUserData = userData
    ? await syncUserWithVipConfig(userData, canonicalUsername)
    : await getOrCreateUserRecord(canonicalUsername);

  return {
    canonicalUsername,
    normalizedUserData,
  };
}

function restoreUserToNaturalState(userData: any) {
  const restored = { ...userData };
  const currentBalance = roundMoney(Number(restored.balance ?? 0));
  const preFreezeBalance = Number.isFinite(Number(restored?.activePremium?.balanceBeforeAssignment))
    ? roundMoney(Number(restored.activePremium.balanceBeforeAssignment))
    : currentBalance;
  const preservedHoldAmount = roundMoney(Math.max(0, Number(restored.holdAmount ?? 0)));
  const configuredUpholdAmount = Number.isFinite(Number(restored?.activePremium?.configuredUpholdAmount))
    ? roundMoney(Math.max(0, Number(restored.activePremium.configuredUpholdAmount)))
    : 0;
  const outstandingTopUp = Number.isFinite(Number(restored?.activePremium?.topUpRequired ?? restored?.activePremium?.negativeAmount))
    ? roundMoney(Math.max(0, Number(restored.activePremium.topUpRequired ?? restored.activePremium.negativeAmount)))
    : 0;
  const settledUpholdAmount = roundMoney(Math.max(outstandingTopUp, configuredUpholdAmount, preservedHoldAmount));
  const premiumCommission = Number.isFinite(Number(restored?.activePremium?.commissionEarned))
    ? roundMoney(Math.max(0, Number(restored.activePremium.commissionEarned)))
    : 0;
  const settledBalanceTarget = roundMoney(preFreezeBalance + settledUpholdAmount + premiumCommission);

  restored.balance = settledBalanceTarget;
  restored.holdAmount = 0;
  restored.isFrozen = false;

  if (restored.activePremium && typeof restored.activePremium === 'object') {
    restored.activePremium = {
      ...restored.activePremium,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    };
  }

  restored.activePremium = null;
  restored.premiumQueue = [];
  return restored;
}

function sumCompletedCommissionTransactions(transactions: any[], dayKey: string): number {
  const total = transactions
    .filter((tx) => {
      if (tx?.type !== 'Commission' || String(tx?.status ?? 'Completed').toLowerCase() !== 'completed') {
        return false;
      }
      const txDate = extractIsoDatePrefix(typeof tx?.date === 'string' ? tx.date : tx?.createdAt);
      return txDate === dayKey;
    })
    .reduce((sum, tx) => sum + Number(tx?.amount ?? 0), 0);
  return roundMoney(total);
}

function parseIsoDateMs(value: unknown): number | null {
  if (typeof value !== 'string' || !value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function syncUsersForVipLevels(levels: number[]) {
  const targetLevels = new Set(levels.map((level) => Math.max(1, Math.round(level))));
  const summaries = levels.map((level) => ({
    level,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[],
  }));

  const summaryByLevel = new Map<number, typeof summaries[number]>();
  for (const summary of summaries) {
    summaryByLevel.set(summary.level, summary);
  }

  const allUsers = await kv.getEntriesByPrefix('user:');
  for (const rawUser of allUsers) {
    const username = getUsernameFromUserKvEntry(rawUser);
    if (!username) {
      continue;
    }

    const normalizedUser = normalizeUserRecord(rawUser.value, username);
    const level = Math.max(1, Math.round(Number(normalizedUser.vipLevel ?? 1)));
    if (!targetLevels.has(level)) {
      continue;
    }

    const summary = summaryByLevel.get(level);
    if (!summary) {
      continue;
    }

    summary.processed += 1;
    try {
      const syncedUser = await syncUserWithVipConfig(normalizedUser, username);
      await kv.set(`user:${username}`, syncedUser);
      summary.succeeded += 1;
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      summary.errors.push(`${username}: ${message}`);
      console.error(`Failed VIP sync for user ${username} at level ${level}:`, error);
    }
  }

  return summaries;
}

async function getOrCreateUserRecord(username: string) {
  const canonicalUsername = (await resolveCanonicalUsername(username)) ?? username;
  const userKey = `user:${canonicalUsername}`;
  const userData = await kv.get(userKey);

  if (!userData) {
    const created = await syncUserWithVipConfig(defaultUserRecord(canonicalUsername), canonicalUsername);
    await kv.set(userKey, created);
    await assignUsernameLookup(canonicalUsername);
    return created;
  }

  const normalized = await syncUserWithVipConfig(userData, canonicalUsername);
  await kv.set(userKey, normalized);
  await assignUsernameLookup(canonicalUsername);
  return normalized;
}

function getUsernameFromUserKvEntry(entry: { key?: unknown; value?: any } | null | undefined): string | null {
  const embeddedUsername = sanitizeUsername(entry?.value?.username ?? entry?.value?.userName);
  if (embeddedUsername) {
    return embeddedUsername;
  }

  const key = typeof entry?.key === 'string' ? entry.key : '';
  if (!key.startsWith('user:')) {
    return null;
  }

  return sanitizeUsername(key.slice('user:'.length));
}

async function ensureRootReferralUser() {
  const rootUser = await getOrCreateUserRecord(ROOT_REFERRAL_USERNAME);
  rootUser.invitationCode = ROOT_REFERRAL_INVITE_CODE;
  await kv.set(`user:${ROOT_REFERRAL_USERNAME}`, rootUser);
  await kv.set(`referral:invite:${ROOT_REFERRAL_INVITE_CODE}`, ROOT_REFERRAL_USERNAME);
}

async function creditParentReferralFromChildCommission(childUsername: string, childCommission: number) {
  if (!Number.isFinite(childCommission) || childCommission <= 0) {
    return { rewarded: false, parentReward: 0 };
  }

  const childUser = await getOrCreateUserRecord(childUsername);
  const invitedByCode = sanitizeInviteCode(childUser.invitedByCode);
  if (!invitedByCode) {
    return { rewarded: false, parentReward: 0 };
  }

  const parentUsername = await kv.get(`referral:invite:${invitedByCode}`);
  if (!parentUsername || typeof parentUsername !== 'string' || parentUsername === childUsername) {
    return { rewarded: false, parentReward: 0 };
  }

  const parentUser = await getOrCreateUserRecord(parentUsername);
  const parentReward = roundMoney(childCommission * REFERRAL_PARENT_RATE);
  if (parentReward <= 0) {
    return { rewarded: false, parentReward: 0 };
  }

  await withUserFinancialLock(parentUsername, async () => {
    const lockedParentUser = await getOrCreateUserRecord(parentUsername);
    const before = snapshotFinancialState(lockedParentUser);

    lockedParentUser.balance = roundMoney(Number(lockedParentUser.balance ?? 0) + parentReward);
    lockedParentUser.referralEarnings = roundMoney(Number(lockedParentUser.referralEarnings ?? 0) + parentReward);
    if (!lockedParentUser.children.includes(childUsername)) {
      lockedParentUser.children.push(childUsername);
    }

    const referralEvent = {
      parentUsername,
      childUsername,
      type: 'child_checkin',
      rate: REFERRAL_PARENT_RATE,
      childCommission,
      parentReward,
      createdAt: new Date().toISOString(),
    };
    const transaction = buildTransactionRecord({
      username: parentUsername,
      type: 'Commission',
      amount: parentReward,
      method: 'Referral',
      source: 'referral',
      description: `Referral commission from ${childUsername}`,
      referenceId: childUsername,
    });

    await persistFinancialState({
      username: parentUsername,
      user: lockedParentUser,
      operation: 'referral_commission_credit',
      before,
      writes: [
        { key: `referral:event:${Date.now()}:${childUsername}`, value: referralEvent },
        { key: `${TRANSACTION_KEY_PREFIX}${transaction.id}`, value: transaction },
      ],
      ledgerMetadata: {
        childUsername,
        parentReward,
      },
    });
  });

  return {
    rewarded: true,
    parentUsername,
    parentReward,
    parentInviteCode: invitedByCode,
  };
}

function sanitizePremiumId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Premium IDs have the form premium-<timestamp>: alphanum + hyphen, max 64 chars
  if (!/^[a-zA-Z0-9\-]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizeResetToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Reset tokens have the form reset_<timestamp>_<random>: alphanum + underscore
  if (!/^[a-zA-Z0-9_]{1,128}$/.test(trimmed)) return null;
  return trimmed;
}

// ── User-facing rate limiter ──────────────────────────────────────────────────
// Applied per source IP on unauthenticated mutation endpoints.
const USER_RATE_LIMIT_WINDOW_MS = 60_000;
const USER_RATE_LIMIT_MAX_REQUESTS = 30;
const FORGOT_PASSWORD_RATE_LIMIT_MAX = 5;
const userRateLimitStore = new Map<string, { count: number; resetAt: number }>();

async function enforceSharedRateLimit(
  c: any,
  bucket: string,
  maxRequests: number,
  scope: 'admin' | 'user',
) {
  const source = requestSource(c);
  const scopeIdentity = scope === 'admin'
    ? String(c.get('adminUser')?.id ?? 'unknown-admin')
    : source;
  const counterKey = `${DISTRIBUTED_RATE_LIMIT_KEY_PREFIX}${scope}:${bucket}:${scopeIdentity}:${source}`;
  const lockKey = `${DISTRIBUTED_RATE_LIMIT_LOCK_PREFIX}${scope}:${bucket}:${scopeIdentity}:${source}`;

  return withDistributedLock(lockKey, async () => {
    const now = Date.now();
    const current = await kv.get(counterKey);
    const resetAt = Number(current?.resetAt ?? 0);
    const existingCount = Number(current?.count ?? 0);

    if (!Number.isFinite(resetAt) || now > resetAt) {
      await kv.set(counterKey, {
        count: 1,
        resetAt: now + USER_RATE_LIMIT_WINDOW_MS,
      });
      return null;
    }

    if (existingCount >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
      c.header('Retry-After', String(retryAfterSeconds));
      if (scope === 'admin') {
        logAdminRateLimit(c, bucket, retryAfterSeconds);
        recordRateLimitViolation(bucket, scopeIdentity, source, retryAfterSeconds).catch(err => console.error('Failed to record rate limit violation:', err));
      } else {
        logStructuredEvent(c, 'user_rate_limit_exceeded', 'warn', {
          bucket,
          retryAfterSeconds,
          maxRequests,
        });
      }

      return jsonError(
        c,
        429,
        scope === 'admin' ? 'admin_rate_limit_exceeded' : 'user_rate_limit_exceeded',
        scope === 'admin' ? 'Rate limit exceeded. Please retry shortly.' : 'Too many requests. Please retry shortly.',
      );
    }

    await kv.set(counterKey, {
      count: existingCount + 1,
      resetAt,
    });
    return null;
  });
}

async function enforceCriticalUserRateLimit(c: any, bucket: string, maxRequests = USER_RATE_LIMIT_MAX_REQUESTS) {
  return enforceSharedRateLimit(c, bucket, maxRequests, 'user');
}

async function enforceCriticalAdminRateLimit(c: any, bucket: string, maxRequests = ADMIN_RATE_LIMIT_MAX_REQUESTS) {
  return enforceSharedRateLimit(c, bucket, maxRequests, 'admin');
}

function enforceUserRateLimit(c: any, bucket: string, maxRequests = USER_RATE_LIMIT_MAX_REQUESTS) {
  const now = Date.now();
  const source = requestSource(c);
  const key = `${bucket}:${source}`;

  const current = userRateLimitStore.get(key);
  if (!current || now > current.resetAt) {
    userRateLimitStore.set(key, { count: 1, resetAt: now + USER_RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    c.header('Retry-After', String(retryAfterSeconds));
    logStructuredEvent(c, 'user_rate_limit_exceeded', 'warn', {
      bucket,
      retryAfterSeconds,
      maxRequests,
    });
    return c.json({ error: 'Too many requests. Please retry shortly.' }, 429);
  }

  current.count += 1;
  userRateLimitStore.set(key, current);
  return null;
}

// Health check endpoint
app.get("/make-server-a1c55d7e/health", (c) => {
  return c.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    service: FUNCTION_SERVICE_NAME,
    deployment: buildDeploymentVersionPayload(),
  });
});

app.get("/make-server-a1c55d7e/version", (c) => {
  return c.json(buildVersionResponsePayload(null), 200);
});

app.get('/make-server-a1c55d7e/v1/version', (c) => {
  return c.json(buildVersionResponsePayload('v1'), 200);
});

app.get('/make-server-a1c55d7e/v2/version', (c) => {
  return c.json(buildVersionResponsePayload('v2'), 200);
});

async function handleClientCompatibilityEvent(c: any) {
  try {
    const body = await c.req.json().catch(() => ({} as any));
    const rawEvent = typeof body?.event === 'string' ? body.event.trim() : '';
    const eventMap: Record<string, { event: string; severity: 'info' | 'warn' | 'error' }> = {
      endpoint_failure: { event: 'client_endpoint_failure', severity: 'warn' },
      fallback_used: { event: 'client_fallback_used', severity: 'warn' },
      version_mismatch: { event: 'client_version_mismatch', severity: 'error' },
    };
    const mappedEvent = eventMap[rawEvent];
    if (!mappedEvent) {
      return jsonError(c, 400, 'invalid_client_compatibility_event', 'Invalid compatibility event');
    }

    logStructuredEvent(c, mappedEvent.event, mappedEvent.severity, {
      feature: typeof body?.feature === 'string' ? body.feature : null,
      endpoint: typeof body?.endpoint === 'string' ? body.endpoint : null,
      expectedApiVersion: typeof body?.expectedApiVersion === 'string' ? body.expectedApiVersion : null,
      status: Number.isFinite(Number(body?.status)) ? Number(body.status) : null,
      reason: typeof body?.reason === 'string' ? body.reason : null,
    });

    return c.json({ ok: true }, 202);
  } catch (error) {
    console.error('Error recording client compatibility event:', error);
    return c.json({ error: 'Failed to record compatibility event' }, 500);
  }
}

app.post('/make-server-a1c55d7e/client/compatibility-events', async (c) => {
  return handleClientCompatibilityEvent(c);
});

app.post('/make-server-a1c55d7e/v2/client/compatibility-events', async (c) => {
  return handleClientCompatibilityEvent(c);
});

app.get("/make-server-a1c55d7e/health/live", (c) => {
  // Liveness probe: Process is alive (minimal dependencies)
  return c.json({ 
    status: "alive",
    timestamp: new Date().toISOString()
  }, 200);
});

app.get("/make-server-a1c55d7e/health/ready", async (c) => {
  try {
    // Readiness probe: Service is ready to handle traffic
    // Check KV store connectivity with a quick operation
    const probeKey = 'health:readiness:probe';
    const testValue = { probeAt: new Date().toISOString() };
    
    await kv.set(probeKey, testValue);
    const retrieved = await kv.get(probeKey);
    
    const kvHealthy = retrieved && typeof retrieved === 'object' && retrieved.probeAt;
    
    if (!kvHealthy) {
      return c.json({ 
        status: "not-ready",
        timestamp: new Date().toISOString(),
        checks: { kv: "unhealthy" }
      }, 503);
    }
    
    return c.json({ 
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: { kv: "healthy" }
    }, 200);
  } catch (error) {
    console.error('Readiness check failed:', error);
    return c.json({ 
      status: "not-ready",
      timestamp: new Date().toISOString(),
      error: String(error),
      checks: { kv: "error" }
    }, 503);
  }
});

app.get("/make-server-a1c55d7e/admin/kv-config-version-status", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const checkedAt = new Date().toISOString();

    const activeKeyData = await kv.get(REWARDS_CONFIG_KEY).catch(() => null);
    const activeKeyHasData = activeKeyData !== null && activeKeyData !== undefined;

    const legacyKeyResults = await Promise.all(
      LEGACY_REWARDS_CONFIG_KEYS.map(async (legacyKey) => {
        const legacyData = await kv.get(legacyKey).catch(() => null);
        return {
          key: legacyKey,
          hasData: legacyData !== null && legacyData !== undefined,
        };
      }),
    );

    return c.json({
      schemaVersion: REWARDS_CONFIG_SCHEMA_VERSION,
      activeKey: REWARDS_CONFIG_KEY,
      activeKeyHasData,
      legacyKeys: legacyKeyResults,
      checkedAt,
    });
  } catch (error) {
    console.error('KV config version status check failed:', error);
    return c.json({ error: 'Failed to check KV config version status' }, 500);
  }
});

app.post("/make-server-a1c55d7e/admin/sync-all-users", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const limited = await enforceCriticalAdminRateLimit(c, 'admin-sync-all-users');
    if (limited) {
      return limited;
    }

    // Load all users from KV and resync with VIP config
    const allRawUsers = await kv.getEntriesByPrefix('user:');
    let syncedCount = 0;
    let errorCount = 0;

    const release = await acquireDistributedLock('admin-sync-all-users', 60_000, 120_000);
    try {
      for (const raw of allRawUsers) {
        try {
          const rawUsername = getUsernameFromUserKvEntry(raw);
          if (!rawUsername || rawUsername === 'steadfast_root') {
            continue;
          }

          const canonicalUsername = (await resolveCanonicalUsername(rawUsername)) ?? rawUsername;
          const syncedUser = await syncUserWithVipConfig(raw.value, canonicalUsername);
          await kv.set(`user:${canonicalUsername}`, syncedUser);
          syncedCount += 1;
        } catch (itemError) {
          console.error('Error syncing individual user:', itemError);
          errorCount += 1;
        }
      }
    } finally {
      await release();
    }

    return c.json({ message: 'Force sync completed', syncedCount, errorCount, totalUsers: allRawUsers.length });
  } catch (error) {
    console.error('Admin force sync error:', error);
    return c.json({ error: 'Failed to sync all users' }, 500);
  }
});

app.get("/make-server-a1c55d7e/admin/users", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const limited = enforceAdminRateLimit(c, 'admin-users:list');
    if (limited) {
      return limited;
    }

    if (!authClient) {
      return c.json({ error: 'Server auth configuration missing' }, 500);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);

    const users: any[] = [];
    let page = 1;
    const perPage = 200;

    while (page <= 10) {
      const { data, error } = await authClient.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw error;
      }

      const batch = Array.isArray(data?.users) ? data.users : [];
      users.push(...batch);

      if (batch.length < perPage) {
        break;
      }

      page += 1;
    }

    const adminUsers = users
      .filter((user) => hasAdminRole(user))
      .filter((user) => callerIsSuperAdmin || !isSuperAdmin(user))
      .map((user) => mapAuthUserToAdminRecord(user))
      .sort((a, b) => {
        if (a.roleName === 'Super Admin' && b.roleName !== 'Super Admin') return -1;
        if (a.roleName !== 'Super Admin' && b.roleName === 'Super Admin') return 1;
        return a.fullName.localeCompare(b.fullName);
      });

    return c.json({ users: adminUsers });
  } catch (error) {
    console.error('Admin users list error:', error);
    return c.json({ error: 'Failed to fetch admin users' }, 500);
  }
});

app.post("/make-server-a1c55d7e/admin/users", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const limited = enforceAdminRateLimit(c, 'admin-users:create');
    if (limited) {
      return limited;
    }

    const callingAdmin = c.get('adminUser');
    const actorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');

    if (!isSuperAdmin(callingAdmin)) {
      await recordObservabilityAuditEvent(
        'admin-user-create-denied',
        actorEmail,
        'Denied admin user creation: super-admin access required',
      ).catch((e) => console.error('Failed to record admin-create-denied audit event:', e));
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    if (!authClient) {
      return c.json({ error: 'Server auth configuration missing' }, 500);
    }

    const body = await c.req.json();
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const department = typeof body?.department === 'string' ? body.department.trim() : '';
    const roleName = typeof body?.roleName === 'string' ? body.roleName.trim() : '';
    const roleColor = typeof body?.roleColor === 'string' ? body.roleColor.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const twoFactorEnabled = body?.twoFactorEnabled === true;

    if (!fullName || !username || !email || !roleName || password.length < 8) {
      return c.json({ error: 'Missing or invalid admin user fields' }, 400);
    }

    const accessRole = roleName.toLowerCase() === 'super admin' ? 'super_admin' : 'admin';
    const { data, error } = await authClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username,
        phone,
        department,
        role_name: roleName,
        role_color: roleColor,
        two_factor_enabled: twoFactorEnabled,
      },
      app_metadata: {
        role: accessRole,
        roles: [accessRole],
        admin_role_name: roleName,
        admin_role_color: roleColor,
      },
    });

    if (error || !data?.user) {
      return c.json({ error: error?.message ?? 'Failed to create admin user' }, 400);
    }

    // Auto-generate a 5-character invitation code for this new admin
    let shortCode: string;
    let attempts = 0;
    do {
      shortCode = generateAdminShortCode();
      const existing = await kv.get(`admin:invite:code:${shortCode}`);
      if (!existing) break;
      attempts += 1;
    } while (attempts < 20);

    const codeRecord = {
      code: shortCode,
      subAdminId: data.user.id,
      subAdminEmail: data.user.email ?? '',
      subAdminName: roleName,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`admin:invite:code:${shortCode}`, codeRecord);
    await kv.set(`admin:invite:by-admin:${data.user.id}`, shortCode);

    const createdRole = accessRole === 'super_admin' ? 'super-admin' : 'admin';
    await recordObservabilityAuditEvent(
      'admin-user-create',
      actorEmail,
      `Created ${createdRole} account ${data.user.email ?? data.user.id} (${data.user.id}) with role '${roleName}'`,
    ).catch((e) => console.error('Failed to record admin-user-create audit event:', e));

    const adminRecord = mapAuthUserToAdminRecord(data.user);
    return c.json({ admin: adminRecord, invitationCode: shortCode }, 201);
  } catch (error) {
    console.error('Admin user create error:', error);
    return c.json({ error: 'Failed to create admin user' }, 500);
  }
});

app.delete("/make-server-a1c55d7e/admin/users/:adminId", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const limited = enforceAdminRateLimit(c, 'admin-users:delete');
    if (limited) {
      return limited;
    }

    if (!authClient) {
      return c.json({ error: 'Server auth configuration missing' }, 500);
    }

    const callingAdmin = c.get('adminUser');
    const actorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    const recordDeniedDeleteAttempt = async (detail: string): Promise<void> => {
      try {
        await recordObservabilityAuditEvent('admin-user-delete-denied', actorEmail, detail);
      } catch (auditError) {
        console.error('Failed to record denied admin deletion attempt:', auditError);
      }
    };

    const adminId = String(c.req.param('adminId') ?? '').trim();
    if (!adminId) {
      await recordDeniedDeleteAttempt('Denied admin deletion: missing adminId parameter');
      return c.json({ error: 'adminId is required' }, 400);
    }

    if (callingAdmin?.id === adminId) {
      await recordDeniedDeleteAttempt(`Denied admin deletion: self-delete attempt for ${adminId}`);
      return c.json({ error: 'You cannot delete your own admin account' }, 400);
    }

    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    if (!callerIsSuperAdmin) {
      await recordDeniedDeleteAttempt(`Denied admin deletion: non-super-admin attempted to delete ${adminId}`);
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const { data: targetData, error: targetError } = await authClient.auth.admin.getUserById(adminId);
    if (targetError || !targetData?.user) {
      await recordDeniedDeleteAttempt(`Denied admin deletion: target admin ${adminId} not found`);
      return c.json({ error: 'Admin user not found' }, 404);
    }

    if (!hasAdminRole(targetData.user)) {
      await recordDeniedDeleteAttempt(`Denied admin deletion: target ${adminId} is not an admin account`);
      return c.json({ error: 'Target user is not an admin account' }, 400);
    }

    const targetIsSuperAdmin = isSuperAdmin(targetData.user);

    if (targetIsSuperAdmin && !callerIsSuperAdmin) {
      await recordDeniedDeleteAttempt(`Denied admin deletion: non-super-admin attempted to delete super-admin ${adminId}`);
      return c.json({ error: 'Only a super-admin can delete a super-admin account' }, 403);
    }

    if (targetIsSuperAdmin) {
      const users: any[] = [];
      let page = 1;
      const perPage = 200;
      while (page <= 10) {
        const { data, error } = await authClient.auth.admin.listUsers({ page, perPage });
        if (error) {
          throw error;
        }
        const batch = Array.isArray(data?.users) ? data.users : [];
        users.push(...batch);
        if (batch.length < perPage) {
          break;
        }
        page += 1;
      }

      const superAdminCount = users.filter((user) => hasAdminRole(user) && isSuperAdmin(user)).length;
      if (superAdminCount <= 1) {
        await recordDeniedDeleteAttempt(`Denied admin deletion: attempted deletion of last remaining super-admin ${adminId}`);
        return c.json({ error: 'Cannot delete the last remaining super-admin account' }, 400);
      }
    }

    const { error: deleteError } = await authClient.auth.admin.deleteUser(adminId);
    if (deleteError) {
      await recordDeniedDeleteAttempt(`Denied admin deletion: provider delete failure for ${adminId} (${deleteError.message ?? 'unknown error'})`);
      return c.json({ error: deleteError.message ?? 'Failed to delete admin user' }, 400);
    }

    const adminInviteKey = `admin:invite:by-admin:${adminId}`;
    const existingCode = await kv.get(adminInviteKey);
    if (typeof existingCode === 'string' && existingCode) {
      await kv.del(`admin:invite:code:${existingCode}`);
    }
    await kv.del(adminInviteKey);

    const targetEmail = typeof targetData.user.email === 'string' && targetData.user.email
      ? targetData.user.email
      : adminId;
    const targetRole = targetIsSuperAdmin ? 'super-admin' : 'admin';
    await recordObservabilityAuditEvent(
      'admin-user-delete',
      actorEmail,
      `Deleted ${targetRole} account ${targetEmail} (${adminId})`,
    );

    return c.json({ success: true, deletedAdminId: adminId });
  } catch (error) {
    console.error('Admin user delete error:', error);
    return c.json({ error: 'Failed to delete admin user' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/referrals/overview', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const limited = enforceAdminRateLimit(c, 'admin-referrals:overview');
    if (limited) {
      return limited;
    }

    const allUsers = await kv.getEntriesByPrefix('user:');
    const referralUsers = allUsers
      .map((entry) => {
        const username = getUsernameFromUserKvEntry(entry);
        return username ? normalizeUserRecord(entry.value, username) : null;
      })
      .filter((user): user is ReturnType<typeof normalizeUserRecord> => Boolean(user))
      .filter((user) => Boolean(user.username));

    const rows = referralUsers
      .filter((user) => user.invitationCode || user.invitedByCode || Number(user.referralEarnings ?? 0) > 0 || (Array.isArray(user.children) && user.children.length > 0))
      .map((user) => {
        const parentCode = sanitizeInviteCode(user.invitedByCode);
        return {
          username: user.username,
          invitationCode: user.invitationCode,
          invitedByCode: parentCode,
          parentUsername: parentCode ? (referralUsers.find((candidate) => candidate.invitationCode === parentCode)?.username ?? null) : null,
          referralEarnings: roundMoney(Number(user.referralEarnings ?? 0)),
          childrenCount: Array.isArray(user.children) ? user.children.length : 0,
          children: Array.isArray(user.children) ? user.children : [],
          balance: roundMoney(Number(user.balance ?? 0)),
        };
      })
      .sort((a, b) => b.referralEarnings - a.referralEarnings);

    const events = (await kv.getByPrefix('referral:event:'))
      .map((event) => ({
        parentUsername: event?.parentUsername ?? null,
        childUsername: event?.childUsername ?? null,
        type: event?.type ?? 'child_checkin',
        childCommission: roundMoney(Number(event?.childCommission ?? 0)),
        parentReward: roundMoney(Number(event?.parentReward ?? 0)),
        rate: Number(event?.rate ?? REFERRAL_PARENT_RATE),
        createdAt: typeof event?.createdAt === 'string' ? event.createdAt : new Date().toISOString(),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);

    const totalReferralEarnings = roundMoney(rows.reduce((sum, row) => sum + row.referralEarnings, 0));
    const totalParentRewards = roundMoney(events.reduce((sum, event) => sum + event.parentReward, 0));

    return c.json({
      rows,
      events,
      summary: {
        totalReferralUsers: rows.length,
        totalReferralEarnings,
        totalParentRewards,
        referralRate: REFERRAL_PARENT_RATE,
      },
    });
  } catch (error) {
    console.error('Admin referral overview error:', error);
    return c.json({ error: 'Failed to fetch referral overview' }, 500);
  }
});

async function buildReferralSummaryResponse(username: string) {
  const canonicalUsername = (await resolveCanonicalUsername(username)) ?? username;
  const user = await getOrCreateUserRecord(canonicalUsername);
  await assignUsernameLookup(canonicalUsername);

  const parentCode = sanitizeInviteCode((user as any).invitedByCode);
  let parentUsername: string | null = null;
  if (parentCode) {
    const lookup = await kv.get(`referral:invite:${parentCode}`);
    parentUsername = typeof lookup === 'string' && lookup ? lookup : null;
  }

  const referralEvents = (await kv.getByPrefix('referral:event:'))
    .map((event) => ({
      parentUsername: typeof event?.parentUsername === 'string' ? event.parentUsername : null,
      childUsername: typeof event?.childUsername === 'string' ? event.childUsername : null,
      type: typeof event?.type === 'string' && event.type ? event.type : 'child_checkin',
      childCommission: roundMoney(Number(event?.childCommission ?? 0)),
      parentReward: roundMoney(Number(event?.parentReward ?? 0)),
      rate: Number(event?.rate ?? REFERRAL_PARENT_RATE),
      createdAt: typeof event?.createdAt === 'string' ? event.createdAt : new Date().toISOString(),
    }))
    .filter((event) => event.parentUsername === canonicalUsername || event.childUsername === canonicalUsername)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  const children = Array.isArray((user as any).children) ? (user as any).children : [];
  const referralEarnings = roundMoney(Number((user as any).referralEarnings ?? 0));

  return {
    username: canonicalUsername,
    invitationCode: typeof (user as any).invitationCode === 'string' ? (user as any).invitationCode : null,
    invitedByCode: parentCode,
    parentUsername,
    referralRate: REFERRAL_PARENT_RATE,
    referralEarnings,
    childrenCount: children.length,
    children,
    recentEvents: referralEvents,
    summary: {
      totalReferralEarnings: referralEarnings,
      totalParentRewardsReceived: roundMoney(
        referralEvents
          .filter((event) => event.parentUsername === canonicalUsername)
          .reduce((sum, event) => sum + event.parentReward, 0),
      ),
      totalChildCommissionsObserved: roundMoney(
        referralEvents
          .filter((event) => event.parentUsername === canonicalUsername)
          .reduce((sum, event) => sum + event.childCommission, 0),
      ),
    },
  };
}

async function buildFinancialSummaryResponse(username: string) {
  const { canonicalUsername, normalizedUserData } = await getUserRecordWithDailyReset(username);
  const userKey = `user:${canonicalUsername}`;
  const rewardResult = await applyAutomaticRewardsForUser(canonicalUsername, normalizedUserData);
  const hydratedUserData = rewardResult.normalizedUser;

  if (rewardResult.rewardsApplied.length > 0) {
    await kv.set(userKey, hydratedUserData);
  }

  const balance = roundMoney(Number(hydratedUserData.balance ?? 0));
  const holdAmount = roundMoney(Number(hydratedUserData.holdAmount ?? 0));
  const availableAmount = roundMoney(balance - holdAmount);

  return {
    ...hydratedUserData,
    username: canonicalUsername,
    balance,
    holdAmount,
    availableAmount,
    taskProgress: buildUserTaskProgress(hydratedUserData),
    summary: {
      availableAmount,
      totalBalance: roundMoney(balance + holdAmount),
      isFrozen: Boolean(hydratedUserData.isFrozen),
    },
  };
}

async function buildEarningsSummaryResponse(username: string) {
  const canonicalUsername = (await resolveCanonicalUsername(username)) ?? username;
  const userData = await getOrCreateUserRecord(canonicalUsername);
  const transactions = await listTransactionRecords(canonicalUsername);
  const completedCommission = roundMoney(
    transactions
      .filter((transaction) => transaction.type === 'Commission' && transaction.status === 'Completed')
      .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0),
  );

  return {
    username: canonicalUsername,
    todayCommission: roundMoney(Number(userData.todayCommission ?? 0)),
    referralEarnings: roundMoney(Number(userData.referralEarnings ?? 0)),
    luckyBonus: roundMoney(Number(userData.luckyBonus ?? 0)),
    completedCommission,
  };
}

async function buildAdminPlatformUserAudit(username: string) {
  const canonicalUsername = (await resolveCanonicalUsername(username)) ?? username;
  const userData = await getOrCreateUserRecord(canonicalUsername);
  const normalizedUser = await syncUserWithVipConfig(userData, canonicalUsername);
  const transactions = await listTransactionRecords(canonicalUsername);
  const withdrawals = await listWithdrawalRecords(canonicalUsername);
  const deposits = transactions.filter((transaction) => transaction.type === 'Deposit');
  const commissions = transactions.filter((transaction) => transaction.type === 'Commission');
  const balance = roundMoney(Number(normalizedUser.balance ?? 0));
  const holdAmount = roundMoney(Number(normalizedUser.holdAmount ?? 0));
  const availableAmount = roundMoney(balance - holdAmount);

  // Compute display values matching the frontend Starting.tsx financial summary panel.
  // For frozen accounts (active premium), project the same totals the user sees.
  const isFrozen = Boolean(normalizedUser.isFrozen);
  const activePremium = normalizedUser.activePremium ?? null;
  const preFreezeBalance = isFrozen && activePremium
    ? roundMoney(Number(activePremium.balanceBeforeAssignment ?? balance))
    : balance;
  const displayHoldAmount = isFrozen && activePremium
    ? roundMoney(Math.max(0, Number(activePremium.topUpRequired ?? activePremium.negativeAmount ?? holdAmount ?? 0)))
    : holdAmount;
  const premiumDisplayPrice = isFrozen && activePremium
    ? roundMoney(Number(activePremium.totalBundleValue ?? activePremium.premiumProductValue ?? 0))
    : 0;
  const vipConfigForDisplay = await getVipConfigForLevel(Number(normalizedUser.vipLevel ?? 1));
  const premiumCommRate = (vipConfigForDisplay.commission ?? 0.005) * 10;
  const projectedPremiumProfit = premiumDisplayPrice > 0 ? roundMoney(premiumDisplayPrice * premiumCommRate) : 0;
  const frozenPremiumProfit = isFrozen && activePremium
    ? (Number(activePremium.commissionEarned ?? 0) > 0
      ? roundMoney(Number(activePremium.commissionEarned))
      : projectedPremiumProfit)
    : 0;
  // totalBalance and todayCommission match the frontend's totalAccountBalanceDisplay / todayCommissionDisplay
  const displayTotalBalance = isFrozen
    ? roundMoney(Math.max(0, preFreezeBalance) + displayHoldAmount + frozenPremiumProfit)
    : balance;
  const displayTodayCommission = isFrozen
    ? roundMoney(Number(normalizedUser.todayCommission ?? 0) + frozenPremiumProfit)
    : roundMoney(Number(normalizedUser.todayCommission ?? 0));

  return {
    username: canonicalUsername,
    phone: normalizedUser.phone || '-',
    gender: normalizedUser.gender || '-',
    invitationCode: typeof normalizedUser.invitationCode === 'string' && normalizedUser.invitationCode ? normalizedUser.invitationCode : null,
    invitedByCode: typeof normalizedUser.invitedByCode === 'string' && normalizedUser.invitedByCode ? normalizedUser.invitedByCode : null,
    referredByAdminId: normalizedUser.referredByAdminId ?? null,
    walletProfile: normalizeStoredWalletProfile(normalizedUser.walletProfile),
    accountStatus: {
      isFrozen,
      isSuspended: Boolean(normalizedUser.isSuspended),
      pendingTaskReset: Boolean(normalizedUser.pendingTaskReset),
      activePremiumStatus: typeof normalizedUser.activePremium?.status === 'string' ? normalizedUser.activePremium.status : null,
    },
    financialCard: {
      vipLevel: Number(normalizedUser.vipLevel ?? 1),
      balance: isFrozen ? preFreezeBalance : balance,
      holdAmount: displayHoldAmount,
      availableAmount: isFrozen ? 0 : availableAmount,
      totalBalance: displayTotalBalance,
      todayCommission: displayTodayCommission,
      luckyBonus: roundMoney(Number(normalizedUser.luckyBonus ?? 0)),
      creditScore: typeof normalizedUser.creditScore === 'number' ? normalizedUser.creditScore : 100,
    },
    taskProgress: buildUserTaskProgress(normalizedUser),
    activePremium: normalizedUser.activePremium ?? null,
    premiumQueue: Array.isArray(normalizedUser.premiumQueue) ? normalizedUser.premiumQueue : [],
    audit: {
      registeredAt: normalizedUser.createdAt,
      lastLoginAt: normalizedUser.lastLoginAt,
      lastLoginIp: normalizedUser.lastLoginIp,
      lastLoginLocation: normalizedUser.lastLoginLocation,
      lastActivityAt: normalizedUser.lastActivityAt,
      lastActivityIp: normalizedUser.lastActivityIp,
      lastActivityLocation: normalizedUser.lastActivityLocation,
      lastDepositAt: deposits[0]?.date ?? null,
      lastWithdrawalAt: withdrawals[0]?.requestedDate ?? null,
    },
    deposits,
    withdrawals,
    transactions,
    commissions,
  };
}

app.get('/make-server-a1c55d7e/me/referrals/summary', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    return c.json(await buildReferralSummaryResponse(sessionResult.session.username));
  } catch (error) {
    console.error('Session referral summary error:', error);
    return c.json({ error: 'Failed to fetch referral summary' }, 500);
  }
});

app.get('/make-server-a1c55d7e/me/financials', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    return c.json(await buildFinancialSummaryResponse(sessionResult.session.username));
  } catch (error) {
    console.error('Session financial summary error:', error);
    return c.json({ error: 'Failed to fetch financial summary' }, 500);
  }
});

app.get('/make-server-a1c55d7e/me/balance', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const financialSummary = await buildFinancialSummaryResponse(sessionResult.session.username);
    return c.json({
      username: financialSummary.username,
      balance: financialSummary.balance,
      holdAmount: financialSummary.holdAmount,
      availableAmount: financialSummary.availableAmount,
      totalBalance: financialSummary.summary.totalBalance,
      isFrozen: financialSummary.summary.isFrozen,
    });
  } catch (error) {
    console.error('Session balance summary error:', error);
    return c.json({ error: 'Failed to fetch balance summary' }, 500);
  }
});

app.get('/make-server-a1c55d7e/me/earnings', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    return c.json(await buildEarningsSummaryResponse(sessionResult.session.username));
  } catch (error) {
    console.error('Session earnings summary error:', error);
    return c.json({ error: 'Failed to fetch earnings summary' }, 500);
  }
});

app.get('/make-server-a1c55d7e/me/user', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const { normalizedUserData } = await getUserRecordWithDailyReset(sessionResult.session.username);
    return c.json(normalizedUserData);
  } catch (error) {
    console.error('Error fetching session user data:', error);
    return c.json({ error: 'Failed to fetch user data' }, 500);
  }
});

// Get wallet data endpoint
app.get('/make-server-a1c55d7e/me/wallet', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const canonicalUsername = sessionResult.session.username;
    const existingUser = await kv.get(`user:${canonicalUsername}`);
    const userData = existingUser
      ? await syncUserWithVipConfig(existingUser, canonicalUsername)
      : await getOrCreateUserRecord(canonicalUsername);

    return c.json({
      username: canonicalUsername,
      walletProfile: normalizeStoredWalletProfile((userData as any).walletProfile),
    });
  } catch (error) {
    console.error('Error fetching session wallet profile:', error);
    return c.json({ error: 'Failed to fetch wallet profile' }, 500);
  }
});

app.put('/make-server-a1c55d7e/me/wallet', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:wallet-profile', 20);
    if (rateLimited) return rateLimited;

    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const body = await c.req.json();
    const parsed = parseWalletProfileInput(body);
    if (!parsed.ok) {
      return c.json({ error: parsed.error }, 400);
    }

    const canonicalUsername = sessionResult.session.username;
    const userData = await getOrCreateUserRecord(canonicalUsername);
    const normalizedUserData = await syncUserWithVipConfig(userData, canonicalUsername);
    const clientMeta = getClientRequestMetadata(c);
    normalizedUserData.walletProfile = parsed.walletProfile;
    normalizedUserData.lastActivityAt = new Date().toISOString();
    normalizedUserData.lastActivityIp = clientMeta.clientIp;
    normalizedUserData.lastActivityLocation = clientMeta.location;

    await kv.set(`user:${canonicalUsername}`, normalizedUserData);
    await assignUsernameLookup(canonicalUsername);

    return c.json({
      success: true,
      username: canonicalUsername,
      walletProfile: parsed.walletProfile,
    });
  } catch (error) {
    console.error('Error saving session wallet profile:', error);
    return c.json({ error: 'Failed to save wallet profile' }, 500);
  }
});

// Link referral identity for a user (username -> invitation code and parent invite code)
// Also accepts optional loginPassword / transactionPassword to store server-side hashed credentials.
app.post('/make-server-a1c55d7e/referral/link-user', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:referral-link');
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const invitationCode = sanitizeInviteCode(body.invitationCode);
    const parentInviteCode = sanitizeInviteCode(body.parentInviteCode);
    const rawLoginPassword = typeof body.loginPassword === 'string' ? body.loginPassword : null;
    const rawTransactionPassword = typeof body.transactionPassword === 'string' ? body.transactionPassword : null;

    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }
    const username = sessionResult.session.username;

    if (!invitationCode || !parentInviteCode) {
      return c.json({ error: 'invitationCode and parentInviteCode are required' }, 400);
    }

    await ensureRootReferralUser();

    const existingOwner = await kv.get(`referral:invite:${invitationCode}`);
    if (existingOwner && typeof existingOwner === 'string' && existingOwner.toLowerCase() !== username.toLowerCase()) {
      return c.json({ error: 'Invitation code already belongs to another user' }, 409);
    }

    const parentUsernameRaw = await kv.get(`referral:invite:${parentInviteCode}`);
    if (!parentUsernameRaw || typeof parentUsernameRaw !== 'string') {
      return c.json({ error: 'Parent invitation code not found' }, 404);
    }

    const parentUsername = parentUsernameRaw;
    const userData = await getOrCreateUserRecord(username);
    const canonicalUsername = String(userData.username ?? username);
    userData.invitationCode = invitationCode;
    userData.invitedByCode = parentInviteCode;

    // Store hashed credentials if provided so server-side login works cross-domain
    if (rawLoginPassword && rawLoginPassword.length >= 6) {
      userData.password = await hashPassword(rawLoginPassword);
    }
    if (rawTransactionPassword && rawTransactionPassword.length >= 6) {
      userData.transactionPassword = await hashPassword(rawTransactionPassword);
    }

    await kv.set(`user:${canonicalUsername}`, userData);
    await assignUsernameLookup(canonicalUsername);
    await kv.set(`referral:invite:${invitationCode}`, canonicalUsername);

    const parentData = await getOrCreateUserRecord(parentUsername);
    if (!parentData.children.includes(canonicalUsername)) {
      parentData.children.push(canonicalUsername);
      await kv.set(`user:${parentUsername}`, parentData);
    }

    return c.json({
      success: true,
      username: canonicalUsername,
      invitationCode,
      parentInviteCode,
      parentUsername,
      referralRate: REFERRAL_PARENT_RATE,
    });
  } catch (error) {
    console.error('Error linking referral user:', error);
    return c.json({ error: 'Failed to link referral user' }, 500);
  }
});

// ==================== USER AUTH ENDPOINTS ====================

// Login rate limit: max 10 attempts per IP per minute to prevent brute-force
const LOGIN_RATE_LIMIT_MAX = 10;
const USER_SESSION_PREFIX = 'user-session:';
const USER_SESSION_COOKIE_NAME = 'steadfast_user_session';
const USER_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type UserSessionRecord = {
  sessionId: string;
  username: string;
  mustChangePassword: boolean;
  issuedAt: string;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt?: string;
};

const USER_SESSION_HEADER_NAME = 'x-user-session-token';

function parseCookies(headerValue: string | null | undefined): Record<string, string> {
  if (!headerValue) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const item of headerValue.split(';')) {
    const [rawKey, ...rawValueParts] = item.trim().split('=');
    if (!rawKey) {
      continue;
    }
    const key = rawKey.trim();
    const value = rawValueParts.join('=').trim();
    if (!key) {
      continue;
    }
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function buildSessionCookieValue(sessionId: string, maxAgeSeconds = USER_SESSION_MAX_AGE_SECONDS): string {
  return `${USER_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=None`;
}

function buildSessionClearCookieValue(): string {
  return `${USER_SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`;
}

async function createUserSession(username: string, mustChangePassword: boolean): Promise<UserSessionRecord> {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + USER_SESSION_MAX_AGE_SECONDS * 1000);
  const record: UserSessionRecord = {
    sessionId,
    username,
    mustChangePassword,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastSeenAt: now.toISOString(),
  };

  await kv.set(`${USER_SESSION_PREFIX}${sessionId}`, record);
  return record;
}

async function revokeUserSession(sessionId: string): Promise<void> {
  const key = `${USER_SESSION_PREFIX}${sessionId}`;
  const existing = await kv.get(key);
  if (!existing) {
    return;
  }

  const now = new Date().toISOString();
  await kv.set(key, {
    ...existing,
    revokedAt: now,
    lastSeenAt: now,
  });
}

async function revokeUserSessionsForUsername(
  username: string,
  options?: {
    preserveSessionId?: string;
    preservedMustChangePassword?: boolean;
  },
): Promise<void> {
  const canonicalUsername = await resolveCanonicalUsername(username);
  if (!canonicalUsername) {
    return;
  }

  const sessionRecords = await kv.getByPrefix(USER_SESSION_PREFIX);
  for (const raw of sessionRecords) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const session = raw as Partial<UserSessionRecord>;
    if (typeof session.sessionId !== 'string' || typeof session.username !== 'string') {
      continue;
    }

    if (session.username !== canonicalUsername) {
      continue;
    }

    if (options?.preserveSessionId && session.sessionId === options.preserveSessionId) {
      await kv.set(`${USER_SESSION_PREFIX}${session.sessionId}`, {
        ...session,
        username: canonicalUsername,
        mustChangePassword: options.preservedMustChangePassword ?? Boolean(session.mustChangePassword),
        lastSeenAt: new Date().toISOString(),
      });
      continue;
    }

    await revokeUserSession(session.sessionId);
  }
}

async function getValidSessionById(sessionId: string): Promise<UserSessionRecord | null> {
  if (!sessionId) {
    return null;
  }

  const raw = await kv.get(`${USER_SESSION_PREFIX}${sessionId}`);
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const session = raw as UserSessionRecord;
  if (session.revokedAt) {
    return null;
  }

  const expiresAtMs = Date.parse(String(session.expiresAt ?? ''));
  if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
    return null;
  }

  const canonicalUsername = await resolveCanonicalUsername(String(session.username ?? ''));
  if (!canonicalUsername) {
    return null;
  }

  if (canonicalUsername !== session.username) {
    session.username = canonicalUsername;
  }

  const userData = await kv.get(`user:${canonicalUsername}`);
  session.mustChangePassword = Boolean((userData as any)?.mustChangePassword);
  session.lastSeenAt = new Date().toISOString();
  await kv.set(`${USER_SESSION_PREFIX}${sessionId}`, session);
  return session;
}

async function getSessionFromRequest(c: any): Promise<UserSessionRecord | null> {
  const cookies = parseCookies(c.req.header('cookie'));
  const cookieSessionId = cookies[USER_SESSION_COOKIE_NAME] ?? '';
  if (cookieSessionId) {
    const cookieSession = await getValidSessionById(cookieSessionId);
    if (cookieSession) {
      return cookieSession;
    }
  }

  const headerSessionId = (c.req.header(USER_SESSION_HEADER_NAME) ?? '').trim();
  if (headerSessionId) {
    return getValidSessionById(headerSessionId);
  }

  return null;
}

async function requireActiveUserSession(c: any): Promise<{ session: UserSessionRecord } | { response: any }> {
  const session = await getSessionFromRequest(c);
  if (!session) {
    logStructuredEvent(c, 'user_session_missing_or_expired', 'warn', {
      authType: 'session_cookie',
    });
    c.header('Set-Cookie', buildSessionClearCookieValue());
    return { response: jsonError(c, 401, 'invalid_or_expired_session', 'Invalid or expired session') };
  }

  const trustedOriginViolation = ensureTrustedSessionOrigin(c);
  if (trustedOriginViolation) {
    return { response: trustedOriginViolation };
  }

  return { session };
}

async function resolveSessionBoundUsername(
  c: any,
  rawUsername: unknown,
  options?: { required?: boolean },
): Promise<{ username: string; session: UserSessionRecord } | { response: any }> {
  const required = options?.required ?? true;
  const sessionResult = await requireActiveUserSession(c);
  if ('response' in sessionResult) {
    return sessionResult;
  }

  const sessionUsername = sessionResult.session.username;
  const hasInput = typeof rawUsername === 'string' && rawUsername.trim().length > 0;

  if (!hasInput) {
    if (required) {
      return { response: c.json({ error: 'Invalid username' }, 400) };
    }
    return { username: sessionUsername, session: sessionResult.session };
  }

  const requestedUsername = sanitizeUsername(rawUsername);
  if (!requestedUsername) {
    return { response: c.json({ error: 'Invalid username' }, 400) };
  }

  const canonicalRequestedUsername = (await resolveCanonicalUsername(requestedUsername)) ?? requestedUsername;
  if (canonicalRequestedUsername !== sessionUsername) {
    logStructuredEvent(c, 'session_username_mismatch', 'warn', {
      sessionUsername,
      requestedUsername: canonicalRequestedUsername,
    });
    return { response: c.json({ error: 'Forbidden: requested user does not match active session' }, 403) };
  }

  return { username: sessionUsername, session: sessionResult.session };
}

async function getUniqueReferralInviteCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 50) {
    const code = generateUserInviteCode();
    const existing = await kv.get(`referral:invite:${code}`);
    if (!existing) {
      return code;
    }
    attempts += 1;
  }
  throw new Error('Unable to generate unique invitation code');
}

// POST /auth/signup — creates a persistent user account in KV and referral graph.
app.post('/make-server-a1c55d7e/auth/signup', async (c) => {
  try {
    const rateLimited = await enforceCriticalUserRateLimit(c, 'user:signup', 10);
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const username = sanitizeUsername(body.username);
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const gender = typeof body.gender === 'string' ? body.gender.trim() : 'unknown';
    const loginPassword = typeof body.loginPassword === 'string' ? body.loginPassword : '';
    const transactionPassword = typeof body.transactionPassword === 'string' ? body.transactionPassword : '';
    const rawInviteCode = typeof body.invitationCode === 'string' ? body.invitationCode : '';
    const explicitAdminInviteCode = sanitizeAdminInviteCode(body.adminInviteCode);

    if (!username || !phone || loginPassword.length < 6 || transactionPassword.length < 6) {
      return c.json({ error: 'username, phone, loginPassword and transactionPassword are required' }, 400);
    }

    await ensureRootReferralUser();

    const existingCanonical = await resolveCanonicalUsername(username);
    if (existingCanonical) {
      return c.json({ error: 'Username already exists.' }, 409);
    }

    const normalizedInputCode = rawInviteCode.trim().toUpperCase();
    const inviteCodeAsReferral = sanitizeInviteCode(normalizedInputCode);
    const inviteCodeAsAdmin = sanitizeAdminInviteCode(normalizedInputCode);

    let parentInviteCode: string | null = null;
    let effectiveAdminInviteCode = explicitAdminInviteCode;
    let adminRecordFromInput: any = null;

    if (inviteCodeAsAdmin) {
      const adminRecordCandidate = await kv.get(`admin:invite:code:${inviteCodeAsAdmin}`);
      // Accept the code only if it exists, is a valid admin record, and has NOT been superseded.
      // Superseded codes are kept in KV for ownership tracing only — new signups are blocked.
      if (adminRecordCandidate && typeof adminRecordCandidate.subAdminId === 'string' && !adminRecordCandidate.superseded) {
        adminRecordFromInput = adminRecordCandidate;
      }
    }

    if (inviteCodeAsReferral) {
      const referralOwner = await kv.get(`referral:invite:${inviteCodeAsReferral}`);
      if (referralOwner && typeof referralOwner === 'string') {
        parentInviteCode = inviteCodeAsReferral;
      }
    }

    // If a valid admin invite exists (even when the same 5-char code also exists
    // in referral space), prioritize admin ownership mapping so sub-admin-created
    // accounts are never detached from the sub-admin scope.
    if (adminRecordFromInput && inviteCodeAsAdmin) {
      parentInviteCode = ROOT_REFERRAL_INVITE_CODE;
      effectiveAdminInviteCode = inviteCodeAsAdmin;
    } else if (!parentInviteCode && inviteCodeAsAdmin) {
      // Fallback for legacy behavior where invite code is admin-only.
      parentInviteCode = ROOT_REFERRAL_INVITE_CODE;
      effectiveAdminInviteCode = inviteCodeAsAdmin;
    }

    if (!parentInviteCode) {
      return c.json({ error: 'Invitation code not found. Please check and try again.' }, 404);
    }

    const parentUsernameRaw = await kv.get(`referral:invite:${parentInviteCode}`);
    if (!parentUsernameRaw || typeof parentUsernameRaw !== 'string') {
      return c.json({ error: 'Invitation code not found. Please check and try again.' }, 404);
    }

    let effectiveAdminRecord: any = null;
    if (effectiveAdminInviteCode) {
      const adminRecord = await kv.get(`admin:invite:code:${effectiveAdminInviteCode}`);
      if (!adminRecord || typeof adminRecord.subAdminId !== 'string') {
        return c.json({ error: 'Admin invitation code is not valid.' }, 404);
      }
      effectiveAdminRecord = adminRecord;
    }

    const generatedInviteCode = await getUniqueReferralInviteCode();
    const userData = await syncUserWithVipConfig(defaultUserRecord(username), username);
    userData.vipLevel = 1;
    userData.phone = phone;
    userData.gender = gender;
    userData.invitationCode = generatedInviteCode;
    userData.invitedByCode = parentInviteCode;
    userData.password = await hashPassword(loginPassword);
    userData.transactionPassword = await hashPassword(transactionPassword);
    userData.mustChangePassword = false;
    userData.passwordUpdatedAt = new Date().toISOString();

    if (effectiveAdminInviteCode && effectiveAdminRecord && typeof effectiveAdminRecord.subAdminId === 'string') {
      userData.referredByAdminId = effectiveAdminRecord.subAdminId;
      effectiveAdminRecord.usageCount = (typeof effectiveAdminRecord.usageCount === 'number' ? effectiveAdminRecord.usageCount : 0) + 1;
      await kv.set(`admin:invite:code:${effectiveAdminInviteCode}`, effectiveAdminRecord);
      }
    

    await kv.set(`user:${username}`, userData);
    await assignUsernameLookup(username);
    await kv.set(`referral:invite:${generatedInviteCode}`, username);

    const parentUsername = parentUsernameRaw;
    const parentData = await getOrCreateUserRecord(parentUsername);
    if (!Array.isArray(parentData.children)) {
      parentData.children = [];
    }
    if (!parentData.children.includes(username)) {
      parentData.children.push(username);
    }
    const parentReward = roundMoney(100 * REFERRAL_PARENT_RATE);
    parentData.balance = roundMoney(Number(parentData.balance ?? 0) + parentReward);
    parentData.referralEarnings = roundMoney(Number(parentData.referralEarnings ?? 0) + parentReward);
    await kv.set(`user:${parentUsername}`, parentData);

    return c.json({
      ok: true,
      user: {
        username,
        invitationCode: generatedInviteCode,
      },
      parentReward,
      referralRate: REFERRAL_PARENT_RATE,
    });
  } catch (error) {
    console.error('Error during user signup:', error);
    return c.json({ error: 'Signup failed. Please try again.' }, 500);
  }
});

// POST /auth/login — verifies username + loginPassword and creates server-backed session.
app.post('/make-server-a1c55d7e/auth/login', async (c) => {
  try {
    const rateLimited = await enforceCriticalUserRateLimit(c, 'user:login', LOGIN_RATE_LIMIT_MAX);
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const username = sanitizeUsername(body.username);
    const loginPassword = typeof body.loginPassword === 'string' ? body.loginPassword : '';

    if (!username || !loginPassword) {
      return c.json({ error: 'username and loginPassword are required' }, 400);
    }

    const canonicalUsername = await resolveCanonicalUsername(username);
    if (!canonicalUsername) {
      return c.json({ error: 'Invalid username or password.' }, 401);
    }

    const userKey = `user:${canonicalUsername}`;
    const userData = await kv.get(userKey);

    if (!userData) {
      // Use generic message to avoid username enumeration
      return c.json({ error: 'Invalid username or password.' }, 401);
    }

    const storedPassword = (userData as any).password;
    if (!storedPassword) {
      return c.json({ error: 'Account credentials not set up for server login. Please contact support.' }, 401);
    }

    const valid = await verifyPassword(loginPassword, storedPassword);
    if (!valid) {
      return c.json({ error: 'Invalid username or password.' }, 401);
    }

    const mustChangePassword = Boolean((userData as any).mustChangePassword);
    const clientMeta = getClientRequestMetadata(c);
    const normalizedUserData = normalizeUserRecord(userData, canonicalUsername);
    normalizedUserData.lastLoginAt = new Date().toISOString();
    normalizedUserData.lastLoginIp = clientMeta.clientIp;
    normalizedUserData.lastLoginLocation = clientMeta.location;
    normalizedUserData.lastActivityAt = normalizedUserData.lastLoginAt;
    normalizedUserData.lastActivityIp = clientMeta.clientIp;
    normalizedUserData.lastActivityLocation = clientMeta.location;
    await kv.set(userKey, normalizedUserData);

    const session = await createUserSession(canonicalUsername, mustChangePassword);
    c.header('Set-Cookie', buildSessionCookieValue(session.sessionId));

    return c.json({
      ok: true,
      username: canonicalUsername,
      mustChangePassword,
      sessionToken: session.sessionId,
    });
  } catch (error) {
    console.error('Error during user login:', error);
    return c.json({ error: 'Login failed. Please try again.' }, 500);
  }
});

// POST /auth/session/restore — validates the cookie-backed session and restores auth state.
app.post('/make-server-a1c55d7e/auth/session/restore', async (c) => {
  try {
    const rateLimited = await enforceCriticalUserRateLimit(c, 'user:session-restore');
    if (rateLimited) return rateLimited;

    const session = await getSessionFromRequest(c);
    if (!session) {
      c.header('Set-Cookie', buildSessionClearCookieValue());
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    const userData = await kv.get(`user:${session.username}`);
    const normalizedUserData = userData
      ? await syncUserWithVipConfig(userData, session.username)
      : await getOrCreateUserRecord(session.username);
    if (!userData) {
      logStructuredEvent(c, 'session_user_record_bootstrapped', 'info', {
        username: session.username,
      });
    }
    await kv.set(`user:${session.username}`, normalizedUserData);
    await assignUsernameLookup(session.username);

    return c.json({
      ok: true,
      username: session.username,
      mustChangePassword: Boolean((normalizedUserData as any)?.mustChangePassword),
      sessionToken: session.sessionId,
    });
  } catch (error) {
    console.error('Error restoring user session:', error);
    return c.json({ error: 'Session restore failed' }, 500);
  }
});

// Keep backward compatibility for clients still calling /auth/verify-token.
app.post('/make-server-a1c55d7e/auth/verify-token', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:verify-token');
    if (rateLimited) return rateLimited;

    const session = await getSessionFromRequest(c);
    if (!session) {
      c.header('Set-Cookie', buildSessionClearCookieValue());
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    const userData = await kv.get(`user:${session.username}`);
    const normalizedUserData = userData
      ? await syncUserWithVipConfig(userData, session.username)
      : await getOrCreateUserRecord(session.username);
    if (!userData) {
      logStructuredEvent(c, 'session_user_record_bootstrapped', 'info', {
        username: session.username,
      });
    }
    await kv.set(`user:${session.username}`, normalizedUserData);
    await assignUsernameLookup(session.username);

    return c.json({
      ok: true,
      username: session.username,
      mustChangePassword: Boolean((normalizedUserData as any)?.mustChangePassword),
      sessionToken: session.sessionId,
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    return c.json({ error: 'Session verification failed' }, 500);
  }
});

// POST /auth/session/logout — revokes the current active session from cookie or header token.
app.post('/make-server-a1c55d7e/auth/session/logout', async (c) => {
  try {
    const rateLimited = await enforceCriticalUserRateLimit(c, 'user:session-logout');
    if (rateLimited) return rateLimited;

    const session = await getSessionFromRequest(c);
    if (session?.sessionId) {
      await revokeUserSession(session.sessionId);
    }

    c.header('Set-Cookie', buildSessionClearCookieValue());
    return c.json({ ok: true });
  } catch (error) {
    console.error('Error logging out user session:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

async function submitTaskForUser(c: any, username: string, body: any) {
  const requestedTaskId = sanitizeTaskId(body?.taskId);
  const requestedProductPrice = typeof body?.productPrice === 'number' ? body.productPrice : Number(body?.productPrice);

  return withUserFinancialLock(username, async () => {
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);

    if (!userData) {
      return jsonError(c, 404, 'user_not_found', 'User not found');
    }

    const normalizedUserData = await syncUserWithVipConfig(userData, username);
    const before = snapshotFinancialState(normalizedUserData);
    const vipConfig = await getVipConfigForLevel(normalizedUserData.vipLevel);
    const taskCatalog = await listTaskCatalogRecords(false);
    const controlledCommissionPlan = ensureUserControlledCommissionPlanForCurrentSet(normalizedUserData, vipConfig);
    const tierTaskCandidates = collectTierTaskCandidates(
      taskCatalog,
      Number(normalizedUserData.vipLevel ?? 1),
      controlledCommissionPlan.rangeConfig,
    );

    if (tierTaskCandidates.length === 0) {
      if (controlledCommissionPlan.rangeConfig) {
        return c.json({
          error: `No active product found within VIP${normalizedUserData.vipLevel} range ($${controlledCommissionPlan.rangeConfig.taskPriceMin.toFixed(2)} - $${controlledCommissionPlan.rangeConfig.taskPriceMax.toFixed(2)}).`,
          code: 'no_task_within_vip_range',
          vipLevel: Number(normalizedUserData.vipLevel ?? 1),
          requiredRange: {
            min: controlledCommissionPlan.rangeConfig.taskPriceMin,
            max: controlledCommissionPlan.rangeConfig.taskPriceMax,
          },
          user: normalizedUserData,
          taskProgress: buildUserTaskProgress(normalizedUserData),
        }, 409);
      }
      return c.json({ error: 'No active task available' }, 400);
    }

    const explicitlyRequestedTask = requestedTaskId
      ? taskCatalog.find((task) => task.id === requestedTaskId)
      : null;

    if (requestedTaskId && !explicitlyRequestedTask) {
      return c.json({ error: 'Requested task not found' }, 404);
    }
    if (explicitlyRequestedTask && explicitlyRequestedTask.status !== 'Active') {
      return c.json({ error: 'Selected task is not active' }, 400);
    }

    if (
      explicitlyRequestedTask
      && !tierTaskCandidates.some((task) => task.id === explicitlyRequestedTask.id)
    ) {
      if (controlledCommissionPlan.rangeConfig) {
        return c.json({
          error: `Selected product price is outside the allowed VIP${normalizedUserData.vipLevel} range.`,
          code: 'task_outside_vip_range',
          vipLevel: Number(normalizedUserData.vipLevel ?? 1),
          selectedTaskId: explicitlyRequestedTask.id,
          selectedPrice: roundMoney(Number(explicitlyRequestedTask.price ?? 0)),
          requiredRange: {
            min: controlledCommissionPlan.rangeConfig.taskPriceMin,
            max: controlledCommissionPlan.rangeConfig.taskPriceMax,
          },
        }, 409);
      }
      return c.json({
        error: 'Selected task does not match your current VIP tier routing.',
        code: 'task_tier_mismatch',
      }, 409);
    }

    const selectedTask = explicitlyRequestedTask
      ?? (
        Number.isFinite(requestedProductPrice) && requestedProductPrice > 0
          ? (
            tierTaskCandidates.find((task) => roundMoney(Number(task.price ?? 0)) === roundMoney(requestedProductPrice))
            ?? pickClosestTaskByPrice(tierTaskCandidates, requestedProductPrice)
          )
          : null
      )
      ?? tierTaskCandidates[
        Math.max(0, Math.round(Number(normalizedUserData.tasksCompleted ?? 0))) % tierTaskCandidates.length
      ];

    if (!selectedTask) {
      return c.json({ error: 'No active task available' }, 400);
    }

    const productPrice = roundMoney(selectedTask.price);

    const requiredFunds = roundMoney(Number(vipConfig.investment ?? 0));
    const availableFunds = roundMoney(Number(normalizedUserData.balance ?? 0) - Number(normalizedUserData.holdAmount ?? 0));

    if (availableFunds < requiredFunds) {
      return c.json({
        error: `Insufficient funds for VIP${normalizedUserData.vipLevel}. Minimum required: $${requiredFunds.toFixed(2)}.`,
        code: 'insufficient_vip_funding',
        requiredFunds,
        availableFunds,
        vipLevel: Number(normalizedUserData.vipLevel ?? 1),
        user: normalizedUserData,
        taskProgress: buildUserTaskProgress(normalizedUserData),
      }, 409);
    }

    if (normalizedUserData.pendingTaskReset) {
      return c.json({
        error: 'Current task set is complete. Please contact customer service for reset before continuing.',
        code: 'task_set_reset_required',
        disableSubmit: true,
        user: normalizedUserData,
        taskProgress: buildUserTaskProgress(normalizedUserData),
      }, 409);
    }

    if (normalizedUserData.completedTaskSets >= normalizedUserData.taskSetCount) {
      return jsonError(c, 400, 'daily_task_limit_reached', 'Daily task limit reached');
    }

    const rewardsConfig = await getRewardsConfigRecord();
    const productSystem = normalizeProductSystemConfig(rewardsConfig?.productSystem);
    const nextSubmissionNumber = Number(normalizedUserData.tasksCompleted ?? 0) + 1;
    const queuedPremiumAssignments = Array.isArray(normalizedUserData.premiumQueue)
      ? sortPremiumAssignmentsByTrigger(normalizedUserData.premiumQueue)
      : [];
    const queuedEncounterCandidate = !normalizedUserData.activePremium && queuedPremiumAssignments.length > 0
      ? queuedPremiumAssignments[0]
      : null;
    const queuedTriggerTaskNumber = Number.isFinite(Number(queuedEncounterCandidate?.triggerTaskNumber))
      ? Math.max(1, Math.round(Number(queuedEncounterCandidate?.triggerTaskNumber)))
      : nextSubmissionNumber;
    const shouldActivateQueuedPremium = Boolean(queuedEncounterCandidate)
      && nextSubmissionNumber >= queuedTriggerTaskNumber;

    if (shouldActivateQueuedPremium && queuedEncounterCandidate) {
      const activePremium = {
        ...queuedEncounterCandidate,
      };
      const balanceBeforeAssignment = roundMoney(Number(normalizedUserData.balance ?? 0));
      const totalBundleValue = roundMoney(Number(activePremium.totalBundleValue ?? 0));
      const balanceAfterAssignment = roundMoney(balanceBeforeAssignment - totalBundleValue);
      const configuredUpholdAmount = Number.isFinite(Number(activePremium.configuredUpholdAmount))
        ? Math.max(0, roundMoney(Number(activePremium.configuredUpholdAmount)))
        : 0;
      const topUpRequired = configuredUpholdAmount > 0
        ? configuredUpholdAmount
        : roundMoney(Math.max(0, -balanceAfterAssignment));

      activePremium.balanceBeforeAssignment = balanceBeforeAssignment;
      activePremium.balanceAfterAssignment = balanceAfterAssignment;
      activePremium.negativeAmount = topUpRequired;
      activePremium.topUpRequired = topUpRequired;
      activePremium.triggerTaskNumber = queuedTriggerTaskNumber;
      activePremium.status = topUpRequired > 0 ? 'awaiting_funds' : 'active';

      normalizedUserData.isFrozen = true;
      normalizedUserData.activePremium = activePremium;
      normalizedUserData.premiumQueue = [activePremium, ...queuedPremiumAssignments.slice(1)];
      normalizedUserData.balance = balanceAfterAssignment;
      normalizedUserData.holdAmount = topUpRequired;

      await persistFinancialState({
        username,
        user: normalizedUserData,
        operation: 'premium_assignment_activated_from_queue',
        before,
        writes: [
          { key: `premium:${username}:${activePremium.id}`, value: activePremium },
        ],
        ledgerMetadata: {
          premiumId: activePremium.id,
          totalBundleValue,
          topUpRequired,
        },
      });

      return c.json({
        error: 'Premium task encountered. Top-up is required before continuing task submission.',
        code: 'premium_task_encountered',
        disableSubmit: true,
        premiumRequirement: buildPremiumRequirementResponse(activePremium),
        user: normalizedUserData,
      }, 409);
    }

    // Premium assignments are admin-managed only.
    // Automatic trigger-based premium assignment from user submissions is disabled.

    const commissionRate = vipConfig.commission;
    const currentSetTaskIndex = Math.max(0, Math.round(Number(normalizedUserData.tasksCompletedInSet ?? 0)));
    const shouldUseControlledCommission = controlledCommissionPlan.controlled
      && currentSetTaskIndex < controlledCommissionPlan.plan.length;

    const commission = shouldUseControlledCommission
      ? roundMoney(controlledCommissionPlan.plan[currentSetTaskIndex])
      : roundMoney(productPrice * commissionRate);

    if (!Number.isFinite(commission) || commission <= 0) {
      return c.json({ error: 'Unable to determine commission for this task submission' }, 500);
    }

    const effectiveProductPrice = shouldUseControlledCommission
      ? roundMoney(commission / Math.max(0.000001, commissionRate))
      : productPrice;

    normalizedUserData.tasksCompleted += 1;
    normalizedUserData.tasksCompletedInSet += 1;
    normalizedUserData.todayCommission = roundMoney(normalizedUserData.todayCommission + commission);
    normalizedUserData.balance = roundMoney(normalizedUserData.balance + commission);

    if (normalizedUserData.tasksCompletedInSet >= normalizedUserData.tasksPerSet) {
      normalizedUserData.completedTaskSets = Math.min(
        normalizedUserData.completedTaskSets + 1,
        normalizedUserData.taskSetCount,
      );
      normalizedUserData.tasksCompletedInSet = normalizedUserData.tasksPerSet;
      normalizedUserData.pendingTaskReset = true;
    }

    const writes: Array<{ key: string; value: unknown }> = [];
    // Lucky bonuses are admin-managed only. Automatic random trigger has been removed.

    const rewardResult = await applyAutomaticRewardsForUser(username, normalizedUserData);
    const rewardedUserData = rewardResult.normalizedUser;
    const referralPayout = await creditParentReferralFromChildCommission(username, commission);

    const taskKey = `task:${username}:${Date.now()}`;
    const taskRecord = {
      taskId: selectedTask.id,
      username,
      productPrice: effectiveProductPrice,
      commission,
      isPremium: false,
      merchant: selectedTask.merchant,
      productName: selectedTask.product,
      image: selectedTask.image,
      rating: selectedTask.rating,
      productUrl: selectedTask.productUrl,
      timestamp: new Date().toISOString(),
      tasksCompleted: rewardedUserData.tasksCompleted,
    };
    const commissionTx = buildTransactionRecord({
      username,
      type: 'Commission',
      amount: commission,
      method: 'System',
      source: 'task',
      description: 'Task commission credited',
      referenceId: taskKey,
    });

    writes.push(
      { key: taskKey, value: taskRecord },
      { key: `${TRANSACTION_KEY_PREFIX}${commissionTx.id}`, value: commissionTx },
    );

    const persisted = await persistFinancialState({
      username,
      user: rewardedUserData,
      operation: 'task_submission_commission_credit',
      before,
      writes,
      ledgerMetadata: {
        taskId: selectedTask.id,
        commission,
        productPrice: effectiveProductPrice,
        controlledCommissionRange: shouldUseControlledCommission,
      },
    });

    return c.json({
      success: true,
      commission,
      isPremium: false,
      tasksCompleted: persisted.user.tasksCompleted,
      tasksLimit: persisted.user.tasksLimit,
      balance: persisted.user.balance,
      todayCommission: persisted.user.todayCommission,
      luckyBonus: persisted.user.luckyBonus,
      user: persisted.user,
      taskProgress: buildUserTaskProgress(persisted.user),
      parentReferralCommission: referralPayout.rewarded ? referralPayout.parentReward : 0,
      parentReferralUsername: referralPayout.rewarded ? referralPayout.parentUsername : null,
      rewardsApplied: rewardResult.rewardsApplied,
      task: {
        ...selectedTask,
        price: effectiveProductPrice,
      },
    });
  });
}

app.post('/make-server-a1c55d7e/me/submit-task', async (c) => {
  try {
    const rateLimited = await enforceCriticalUserRateLimit(c, 'user:submit-task');
    if (rateLimited) return rateLimited;

    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const body = await c.req.json();
    const forbiddenFinancialFields = getForbiddenClientFinancialFields(body);
    if (forbiddenFinancialFields.length > 0) {
      return c.json({
        error: 'Client-side financial mutation fields are not allowed',
        fields: forbiddenFinancialFields,
      }, 400);
    }

    const taskSubmitSettings = sanitizeAdminPlatformSettings(await kv.get(ADMIN_PLATFORM_SETTINGS_KEY));
    if (!isPlatformWithinHours(taskSubmitSettings)) {
      return c.json({ error: 'Platform is currently closed. Working hours: 9 AM – 10 PM EST.', code: 'outside_platform_hours' }, 503);
    }

    return await submitTaskForUser(c, sessionResult.session.username, body);
  } catch (error) {
    console.error('Error submitting session task:', error);
    return c.json({ error: 'Failed to submit task' }, 500);
  }
});

app.get('/make-server-a1c55d7e/me/tasks', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const limitRaw = c.req.query('limit');
    const offsetRaw = c.req.query('offset');
    const includePagingEnvelope = c.req.query('format') === 'paged';
    const requestedLimit = parsePositiveIntQuery(limitRaw, 120, 1, 500);
    const requestedOffset = parsePositiveIntQuery(offsetRaw, 0, 0, 10_000);

    const tasks = await kv.getByPrefix(`task:${sessionResult.session.username}:`);
    const sortedTasks = tasks.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const pagedTasks = sortedTasks.slice(requestedOffset, requestedOffset + requestedLimit);

    if (includePagingEnvelope) {
      return c.json({
        tasks: pagedTasks,
        total: sortedTasks.length,
        returned: pagedTasks.length,
        offset: requestedOffset,
        limit: requestedLimit,
      });
    }

    return c.json(pagedTasks);
  } catch (error) {
    console.error('Error fetching session task records:', error);
    return c.json({ error: 'Failed to fetch task records' }, 500);
  }
});

app.get('/make-server-a1c55d7e/tasks/catalog', async (c) => {
  try {
    const includePaused = c.req.query('includePaused') === 'true';
    const tasks = await listTaskCatalogRecords(includePaused);
    const rewardsConfig = await getRewardsConfigRecord();
    const productSystem = normalizeProductSystemConfig(rewardsConfig?.productSystem);
    return c.json({
      tasks,
      ruleConfig: {
        premiumEnabled: productSystem.premiumEnabled,
        premiumTriggerTaskNumber: productSystem.premiumTriggerTaskNumber,
        premiumValueMode: productSystem.premiumValueMode,
      },
    });
  } catch (error) {
    console.error('Error fetching task catalog:', error);
    return c.json({ error: 'Failed to fetch task catalog' }, 500);
  }
});

app.get('/make-server-a1c55d7e/vip-config', async (c) => {
  try {
    const tiers = await listVipConfigRecords();
    return c.json({ tiers });
  } catch (error) {
    console.error('Error fetching VIP config:', error);
    return c.json({ error: 'Failed to fetch VIP config' }, 500);
  }
});

app.get('/make-server-a1c55d7e/rewards-config', async (c) => {
  try {
    const config = await getRewardsConfigRecord();
    return c.json({ config });
  } catch (error) {
    console.error('Error fetching rewards config:', error);
    return c.json({ error: 'Failed to fetch rewards config' }, 500);
  }
});

app.get('/make-server-a1c55d7e/me/transactions', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const limitRaw = c.req.query('limit');
    const offsetRaw = c.req.query('offset');
    const includePagingEnvelope = c.req.query('format') === 'paged';
    const requestedLimit = parsePositiveIntQuery(limitRaw, 120, 1, 500);
    const requestedOffset = parsePositiveIntQuery(offsetRaw, 0, 0, 10_000);

    const transactions = await listTransactionRecords(sessionResult.session.username);
    const pagedTransactions = transactions.slice(requestedOffset, requestedOffset + requestedLimit);

    if (includePagingEnvelope) {
      return c.json({
        transactions: pagedTransactions,
        total: transactions.length,
        returned: pagedTransactions.length,
        offset: requestedOffset,
        limit: requestedLimit,
      });
    }

    return c.json(pagedTransactions);
  } catch (error) {
    console.error('Error fetching session transaction records:', error);
    return c.json({ error: 'Failed to fetch transaction records' }, 500);
  }
});

async function handleStartingSnapshot(c: any) {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const includeCatalog = c.req.query('includeCatalog') !== 'false';
    const includeConfig = c.req.query('includeConfig') !== 'false';
    const catalogLimit = parsePositiveIntQuery(c.req.query('catalogLimit'), 200, 1, 500);
    const username = sessionResult.session.username;

    const [rawUserData, taskCatalog, rewardsConfig, vipTiers] = await Promise.all([
      kv.get(`user:${username}`),
      includeCatalog ? listTaskCatalogRecords(false) : Promise.resolve([]),
      includeConfig ? getRewardsConfigRecord() : Promise.resolve(null),
      includeConfig ? listVipConfigRecords() : Promise.resolve([]),
    ]);

    if (!rawUserData) {
      return jsonError(c, 404, 'user_not_found', 'User not found');
    }

    const normalizedUserData = await syncUserWithVipConfig(rawUserData, username);
    const normalizedRewardsConfig = normalizeProductSystemConfig(rewardsConfig?.productSystem);
    const catalogTasks = Array.isArray(taskCatalog) ? taskCatalog.slice(0, catalogLimit) : [];

    return c.json({
      user: normalizedUserData,
      taskCatalog: {
        tasks: catalogTasks,
        ruleConfig: {
          premiumEnabled: normalizedRewardsConfig.premiumEnabled,
          premiumTriggerTaskNumber: normalizedRewardsConfig.premiumTriggerTaskNumber,
          premiumValueMode: normalizedRewardsConfig.premiumValueMode,
        },
      },
      vipConfig: Array.isArray(vipTiers) ? vipTiers : [],
      rewardsConfig: includeConfig ? rewardsConfig : null,
      meta: {
        catalogLimit,
        catalogReturned: catalogTasks.length,
      },
    });
  } catch (error) {
    console.error('Error fetching starting snapshot:', error);
    return c.json({ error: 'Failed to fetch starting snapshot' }, 500);
  }
}

async function handleRecordsSnapshot(c: any) {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const tasksLimit = parsePositiveIntQuery(c.req.query('tasksLimit'), 120, 1, 500);
    const transactionsLimit = parsePositiveIntQuery(c.req.query('transactionsLimit'), 120, 1, 500);
    const includeCatalog = c.req.query('includeCatalog') !== 'false';
    const includeVip = c.req.query('includeVip') !== 'false';
    const username = sessionResult.session.username;

    const [rawUserData, tasks, transactions, taskCatalog] = await Promise.all([
      kv.get(`user:${username}`),
      kv.getByPrefix(`task:${username}:`),
      listTransactionRecords(username),
      includeCatalog ? listTaskCatalogRecords(false) : Promise.resolve([]),
    ]);

    if (!rawUserData) {
      return jsonError(c, 404, 'user_not_found', 'User not found');
    }

    const normalizedUserData = await syncUserWithVipConfig(rawUserData, username);
    const sortedTasks = tasks.sort((left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    );

    const pagedTasks = sortedTasks.slice(0, tasksLimit);
    const pagedTransactions = transactions.slice(0, transactionsLimit);
    const vipConfig = includeVip && normalizedUserData.activePremium
      ? await listVipConfigRecords()
      : [];

    return c.json({
      user: normalizedUserData,
      tasks: pagedTasks,
      transactions: pagedTransactions,
      taskCatalog,
      vipConfig,
      meta: {
        tasksTotal: sortedTasks.length,
        tasksReturned: pagedTasks.length,
        transactionsTotal: transactions.length,
        transactionsReturned: pagedTransactions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching records snapshot:', error);
    return c.json({ error: 'Failed to fetch records snapshot' }, 500);
  }
}

async function handleActivitySnapshot(c: any) {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const includeConfig = c.req.query('includeConfig') !== 'false';
    const transactionsLimit = parsePositiveIntQuery(c.req.query('transactionsLimit'), 60, 1, 200);
    const withdrawalsLimit = parsePositiveIntQuery(c.req.query('withdrawalsLimit'), 40, 1, 200);
    const username = sessionResult.session.username;

    const [rawUserData, transactions, withdrawals, rewardsConfig, vipTiers] = await Promise.all([
      kv.get(`user:${username}`),
      listTransactionRecords(username),
      listWithdrawalRecords(username),
      includeConfig ? getRewardsConfigRecord() : Promise.resolve(null),
      includeConfig ? listVipConfigRecords() : Promise.resolve([]),
    ]);

    if (!rawUserData) {
      return jsonError(c, 404, 'user_not_found', 'User not found');
    }

    const normalizedUserData = await syncUserWithVipConfig(rawUserData, username);
    const boundWalletProfile = normalizeStoredWalletProfile(normalizedUserData.walletProfile);
    const boundDestination = getWalletProfileDestination(boundWalletProfile);
    const resolvedWithdrawals = withdrawals.map((w) => {
      if (boundWalletProfile?.type === 'crypto' && boundDestination && walletDestinationsMatch(w.walletAddress, boundDestination)) {
        return {
          ...w,
          method: formatWalletAssetLabel(boundWalletProfile.walletType),
          network: sanitizeFinanceMethod(boundWalletProfile.network, 'mainnet'),
        };
      }
      return w;
    });

    const pagedTransactions = transactions.slice(0, transactionsLimit);
    const pagedWithdrawals = resolvedWithdrawals.slice(0, withdrawalsLimit);

    return c.json({
      financialSnapshot: {
        balance: roundMoney(Number(normalizedUserData.balance ?? 0)),
        holdAmount: roundMoney(Number(normalizedUserData.holdAmount ?? 0)),
        availableAmount: roundMoney(Number(normalizedUserData.availableAmount ?? (normalizedUserData.balance ?? 0))),
        todayCommission: roundMoney(Number(normalizedUserData.todayCommission ?? 0)),
        luckyBonus: roundMoney(Number(normalizedUserData.luckyBonus ?? 0)),
      },
      transactions: pagedTransactions,
      withdrawals: pagedWithdrawals,
      vipConfig: Array.isArray(vipTiers) ? vipTiers : [],
      rewardsConfig: includeConfig ? rewardsConfig : null,
      meta: {
        transactionsTotal: transactions.length,
        transactionsReturned: pagedTransactions.length,
        withdrawalsTotal: resolvedWithdrawals.length,
        withdrawalsReturned: pagedWithdrawals.length,
      },
    });
  } catch (error) {
    console.error('Error fetching activity snapshot:', error);
    return c.json({ error: 'Failed to fetch activity snapshot' }, 500);
  }
}

app.get('/make-server-a1c55d7e/me/starting-snapshot', async (c) => {
  return handleStartingSnapshot(c);
});

app.get('/make-server-a1c55d7e/v2/me/starting-snapshot', async (c) => {
  return handleStartingSnapshot(c);
});

app.get('/make-server-a1c55d7e/me/records-snapshot', async (c) => {
  return handleRecordsSnapshot(c);
});

app.get('/make-server-a1c55d7e/v2/me/records-snapshot', async (c) => {
  return handleRecordsSnapshot(c);
});

app.get('/make-server-a1c55d7e/me/activity-snapshot', async (c) => {
  return handleActivitySnapshot(c);
});

app.get('/make-server-a1c55d7e/v2/me/activity-snapshot', async (c) => {
  return handleActivitySnapshot(c);
});

app.get('/make-server-a1c55d7e/me/withdrawals', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const username = sessionResult.session.username;
    const [withdrawals, rawUserData] = await Promise.all([
      listWithdrawalRecords(username),
      kv.get(`user:${username}`),
    ]);

    // Cross-reference method with bound wallet so historical records show the correct asset type
    const boundWalletProfile = normalizeStoredWalletProfile(normalizeUserRecord(rawUserData, username).walletProfile);
    const boundDestination = getWalletProfileDestination(boundWalletProfile);
    const resolvedWithdrawals = withdrawals.map((w) => {
      if (boundWalletProfile?.type === 'crypto' && boundDestination && walletDestinationsMatch(w.walletAddress, boundDestination)) {
        return { ...w, method: formatWalletAssetLabel(boundWalletProfile.walletType), network: sanitizeFinanceMethod(boundWalletProfile.network, 'mainnet') };
      }
      return w;
    });

    return c.json(resolvedWithdrawals);
  } catch (error) {
    console.error('Error fetching session withdrawal records:', error);
    return c.json({ error: 'Failed to fetch withdrawal records' }, 500);
  }
});

async function submitWithdrawalRequest(c: any, username: string, body: any) {
  const walletAddress = sanitizeWalletAddress(body?.walletAddress);
  const requestedMethod = sanitizeFinanceMethod(body?.method, 'USDT');
  const amount = roundMoney(Number(body?.amount ?? 0));
  const transactionPassword = typeof body?.transactionPassword === 'string' ? body.transactionPassword : '';
  const idempotencyKey = resolveRequestIdempotencyKey(c, body);

  if (!walletAddress) {
    return jsonError(c, 400, 'wallet_address_required', 'walletAddress is required');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError(c, 400, 'invalid_withdrawal_amount', 'Withdrawal amount must be greater than 0');
  }
  if (!transactionPassword) {
    return jsonError(c, 400, 'transaction_password_required', 'transactionPassword is required');
  }

  return withUserFinancialLock(username, async () => {
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    if (!userData) {
      return jsonError(c, 404, 'user_not_found', 'User not found');
    }

    const normalizedUserData = await syncUserWithVipConfig(userData, username);
    const boundWalletProfile = normalizeStoredWalletProfile(normalizedUserData.walletProfile);
    const boundDestination = getWalletProfileDestination(boundWalletProfile);
    if (boundDestination && !walletDestinationsMatch(walletAddress, boundDestination)) {
      return jsonError(c, 400, 'withdrawal_wallet_mismatch', 'Withdrawal account must match your bound wallet details.');
    }

    const withdrawalDetails = resolveWithdrawalMethodDetails(boundWalletProfile, requestedMethod);
    const method = withdrawalDetails.method;
    const network = withdrawalDetails.network;

    if (!(await verifyPassword(transactionPassword, String(normalizedUserData.transactionPassword ?? '')))) {
      return jsonError(c, 401, 'invalid_transaction_password', 'Transaction password is incorrect.');
    }

    if (Number(normalizedUserData.completedTaskSets ?? 0) < 2) {
      return jsonError(c, 400, 'withdrawal_task_sets_required', 'Complete at least 2 task sets before requesting a withdrawal.');
    }

    if (idempotencyKey) {
      const idempotencyStorageKey = `withdrawal-idempotency:${username}:${idempotencyKey}`;
      const existingRecord = await kv.get(idempotencyStorageKey) as any;
      const signature = `${amount}|${walletAddress}|${method}`;
      if (existingRecord && typeof existingRecord === 'object') {
        const previousSignature = typeof existingRecord.signature === 'string' ? existingRecord.signature : '';
        if (previousSignature && previousSignature !== signature) {
          return jsonError(c, 409, 'withdrawal_idempotency_conflict', 'Idempotency key has already been used with a different payload.');
        }

        const existingWithdrawalId = typeof existingRecord.withdrawalId === 'string' ? existingRecord.withdrawalId : '';
        if (existingWithdrawalId) {
          const existingWithdrawal = await kv.get(`${WITHDRAWAL_KEY_PREFIX}${existingWithdrawalId}`);
          if (existingWithdrawal) {
            const normalizedExistingWithdrawal = normalizeWithdrawalRecord(existingWithdrawal);
            return c.json({
              success: true,
              idempotentReplay: true,
              withdrawal: normalizedExistingWithdrawal,
              balance: normalizedUserData.balance,
              holdAmount: normalizedUserData.holdAmount,
              availableAmount: roundMoney(normalizedUserData.balance - normalizedUserData.holdAmount),
            });
          }
        }
      }
    }

    const availableAmount = roundMoney(normalizedUserData.balance - normalizedUserData.holdAmount);
    if (amount > availableAmount) {
      return jsonError(c, 400, 'withdrawal_amount_exceeds_available_balance', 'Withdrawal amount exceeds available balance');
    }

    const before = snapshotFinancialState(normalizedUserData);
    const transaction = buildTransactionRecord({
      username,
      type: 'Withdrawal',
      amount,
      status: 'Pending',
      method,
      source: 'withdrawal_request',
      description: 'Withdrawal request submitted',
    });

    const withdrawal = normalizeWithdrawalRecord({
      id: createFinanceId('wd'),
      username,
      amount,
      walletAddress,
      method,
      network,
      status: 'Pending',
      requestedDate: new Date().toISOString(),
      transactionId: transaction.id,
      txHash: '',
    });

    normalizedUserData.holdAmount = roundMoney(normalizedUserData.holdAmount + amount);

    const writes = [
      { key: `${TRANSACTION_KEY_PREFIX}${transaction.id}`, value: transaction },
      { key: `${WITHDRAWAL_KEY_PREFIX}${withdrawal.id}`, value: withdrawal },
    ];
    if (idempotencyKey) {
      writes.push({
        key: `withdrawal-idempotency:${username}:${idempotencyKey}`,
        value: {
          withdrawalId: withdrawal.id,
          transactionId: transaction.id,
          signature: `${amount}|${walletAddress}|${method}`,
          createdAt: new Date().toISOString(),
        },
      });
    }

    const persisted = await persistFinancialState({
      username,
      user: normalizedUserData,
      operation: 'withdrawal_request_submitted',
      before,
      writes,
      ledgerMetadata: {
        withdrawalId: withdrawal.id,
        transactionId: transaction.id,
        amount,
        method,
      },
    });

    return c.json({
      success: true,
      withdrawal,
      balance: persisted.user.balance,
      holdAmount: persisted.user.holdAmount,
      availableAmount: roundMoney(persisted.user.balance - persisted.user.holdAmount),
    });
  });
}

app.post('/make-server-a1c55d7e/me/withdrawals/request', async (c) => {
  try {
    const rateLimited = await enforceCriticalUserRateLimit(c, 'user:withdrawal-request');
    if (rateLimited) return rateLimited;

    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const body = await c.req.json();
    const forbiddenFinancialFields = getForbiddenClientFinancialFields(body);
    if (forbiddenFinancialFields.length > 0) {
      return c.json({
        error: 'Client-side financial mutation fields are not allowed',
        fields: forbiddenFinancialFields,
      }, 400);
    }

    return await submitWithdrawalRequest(c, sessionResult.session.username, body);
  } catch (error) {
    console.error('Error submitting session withdrawal request:', error);
    return c.json({ error: 'Failed to submit withdrawal request' }, 500);
  }
});

// Product catalog (highest value products for bundling)
const productCatalog = [
  { id: 1, name: 'Premium Wireless Headphones', price: 299.99, rating: 4.5, image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop' },
  { id: 2, name: 'Smart Watch Pro', price: 399.00, rating: 4.2, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=300&fit=crop' },
  { id: 3, name: '10-inch Tablet', price: 549.99, rating: 4.1, image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=300&fit=crop' },
];

// Admin assigns premium bundle to user
app.post("/make-server-a1c55d7e/admin/assign-premium-bundle", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = await enforceCriticalAdminRateLimit(c, 'admin:assign-premium-bundle');
    if (rateLimited) {
      return rateLimited;
    }

    const {
      username: rawUsername,
      premiumProductValue,
      bundledProductCount,
      selectedBundledProducts,
      triggerTaskNumber,
      upholdAmountOverride,
    } = await c.req.json();
    const requestedUsername = sanitizeUsername(rawUsername);
    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const adminIdentity = mapAuthUserToAdminRecord(callingAdmin ?? {});
    const adminUsername = adminIdentity.username || callingAdmin?.email || callingAdmin?.id || 'admin';

    const parsedBundledCount = Number(bundledProductCount);
    const selectedBundledProductsInput = Array.isArray(selectedBundledProducts) ? selectedBundledProducts : [];

    if (!requestedUsername || (!selectedBundledProductsInput.length && !Number.isFinite(parsedBundledCount))) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const canonicalUsername = await resolveCanonicalUsername(requestedUsername);
    if (!canonicalUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userKey = `user:${canonicalUsername}`;

    let bundledProducts: Array<typeof productCatalog[number]> = [];
    if (selectedBundledProductsInput.length > 0) {
      if (selectedBundledProductsInput.length > 3) {
        return c.json({ error: 'No more than 3 bundled products can be selected' }, 400);
      }
      const seenProductIds = new Set<number>();
      for (const selectedProduct of selectedBundledProductsInput) {
        const selectedId = Number(selectedProduct?.id);
        if (!Number.isInteger(selectedId)) {
          return c.json({ error: 'Each selected bundled product must include a valid id' }, 400);
        }
        if (seenProductIds.has(selectedId)) {
          continue;
        }
        const catalogProduct = productCatalog.find((product) => product.id === selectedId);
        if (!catalogProduct) {
          return c.json({ error: `Invalid bundled product id: ${selectedId}` }, 400);
        }
        const requestedPrice = Number(selectedProduct?.price);
        const resolvedPrice = Number.isFinite(requestedPrice) && requestedPrice > 0
          ? roundMoney(requestedPrice)
          : roundMoney(catalogProduct.price);
        bundledProducts.push({
          ...catalogProduct,
          price: resolvedPrice,
        });
        seenProductIds.add(selectedId);
      }
      if (!bundledProducts.length) {
        return c.json({ error: 'At least one bundled product must be selected' }, 400);
      }
    } else {
      const normalizedBundledCount = Math.round(parsedBundledCount);
      if (![1, 2, 3].includes(normalizedBundledCount)) {
        return c.json({ error: 'Bundled product count must be 1, 2, or 3' }, 400);
      }
      const sortedProducts = [...productCatalog].sort((a, b) => b.price - a.price);
      bundledProducts = sortedProducts.slice(0, normalizedBundledCount);
    }
    const effectiveBundledCount = bundledProducts.length;
    const sanitizedPremiumValue = Number.isFinite(Number(premiumProductValue))
      ? roundMoney(Math.max(0, Number(premiumProductValue)))
      : 0;

    const assignmentResult = await withUserFinancialLock(canonicalUsername, async () => {
      const userData = await kv.get(userKey);
      if (!userData) {
        return { response: c.json({ error: 'User not found' }, 404) };
      }

      const normalizedUserData = normalizeUserRecord(userData, canonicalUsername);
      if (!callerIsSuperAdmin && normalizedUserData.referredByAdminId !== callingAdmin?.id) {
        return { response: c.json({ error: 'Forbidden' }, 403) };
      }

      const existingPremiumQueue = Array.isArray(normalizedUserData.premiumQueue)
        ? normalizedUserData.premiumQueue
        : [];
      const hasPendingPremium = Boolean(normalizedUserData.activePremium)
        || existingPremiumQueue.some((entry: any) => {
          const status = String(entry?.status ?? '').toLowerCase();
          return status !== 'completed' && status !== 'cancelled';
        });
      if (hasPendingPremium) {
        return {
          response: c.json({
            error: 'User already has a pending premium assignment. Complete or cancel it before assigning a new one.',
            code: 'existing_pending_premium',
          }, 409),
        };
      }

      const nextSubmissionNumber = Number(normalizedUserData.tasksCompleted ?? 0) + 1;
      const requestedTriggerTaskNumber = Number.isInteger(Number(triggerTaskNumber)) && Number(triggerTaskNumber) > 0
        ? Math.round(Number(triggerTaskNumber))
        : nextSubmissionNumber;

      if (requestedTriggerTaskNumber < nextSubmissionNumber) {
        return {
          response: c.json({
            error: `Trigger position must be Task #${nextSubmissionNumber} or later for this user.`,
            code: 'invalid_trigger_position',
            minimumTriggerTaskNumber: nextSubmissionNumber,
          }, 400),
        };
      }

      const before = snapshotFinancialState(normalizedUserData);
      const bundledProductsTotal = roundMoney(bundledProducts.reduce((sum, p) => sum + p.price, 0));
      const totalBundleValue = roundMoney(sanitizedPremiumValue + bundledProductsTotal);
      const balanceBeforeAssignment = roundMoney(Number(normalizedUserData.balance ?? 0));
      const balanceAfterAssignment = roundMoney(balanceBeforeAssignment - totalBundleValue);
      const negativeAmount = Number.isFinite(Number(upholdAmountOverride)) && Number(upholdAmountOverride) > 0
        ? roundMoney(Number(upholdAmountOverride))
        : roundMoney(Math.max(0, -balanceAfterAssignment));

      const premiumAssignment = {
        id: `premium-${Date.now()}`,
        premiumProductValue: sanitizedPremiumValue,
        premiumProductName: sanitizedPremiumValue > 0 ? `Premium Product ($${sanitizedPremiumValue})` : 'Premium Product',
        bundledProducts,
        totalBundleValue,
        balanceBeforeAssignment,
        balanceAfterAssignment,
        negativeAmount,
        configuredUpholdAmount: Number.isFinite(Number(upholdAmountOverride)) && Number(upholdAmountOverride) > 0
          ? roundMoney(Number(upholdAmountOverride))
          : 0,
        topUpRequired: negativeAmount,
        tasksCompleted: 0,
        totalTasks: 1 + effectiveBundledCount,
        assignedAt: new Date().toISOString(),
        assignedBy: adminUsername || 'admin',
        status: 'scheduled',
        commissionEarned: 0,
        encounterPosition: requestedTriggerTaskNumber,
        triggerTaskNumber: requestedTriggerTaskNumber,
      };

      const existingQueue = Array.isArray(normalizedUserData.premiumQueue)
        ? normalizedUserData.premiumQueue
        : [];
      const activePremiumId = typeof normalizedUserData.activePremium?.id === 'string'
        ? normalizedUserData.activePremium.id
        : null;

      if (activePremiumId) {
        const activeQueueEntry = existingQueue.find((entry: any) => entry?.id === activePremiumId) ?? normalizedUserData.activePremium;
        const scheduledQueue = existingQueue.filter((entry: any) => entry?.id !== activePremiumId);
        normalizedUserData.premiumQueue = [activeQueueEntry, ...sortPremiumAssignmentsByTrigger([...scheduledQueue, premiumAssignment])];
      } else {
        normalizedUserData.premiumQueue = sortPremiumAssignmentsByTrigger([...existingQueue, premiumAssignment]);
      }

      const queuedHead = normalizedUserData.premiumQueue[0];
      const shouldActivateImmediately = !normalizedUserData.activePremium
        && queuedHead?.id === premiumAssignment.id
        && requestedTriggerTaskNumber === nextSubmissionNumber;

      if (shouldActivateImmediately) {
        premiumAssignment.status = negativeAmount > 0 ? 'awaiting_funds' : 'active';
        normalizedUserData.isFrozen = true;
        normalizedUserData.activePremium = premiumAssignment;
        normalizedUserData.balance = balanceAfterAssignment;
        normalizedUserData.holdAmount = negativeAmount;
      }

      const premiumKey = `premium:${canonicalUsername}:${premiumAssignment.id}`;
      const persisted = await persistFinancialState({
        username: canonicalUsername,
        user: normalizedUserData,
        operation: shouldActivateImmediately ? 'admin_premium_bundle_assigned_and_activated' : 'admin_premium_bundle_assigned',
        before,
        writes: [
          { key: premiumKey, value: premiumAssignment },
        ],
        ledgerMetadata: {
          premiumId: premiumAssignment.id,
          totalBundleValue,
          topUpRequired: negativeAmount,
          triggerTaskNumber: requestedTriggerTaskNumber,
          assignedBy: adminUsername || 'admin',
        },
      });

      return {
        premiumAssignment,
        balanceAfterAssignment,
        negativeAmount,
        queuePosition: persisted.user.premiumQueue.length,
      };
    });

    if ('response' in assignmentResult) {
      return assignmentResult.response;
    }

    const assignActorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-premium-bundle-assign',
      assignActorEmail,
      `Assigned premium bundle ($${sanitizedPremiumValue}, ${effectiveBundledCount} bundled product${effectiveBundledCount !== 1 ? 's' : ''}) to user '${canonicalUsername}' for task #${requestedTriggerTaskNumber} — total value $${totalBundleValue}`,
    ).catch((e) => console.error('Failed to record admin-premium-bundle-assign audit event:', e));

    return c.json({
      success: true,
      premiumAssignment: assignmentResult.premiumAssignment,
      balanceAfter: assignmentResult.balanceAfterAssignment,
      topUpRequired: assignmentResult.negativeAmount,
      queuePosition: assignmentResult.queuePosition,
    });
  } catch (error) {
    console.error('Error assigning premium bundle:', error);
    return c.json({ error: 'Failed to assign premium bundle' }, 500);
  }
})

async function completePremiumTaskForUser(c: any, username: string, productPrice: number) {
  if (typeof productPrice !== 'number' || !Number.isFinite(productPrice) || productPrice <= 0) {
    return jsonError(c, 400, 'invalid_product_price', 'productPrice must be a positive finite number');
  }

  return withUserFinancialLock(username, async () => {
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);

    if (!userData || !userData.activePremium) {
      return jsonError(c, 404, 'premium_assignment_not_found', 'No active premium assignment');
    }

    const normalizedUserData = normalizeUserRecord(userData, username);
    if (!normalizedUserData.activePremium) {
      return jsonError(c, 404, 'premium_assignment_not_found', 'No active premium assignment');
    }

    const before = snapshotFinancialState(normalizedUserData);
    const premium = normalizedUserData.activePremium;

    const vipConfig = await getVipConfigForLevel(normalizedUserData.vipLevel);
    const commissionRate = vipConfig.commission * 10;
    const commission = roundMoney(productPrice * commissionRate);

    premium.tasksCompleted += 1;
    premium.commissionEarned = roundMoney(Number(premium.commissionEarned ?? 0) + commission);

    normalizedUserData.balance = roundMoney(normalizedUserData.balance + commission);
    normalizedUserData.todayCommission = roundMoney(normalizedUserData.todayCommission + commission);
    const currentPremiumTopUpRequired = Number.isFinite(Number(premium.topUpRequired ?? premium.negativeAmount))
      ? roundMoney(Math.max(0, Number(premium.topUpRequired ?? premium.negativeAmount)))
      : 0;
    normalizedUserData.holdAmount = currentPremiumTopUpRequired;

    if (premium.tasksCompleted >= premium.totalTasks) {
      premium.status = 'completed';
      premium.completedAt = new Date().toISOString();
      normalizedUserData.premiumQueue = normalizedUserData.premiumQueue.filter(p => p.id !== premium.id);
      normalizedUserData.premiumQueue = sortPremiumAssignmentsByTrigger(normalizedUserData.premiumQueue);

      const configuredUpholdAmount = Number.isFinite(Number(premium.configuredUpholdAmount))
        ? roundMoney(Math.max(0, Number(premium.configuredUpholdAmount)))
        : 0;
      const preservedHoldAmount = roundMoney(Math.max(0, Number(normalizedUserData.holdAmount ?? 0)));
      const settledUpholdAmount = roundMoney(Math.max(currentPremiumTopUpRequired, configuredUpholdAmount, preservedHoldAmount));
      const premiumCommissionEarned = Number.isFinite(Number(premium.commissionEarned))
        ? roundMoney(Math.max(0, Number(premium.commissionEarned)))
        : 0;
      const preFreezeBalance = Number.isFinite(Number(premium.balanceBeforeAssignment))
        ? roundMoney(Number(premium.balanceBeforeAssignment))
        : roundMoney(Number(normalizedUserData.balance ?? 0));

      // Settlement rule: final balance must preserve pre-freeze balance,
      // release the full hold amount, and retain all earned premium commission.
      normalizedUserData.balance = roundMoney(preFreezeBalance + settledUpholdAmount + premiumCommissionEarned);
      normalizedUserData.isFrozen = false;
      normalizedUserData.activePremium = null;
      normalizedUserData.holdAmount = 0;
    } else {
      normalizedUserData.activePremium = premium;
    }

    const premiumReferralPayout = await creditParentReferralFromChildCommission(username, commission);
    const rewardResult = await applyAutomaticRewardsForUser(username, normalizedUserData);
    const rewardedUserData = rewardResult.normalizedUser;

    const premiumKey = `premium:${username}:${premium.id}`;
    const taskKey = `task:${username}:${Date.now()}`;
    const taskRecord = {
      username,
      productPrice,
      commission,
      isPremium: true,
      premiumBundleId: premium.id,
      timestamp: new Date().toISOString(),
    };
    const transaction = buildTransactionRecord({
      username,
      type: 'Commission',
      amount: commission,
      method: 'Premium Task',
      source: 'premium_task',
      description: 'Premium task commission credited',
      referenceId: premium.id,
    });

    const persisted = await persistFinancialState({
      username,
      user: rewardedUserData,
      operation: 'premium_task_commission_credit',
      before,
      writes: [
        { key: premiumKey, value: premium },
        { key: taskKey, value: taskRecord },
        { key: `${TRANSACTION_KEY_PREFIX}${transaction.id}`, value: transaction },
      ],
      ledgerMetadata: {
        premiumId: premium.id,
        commission,
        bundleCompleted: premium.status === 'completed',
      },
    });

    return c.json({
      success: true,
      commission,
      isPremium: true,
      tasksCompleted: premium.tasksCompleted,
      totalTasks: premium.totalTasks,
      balance: persisted.user.balance,
      holdAmount: persisted.user.holdAmount,
      bundleCompleted: premium.status === 'completed',
      nextInQueue: persisted.user.premiumQueue.length > 0,
      todayCommission: persisted.user.todayCommission,
      luckyBonus: persisted.user.luckyBonus,
      user: persisted.user,
      taskProgress: buildUserTaskProgress(persisted.user),
      parentReferralCommission: premiumReferralPayout.rewarded ? premiumReferralPayout.parentReward : 0,
      parentReferralUsername: premiumReferralPayout.rewarded ? premiumReferralPayout.parentUsername : null,
    });
  });
}

app.post('/make-server-a1c55d7e/me/complete-premium-task', async (c) => {
  try {
    const rateLimited = await enforceCriticalUserRateLimit(c, 'user:complete-premium-task');
    if (rateLimited) return rateLimited;

    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const premiumBody = await c.req.json();
    const { productPrice } = premiumBody;

    const premiumTaskSettings = sanitizeAdminPlatformSettings(await kv.get(ADMIN_PLATFORM_SETTINGS_KEY));
    if (!isPlatformWithinHours(premiumTaskSettings)) {
      return c.json({ error: 'Platform is currently closed. Working hours: 9 AM – 10 PM EST.', code: 'outside_platform_hours' }, 503);
    }

    return await completePremiumTaskForUser(c, sessionResult.session.username, productPrice);
  } catch (error) {
    console.error('Error completing session premium task:', error);
    return c.json({ error: 'Failed to complete premium task' }, 500);
  }
});

// Cancel premium assignment (admin)
app.delete("/make-server-a1c55d7e/admin/cancel-premium/:username/:premiumId", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = await enforceCriticalAdminRateLimit(c, 'admin:cancel-premium');
    if (rateLimited) {
      return rateLimited;
    }

    const requestedUsername = sanitizeUsername(c.req.param("username"));
    const premiumId = sanitizePremiumId(c.req.param("premiumId"));
    if (!requestedUsername || !premiumId) {
      return c.json({ error: 'Invalid username or premium ID' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const canonicalRequestedUsername = await resolveCanonicalUsername(requestedUsername);
    if (!canonicalRequestedUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    const requestedUserData = await kv.get(`user:${canonicalRequestedUsername}`);
    if (!requestedUserData) {
      return c.json({ error: 'User not found' }, 404);
    }

    const normalizedRequestedUser = normalizeUserRecord(requestedUserData, canonicalRequestedUsername);
    if (!callerIsSuperAdmin && normalizedRequestedUser.referredByAdminId !== callingAdmin?.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const allUsers = await kv.getEntriesByPrefix('user:');
    const premiumOwner = allUsers
      .map((entry) => {
        const username = getUsernameFromUserKvEntry(entry);
        return username ? normalizeUserRecord(entry.value, username) : null;
      })
      .filter((user): user is ReturnType<typeof normalizeUserRecord> => Boolean(user))
      .find((user) => {
        if (!user.username || user.username === ROOT_REFERRAL_USERNAME) {
          return false;
        }
        if (!callerIsSuperAdmin && user.referredByAdminId !== callingAdmin?.id) {
          return false;
        }
        return Array.isArray(user.premiumQueue) && user.premiumQueue.some((premium) => premium.id === premiumId);
      });

    if (!premiumOwner?.username) {
      return c.json({ error: 'Premium assignment not found' }, 404);
    }

    if (canonicalRequestedUsername !== premiumOwner.username) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const username = premiumOwner.username;

    const cancellation = await withUserFinancialLock(username, async () => {
      const userKey = `user:${username}`;
      const userData = await kv.get(userKey);

      if (!userData) {
        return { response: c.json({ error: 'User not found' }, 404) };
      }

      const normalizedUser = normalizeUserRecord(userData, username);
      const before = snapshotFinancialState(normalizedUser);
      const premiumQueue = Array.isArray(normalizedUser.premiumQueue) ? normalizedUser.premiumQueue : [];
      const premiumIndex = premiumQueue.findIndex((p) => p.id === premiumId);
      if (premiumIndex === -1) {
        return { response: c.json({ error: 'Premium assignment not found' }, 404) };
      }

      const cancelledPremium = premiumQueue[premiumIndex];
      cancelledPremium.status = 'cancelled';
      cancelledPremium.cancelledAt = new Date().toISOString();

      if (normalizedUser.activePremium?.id === premiumId) {
        const preFreezeBalance = Number.isFinite(Number(cancelledPremium.balanceBeforeAssignment))
          ? roundMoney(Number(cancelledPremium.balanceBeforeAssignment))
          : roundMoney(Number(normalizedUser.balance ?? 0));
        const configuredUpholdAmount = Number.isFinite(Number(cancelledPremium.configuredUpholdAmount))
          ? roundMoney(Math.max(0, Number(cancelledPremium.configuredUpholdAmount)))
          : 0;
        const outstandingTopUp = Number.isFinite(Number(cancelledPremium.topUpRequired ?? cancelledPremium.negativeAmount))
          ? roundMoney(Math.max(0, Number(cancelledPremium.topUpRequired ?? cancelledPremium.negativeAmount)))
          : 0;
        const preservedHoldAmount = roundMoney(Math.max(0, Number(normalizedUser.holdAmount ?? 0)));
        const settledUpholdAmount = roundMoney(Math.max(outstandingTopUp, configuredUpholdAmount, preservedHoldAmount));
        const premiumCommissionEarned = Number.isFinite(Number(cancelledPremium.commissionEarned))
          ? roundMoney(Math.max(0, Number(cancelledPremium.commissionEarned)))
          : 0;

        // Cancellation should not claw back earned premium commission or released hold funds.
        normalizedUser.balance = roundMoney(preFreezeBalance + settledUpholdAmount + premiumCommissionEarned);
        normalizedUser.holdAmount = 0;
        premiumQueue.splice(premiumIndex, 1);

        if (premiumQueue.length > 0) {
          normalizedUser.activePremium = premiumQueue[0];
          normalizedUser.isFrozen = true;
        } else {
          normalizedUser.activePremium = null;
          normalizedUser.isFrozen = false;
        }
      } else {
        premiumQueue.splice(premiumIndex, 1);
      }

      normalizedUser.premiumQueue = premiumQueue;

      await persistFinancialState({
        username,
        user: normalizedUser,
        operation: 'admin_premium_assignment_cancelled',
        before,
        writes: [
          { key: `premium:${username}:${premiumId}`, value: cancelledPremium },
        ],
        ledgerMetadata: {
          premiumId,
          cancelledBy: String(callingAdmin?.id ?? 'admin'),
        },
      });

      return { cancelledPremium };
    });

    if ('response' in cancellation) {
      return cancellation.response;
    }

    const cancelActorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-premium-cancel',
      cancelActorEmail,
      `Cancelled premium assignment '${premiumId}' ($${cancellation.cancelledPremium.totalBundleValue ?? 0}) for user '${username}'`,
    ).catch((e) => console.error('Failed to record admin-premium-cancel audit event:', e));

    return c.json({ success: true, message: 'Premium assignment cancelled' });
  } catch (error) {
    console.error('Error cancelling premium assignment:', error);
    return c.json({ error: 'Failed to cancel premium assignment' }, 500);
  }
})

app.get('/make-server-a1c55d7e/admin/transactions', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:transactions-read');
    if (rateLimited) {
      return rateLimited;
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const allUsers = await kv.getEntriesByPrefix('user:');
    const visibleUsernames = new Set(
      allUsers
        .map((entry) => {
          const username = getUsernameFromUserKvEntry(entry);
          return username ? normalizeUserRecord(entry.value, username) : null;
        })
        .filter((user): user is ReturnType<typeof normalizeUserRecord> => Boolean(user))
        .filter((user) => Boolean(user.username) && user.username !== ROOT_REFERRAL_USERNAME)
        .filter((user) => callerIsSuperAdmin || user.referredByAdminId === callingAdmin?.id)
        .map((user) => user.username),
    );

    const transactions = (await listTransactionRecords())
      .filter((transaction) => visibleUsernames.has(transaction.username));

    return c.json({ transactions });
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    return c.json({ error: 'Failed to fetch transactions' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/tasks', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-read');
    if (rateLimited) {
      return rateLimited;
    }

    const tasks = await listTaskCatalogRecords(true);
    const taskRecords = await kv.getByPrefix('task:');
    const today = new Date().toISOString().split('T')[0];

    const decoratedTasks = tasks.map((task) => {
      const matchingRecords = taskRecords.filter((record) => record?.taskId === task.id);
      const assignedUsers = new Set(
        matchingRecords
          .map((record) => (typeof record?.username === 'string' ? record.username : null))
          .filter((username): username is string => Boolean(username)),
      ).size;
      const completedToday = matchingRecords.filter((record) => {
        const timestamp = typeof record?.timestamp === 'string' ? record.timestamp : '';
        return timestamp.startsWith(today);
      }).length;

      return {
        ...task,
        assignedUsers,
        completedToday,
      };
    });

    return c.json({ tasks: decoratedTasks });
  } catch (error) {
    console.error('Error fetching admin tasks:', error);
    return c.json({ error: 'Failed to fetch admin tasks' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/vip-config', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:vip-config-read');
    if (rateLimited) {
      return rateLimited;
    }

    const tiers = await listVipConfigRecords();
    return c.json({ tiers });
  } catch (error) {
    console.error('Error fetching admin VIP config:', error);
    return c.json({ error: 'Failed to fetch VIP config' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/rewards-config', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:rewards-config-read');
    if (rateLimited) {
      return rateLimited;
    }

    const config = await getRewardsConfigRecord();
    return c.json({ config });
  } catch (error) {
    console.error('Error fetching admin rewards config:', error);
    return c.json({ error: 'Failed to fetch rewards config' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/salary/project', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:salary-project-read');
    if (rateLimited) {
      return rateLimited;
    }

    const project = await kv.get(ADMIN_SALARY_PROJECT_KEY);
    return c.json({ project: sanitizeAdminSalaryProject(project) });
  } catch (error) {
    console.error('Error fetching admin salary project:', error);
    return c.json({ error: 'Failed to fetch salary project' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/salary/project', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:salary-project-write');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const normalized = sanitizeAdminSalaryProject((body as any)?.project ?? body);
    if (!normalized) {
      return c.json({ error: 'Invalid salary project payload' }, 400);
    }

    await kv.set(ADMIN_SALARY_PROJECT_KEY, normalized);

    const salaryProjectActorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-salary-project-update',
      salaryProjectActorEmail,
      `Updated admin salary project (version ${normalized?.version ?? 'unknown'}, savedAt ${normalized?.savedAt ?? 'unknown'})`,
    ).catch((e) => console.error('Failed to record admin-salary-project-update audit event:', e));

    return c.json({ success: true, project: normalized });
  } catch (error) {
    console.error('Error saving admin salary project:', error);
    return c.json({ error: 'Failed to save salary project' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/salary/audit-log', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:salary-audit-read');
    if (rateLimited) {
      return rateLimited;
    }

    const events = sanitizeAdminSalaryAuditLog(await kv.get(ADMIN_SALARY_AUDIT_LOG_KEY));
    return c.json({ events });
  } catch (error) {
    console.error('Error fetching admin salary audit log:', error);
    return c.json({ error: 'Failed to fetch salary audit log' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/salary/audit-log', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:salary-audit-write');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const events = sanitizeAdminSalaryAuditLog((body as any)?.events ?? body);
    await kv.set(ADMIN_SALARY_AUDIT_LOG_KEY, events);

    const salaryAuditActorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-salary-audit-log-update',
      salaryAuditActorEmail,
      `Updated admin salary audit log — ${Array.isArray(events) ? events.length : 0} entries saved`,
    ).catch((e) => console.error('Failed to record admin-salary-audit-log-update audit event:', e));

    return c.json({ success: true, events });
  } catch (error) {
    console.error('Error saving admin salary audit log:', error);
    return c.json({ error: 'Failed to save salary audit log' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/platform-settings', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:platform-settings-read');
    if (rateLimited) {
      return rateLimited;
    }

    const settings = sanitizeAdminPlatformSettings(await kv.get(ADMIN_PLATFORM_SETTINGS_KEY));
    return c.json({ settings });
  } catch (error) {
    console.error('Error fetching admin platform settings:', error);
    return c.json({ error: 'Failed to fetch platform settings' }, 500);
  }
});

app.get('/make-server-a1c55d7e/public/winners-ticker', async (c) => {
  try {
    const settings = sanitizeAdminPlatformSettings(await kv.get(ADMIN_PLATFORM_SETTINGS_KEY));
    return c.json({
      entries: Array.isArray(settings.winnersTicker) ? settings.winnersTicker : [],
      updatedAt: settings.savedAt,
    });
  } catch (error) {
    console.error('Error fetching public winners ticker:', error);
    return c.json({ error: 'Failed to fetch winners ticker' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/platform-settings', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    if (!isSuperAdmin(c.get('adminUser'))) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:platform-settings-write');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const existingSettings = sanitizeAdminPlatformSettings(await kv.get(ADMIN_PLATFORM_SETTINGS_KEY));
    const incomingSettings = (body as any)?.settings ?? body;
    const settings = sanitizeAdminPlatformSettings({
      ...existingSettings,
      ...(incomingSettings && typeof incomingSettings === 'object' ? incomingSettings : {}),
    });
    await kv.set(ADMIN_PLATFORM_SETTINGS_KEY, settings);

    const platformSettingsActor = c.get('adminUser');
    const platformSettingsActorEmail = typeof platformSettingsActor?.email === 'string' && platformSettingsActor.email
      ? platformSettingsActor.email
      : String(platformSettingsActor?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-platform-settings-update',
      platformSettingsActorEmail,
      `Updated platform settings`,
    ).catch((e) => console.error('Failed to record admin-platform-settings-update audit event:', e));

    return c.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving admin platform settings:', error);
    return c.json({ error: 'Failed to save platform settings' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/observability/security-summary', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-security-summary-read');
    if (rateLimited) {
      return rateLimited;
    }

    const requestedWindow = Number(c.req.query('windowMinutes') ?? 15);
    const windowMinutes = Number.isFinite(requestedWindow)
      ? Math.min(60, Math.max(1, Math.round(requestedWindow)))
      : 15;

    const now = Date.now();
    pruneRuntimeObservedEvents(now);
    const cutoff = now - windowMinutes * 60_000;
    const windowEvents = runtimeObservedEvents.filter((entry) => entry.atMs >= cutoff);

    const bySeverity = { info: 0, warn: 0, error: 0 };
    const byEvent: Record<string, number> = {};
    const byStatusClass: Record<string, number> = {};

    windowEvents.forEach((entry) => {
      bySeverity[entry.severity] += 1;
      byEvent[entry.event] = (byEvent[entry.event] ?? 0) + 1;
      if (entry.statusClass) {
        byStatusClass[entry.statusClass] = (byStatusClass[entry.statusClass] ?? 0) + 1;
      }
    });

    return c.json({
      generatedAt: new Date(now).toISOString(),
      windowMinutes,
      totals: {
        events: windowEvents.length,
        bySeverity,
        byEvent,
        byStatusClass,
      },
      recent: windowEvents.slice(-10),
    });
  } catch (error) {
    console.error('Error fetching admin observability security summary:', error);
    return c.json({ error: 'Failed to fetch observability security summary' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/observability/endpoint-latency-report', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-endpoint-latency-report-read');
    if (rateLimited) {
      return rateLimited;
    }

    const requestedWindow = Number(c.req.query('windowMinutes') ?? 30);
    const windowMinutes = Number.isFinite(requestedWindow)
      ? Math.min(120, Math.max(5, Math.round(requestedWindow)))
      : 30;

    const endpointTargets = [
      '/make-server-a1c55d7e/me/records-snapshot',
      '/make-server-a1c55d7e/v2/me/records-snapshot',
      '/make-server-a1c55d7e/me/activity-snapshot',
      '/make-server-a1c55d7e/v2/me/activity-snapshot',
      '/make-server-a1c55d7e/me/submit-task',
      '/make-server-a1c55d7e/me/complete-premium-task',
      '/make-server-a1c55d7e/me/starting-snapshot',
      '/make-server-a1c55d7e/v2/me/starting-snapshot',
      '/make-server-a1c55d7e/me/financials',
      '/make-server-a1c55d7e/tasks/catalog',
      '/make-server-a1c55d7e/vip-config',
      '/make-server-a1c55d7e/rewards-config',
    ];

    const now = Date.now();
    pruneRuntimeObservedEvents(now);

    const requestEvents = runtimeObservedEvents.filter((entry) => entry.event === 'request_metric');
    const latestCutoff = now - windowMinutes * 60_000;
    const previousCutoff = now - (windowMinutes * 2) * 60_000;

    const latestWindowEvents = requestEvents.filter((entry) => entry.atMs >= latestCutoff);
    const previousWindowEvents = requestEvents.filter((entry) => entry.atMs >= previousCutoff && entry.atMs < latestCutoff);

    const latestStats = computeEndpointLatencyStats(latestWindowEvents, endpointTargets);
    const previousStats = computeEndpointLatencyStats(previousWindowEvents, endpointTargets);
    const comparison = buildEndpointLatencyComparison(latestStats, previousStats);

    return c.json({
      generatedAt: new Date(now).toISOString(),
      windowMinutes,
      windows: {
        latest: {
          from: new Date(latestCutoff).toISOString(),
          to: new Date(now).toISOString(),
          requestEvents: latestWindowEvents.length,
        },
        previous: {
          from: new Date(previousCutoff).toISOString(),
          to: new Date(latestCutoff).toISOString(),
          requestEvents: previousWindowEvents.length,
        },
      },
      comparison,
    });
  } catch (error) {
    console.error('Error fetching admin endpoint latency report:', error);
    return c.json({ error: 'Failed to fetch endpoint latency report' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/observability/compatibility-report', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-compatibility-report-read');
    if (rateLimited) {
      return rateLimited;
    }

    const requestedWindow = Number(c.req.query('windowMinutes') ?? 30);
    const windowMinutes = Number.isFinite(requestedWindow)
      ? Math.min(120, Math.max(5, Math.round(requestedWindow)))
      : 30;

    const now = Date.now();
    pruneRuntimeObservedEvents(now);
    const cutoff = now - windowMinutes * 60_000;
    const windowEvents = runtimeObservedEvents.filter((entry) => entry.atMs >= cutoff);
    const summary = buildCompatibilityTelemetrySummary(windowEvents, windowMinutes);

    return c.json({
      generatedAt: new Date(now).toISOString(),
      windowMinutes,
      summary,
      recent: windowEvents
        .filter((entry) =>
          entry.event === 'client_fallback_used'
          || entry.event === 'client_version_mismatch'
          || entry.event === 'client_endpoint_failure')
        .slice(-25),
    });
  } catch (error) {
    console.error('Error fetching compatibility observability report:', error);
    return c.json({ error: 'Failed to fetch compatibility report' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/observability/security-alerts', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-security-alerts-read');
    if (rateLimited) {
      return rateLimited;
    }

    const requestedWindow = Number(c.req.query('windowMinutes') ?? 15);
    const windowMinutes = Number.isFinite(requestedWindow)
      ? Math.min(60, Math.max(1, Math.round(requestedWindow)))
      : 15;

    const now = Date.now();
    pruneRuntimeObservedEvents(now);
    const cutoff = now - windowMinutes * 60_000;
    const windowEvents = runtimeObservedEvents.filter((entry) => entry.atMs >= cutoff);
    const alertConfig = sanitizeAdminObservabilityAlertConfig(await kv.get(ADMIN_OBSERVABILITY_ALERT_CONFIG_KEY));
    const alertEvaluation = evaluateSecurityAlerts(windowEvents, windowMinutes, {
      errorRate5xxPctThreshold: alertConfig.errorRate5xxPctThreshold,
      authFailuresPerMinuteThreshold: alertConfig.authFailuresPerMinuteThreshold,
      rateLimitEventsPerMinuteThreshold: alertConfig.rateLimitEventsPerMinuteThreshold,
      requestLatencyP95MsThreshold: alertConfig.requestLatencyP95MsThreshold,
    });

    const historyEntry = {
      generatedAt: new Date(now).toISOString(),
      windowMinutes,
      overallStatus: alertEvaluation.overallStatus,
      rules: alertEvaluation.rules,
    };
    const existingHistory = sanitizeAdminObservabilityAlertHistory(await kv.get(ADMIN_OBSERVABILITY_ALERT_HISTORY_KEY));
    existingHistory.push(historyEntry);
    await kv.set(ADMIN_OBSERVABILITY_ALERT_HISTORY_KEY, existingHistory.slice(-200));

    return c.json({
      generatedAt: historyEntry.generatedAt,
      windowMinutes,
      thresholds: alertConfig,
      overallStatus: alertEvaluation.overallStatus,
      rules: alertEvaluation.rules,
    });
  } catch (error) {
    console.error('Error fetching admin observability security alerts:', error);
    return c.json({ error: 'Failed to fetch observability security alerts' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/observability/security-alert-history', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-security-alert-history-read');
    if (rateLimited) {
      return rateLimited;
    }

    const requestedLimit = Number(c.req.query('limit') ?? 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(1, Math.round(requestedLimit)))
      : 20;

    const requestedSinceMinutes = Number(c.req.query('sinceMinutes'));
    const sinceMinutes = Number.isFinite(requestedSinceMinutes)
      ? Math.min(10_080, Math.max(1, Math.round(requestedSinceMinutes)))
      : null;

    const requestedStatus = (c.req.query('status') ?? '').toLowerCase();
    const statusFilter = requestedStatus === 'ok' || requestedStatus === 'warning' || requestedStatus === 'critical'
      ? requestedStatus
      : null;

    const history = sanitizeAdminObservabilityAlertHistory(await kv.get(ADMIN_OBSERVABILITY_ALERT_HISTORY_KEY));
    const now = Date.now();
    const filtered = history.filter((entry) => {
      const entryStatus = typeof entry.overallStatus === 'string' ? entry.overallStatus : '';
      if (statusFilter && entryStatus !== statusFilter) {
        return false;
      }

      if (sinceMinutes === null) {
        return true;
      }

      const generatedAt = typeof entry.generatedAt === 'string' ? Date.parse(entry.generatedAt) : Number.NaN;
      return Number.isFinite(generatedAt) && generatedAt >= (now - sinceMinutes * 60_000);
    });

    return c.json({
      total: history.length,
      filteredTotal: filtered.length,
      items: filtered.slice(-limit),
      filters: {
        limit,
        sinceMinutes,
        status: statusFilter,
      },
    });
  } catch (error) {
    console.error('Error fetching admin observability security alert history:', error);
    return c.json({ error: 'Failed to fetch observability security alert history' }, 500);
  }
});

app.delete('/make-server-a1c55d7e/admin/observability/security-alert-history', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-security-alert-history-write');
    if (rateLimited) {
      return rateLimited;
    }

    const history = sanitizeAdminObservabilityAlertHistory(await kv.get(ADMIN_OBSERVABILITY_ALERT_HISTORY_KEY));
    await kv.set(ADMIN_OBSERVABILITY_ALERT_HISTORY_KEY, []);

    const actorEmail = adminUser?.email ?? adminUser?.user_metadata?.email ?? 'unknown';
    await recordObservabilityAuditEvent('alert-history-clear', actorEmail, `Cleared ${history.length} alert history entries`);

    return c.json({ success: true, clearedCount: history.length });
  } catch (error) {
    console.error('Error clearing admin observability security alert history:', error);
    return c.json({ error: 'Failed to clear observability security alert history' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/observability/security-alert-history/stats', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-security-alert-history-stats-read');
    if (rateLimited) {
      return rateLimited;
    }

    const requestedSinceMinutes = Number(c.req.query('sinceMinutes') ?? 1440);
    const sinceMinutes = Number.isFinite(requestedSinceMinutes)
      ? Math.min(10_080, Math.max(1, Math.round(requestedSinceMinutes)))
      : 1440;

    const now = Date.now();
    const cutoff = now - sinceMinutes * 60_000;
    const history = sanitizeAdminObservabilityAlertHistory(await kv.get(ADMIN_OBSERVABILITY_ALERT_HISTORY_KEY));
    const windowItems = history.filter((entry) => {
      const generatedAt = typeof entry.generatedAt === 'string' ? Date.parse(entry.generatedAt) : Number.NaN;
      return Number.isFinite(generatedAt) && generatedAt >= cutoff;
    });

    const byStatus = {
      ok: 0,
      warning: 0,
      critical: 0,
    };

    windowItems.forEach((entry) => {
      const status = entry.overallStatus;
      if (status === 'ok' || status === 'warning' || status === 'critical') {
        byStatus[status] += 1;
      }
    });

    const total = windowItems.length;
    return c.json({
      generatedAt: new Date(now).toISOString(),
      sinceMinutes,
      totals: {
        total,
        byStatus,
      },
      rates: {
        okPct: total > 0 ? roundMoney((byStatus.ok / total) * 100) : 0,
        warningPct: total > 0 ? roundMoney((byStatus.warning / total) * 100) : 0,
        criticalPct: total > 0 ? roundMoney((byStatus.critical / total) * 100) : 0,
      },
      latest: windowItems.length > 0 ? windowItems[windowItems.length - 1] : null,
    });
  } catch (error) {
    console.error('Error fetching admin observability security alert history stats:', error);
    return c.json({ error: 'Failed to fetch observability security alert history stats' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/observability/security-alert-history/trends', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-security-alert-history-trends-read');
    if (rateLimited) {
      return rateLimited;
    }

    const requestedSinceMinutes = Number(c.req.query('sinceMinutes') ?? 1440);
    const sinceMinutes = Number.isFinite(requestedSinceMinutes)
      ? Math.min(10_080, Math.max(10, Math.round(requestedSinceMinutes)))
      : 1440;

    const requestedBucketMinutes = Number(c.req.query('bucketMinutes') ?? 60);
    const bucketMinutes = Number.isFinite(requestedBucketMinutes)
      ? Math.min(1440, Math.max(5, Math.round(requestedBucketMinutes)))
      : 60;

    const now = Date.now();
    const cutoff = now - sinceMinutes * 60_000;
    const history = sanitizeAdminObservabilityAlertHistory(await kv.get(ADMIN_OBSERVABILITY_ALERT_HISTORY_KEY));
    const windowItems = history.filter((entry) => {
      const generatedAt = typeof entry.generatedAt === 'string' ? Date.parse(entry.generatedAt) : Number.NaN;
      return Number.isFinite(generatedAt) && generatedAt >= cutoff;
    });

    const bucketMap = new Map<number, { ok: number; warning: number; critical: number; total: number }>();

    windowItems.forEach((entry) => {
      const atMs = typeof entry.generatedAt === 'string' ? Date.parse(entry.generatedAt) : Number.NaN;
      if (!Number.isFinite(atMs)) {
        return;
      }

      const bucketStartMs = Math.floor(atMs / (bucketMinutes * 60_000)) * bucketMinutes * 60_000;
      const bucket = bucketMap.get(bucketStartMs) ?? { ok: 0, warning: 0, critical: 0, total: 0 };

      const status = entry.overallStatus;
      if (status === 'ok' || status === 'warning' || status === 'critical') {
        bucket[status] += 1;
        bucket.total += 1;
      }

      bucketMap.set(bucketStartMs, bucket);
    });

    const buckets = Array.from(bucketMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([startMs, counts]) => ({
        startAt: new Date(startMs).toISOString(),
        endAt: new Date(startMs + bucketMinutes * 60_000).toISOString(),
        total: counts.total,
        byStatus: {
          ok: counts.ok,
          warning: counts.warning,
          critical: counts.critical,
        },
      }));

    return c.json({
      generatedAt: new Date(now).toISOString(),
      sinceMinutes,
      bucketMinutes,
      totals: {
        buckets: buckets.length,
        events: windowItems.length,
      },
      buckets,
    });
  } catch (error) {
    console.error('Error fetching admin observability security alert history trends:', error);
    return c.json({ error: 'Failed to fetch observability security alert history trends' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/observability/security-alert-history/quality', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-security-alert-history-quality-read');
    if (rateLimited) {
      return rateLimited;
    }

    const requestedSinceMinutes = Number(c.req.query('sinceMinutes') ?? 1440);
    const sinceMinutes = Number.isFinite(requestedSinceMinutes)
      ? Math.min(10_080, Math.max(10, Math.round(requestedSinceMinutes)))
      : 1440;

    const now = Date.now();
    const cutoff = now - sinceMinutes * 60_000;
    const history = sanitizeAdminObservabilityAlertHistory(await kv.get(ADMIN_OBSERVABILITY_ALERT_HISTORY_KEY));
    const windowItems = history
      .filter((entry) => {
        const generatedAt = typeof entry.generatedAt === 'string' ? Date.parse(entry.generatedAt) : Number.NaN;
        return Number.isFinite(generatedAt) && generatedAt >= cutoff;
      })
      .sort((a, b) => Date.parse(String(a.generatedAt)) - Date.parse(String(b.generatedAt)));

    let okCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let longestNonOkStreak = 0;
    let currentStreak = 0;
    let lastCriticalAt: string | null = null;

    windowItems.forEach((entry) => {
      const status = entry.overallStatus;
      if (status === 'ok') {
        okCount += 1;
        currentStreak = 0;
        return;
      }

      if (status === 'warning') {
        warningCount += 1;
      }
      if (status === 'critical') {
        criticalCount += 1;
        lastCriticalAt = typeof entry.generatedAt === 'string' ? entry.generatedAt : lastCriticalAt;
      }

      currentStreak += 1;
      if (currentStreak > longestNonOkStreak) {
        longestNonOkStreak = currentStreak;
      }
    });

    let currentNonOkStreak = 0;
    for (let i = windowItems.length - 1; i >= 0; i -= 1) {
      const status = windowItems[i].overallStatus;
      if (status === 'ok') {
        break;
      }
      if (status === 'warning' || status === 'critical') {
        currentNonOkStreak += 1;
      }
    }

    const total = windowItems.length;
    return c.json({
      generatedAt: new Date(now).toISOString(),
      sinceMinutes,
      totals: {
        total,
        ok: okCount,
        warning: warningCount,
        critical: criticalCount,
      },
      quality: {
        healthyRatioPct: total > 0 ? roundMoney((okCount / total) * 100) : 0,
        noisyRatioPct: total > 0 ? roundMoney(((warningCount + criticalCount) / total) * 100) : 0,
        longestNonOkStreak,
        currentNonOkStreak,
        lastCriticalAt,
      },
    });
  } catch (error) {
    console.error('Error fetching admin observability security alert history quality:', error);
    return c.json({ error: 'Failed to fetch observability security alert history quality' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/observability/security-alert-config', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-security-alert-config-read');
    if (rateLimited) {
      return rateLimited;
    }

    const config = sanitizeAdminObservabilityAlertConfig(await kv.get(ADMIN_OBSERVABILITY_ALERT_CONFIG_KEY));
    return c.json({ config });
  } catch (error) {
    console.error('Error fetching admin observability security alert config:', error);
    return c.json({ error: 'Failed to fetch observability security alert config' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/observability/security-alert-config', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-security-alert-config-write');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const config = sanitizeAdminObservabilityAlertConfig((body as any)?.config ?? body);
    await kv.set(ADMIN_OBSERVABILITY_ALERT_CONFIG_KEY, config);

    const actorEmail = adminUser?.email ?? adminUser?.user_metadata?.email ?? 'unknown';
    await recordObservabilityAuditEvent('alert-config-update', actorEmail, `Updated alert config thresholds`);

    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error saving admin observability security alert config:', error);
    return c.json({ error: 'Failed to save observability security alert config' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/observability/audit-log', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:observability-audit-log-read');
    if (rateLimited) {
      return rateLimited;
    }

    const requestedLimit = Number(c.req.query('limit') ?? 50);
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.round(requestedLimit))) : 50;

    const requestedSinceMinutes = c.req.query('sinceMinutes');
    const sinceMinutes = requestedSinceMinutes != null
      ? (Number.isFinite(Number(requestedSinceMinutes))
          ? Math.min(43_200, Math.max(1, Math.round(Number(requestedSinceMinutes))))
          : null)
      : null;

    const actionFilter = c.req.query('action') ?? null;

    const allEvents = sanitizeAdminObservabilityAuditLog(await kv.get(ADMIN_OBSERVABILITY_AUDIT_LOG_KEY));

    const now = Date.now();
    let filtered = allEvents;

    if (sinceMinutes != null) {
      const cutoff = now - sinceMinutes * 60_000;
      filtered = filtered.filter((entry) => {
        const at = typeof entry.at === 'string' ? Date.parse(entry.at as string) : Number.NaN;
        return Number.isFinite(at) && at >= cutoff;
      });
    }

    if (actionFilter) {
      filtered = filtered.filter((entry) => entry.action === actionFilter);
    }

    const sorted = filtered.sort((a, b) => Date.parse(String(b.at)) - Date.parse(String(a.at)));
    const items = sorted.slice(0, limit);

    return c.json({
      total: allEvents.length,
      filteredTotal: filtered.length,
      items,
      filters: {
        limit,
        sinceMinutes: sinceMinutes ?? null,
        action: actionFilter,
      },
    });
  } catch (error) {
    console.error('Error fetching admin observability audit log:', error);
    return c.json({ error: 'Failed to fetch observability audit log' }, 500);
  }
});

  app.get('/make-server-a1c55d7e/admin/observability/rate-limit-status', async (c) => {
    try {
      const unauthorized = await requireAdmin(c);
      if (unauthorized) {
        return unauthorized;
      }

      const adminUser = c.get('adminUser');
      if (!isSuperAdmin(adminUser)) {
        return c.json({ error: 'Forbidden: super-admin access required' }, 403);
      }

      const rateLimited = enforceAdminRateLimit(c, 'admin:observability-rate-limit-status-read');
      if (rateLimited) {
        return rateLimited;
      }

      const requestedLimit = Number(c.req.query('limit') ?? 50);
      const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.round(requestedLimit))) : 50;

      const requestedSinceMinutes = c.req.query('sinceMinutes');
      const sinceMinutes = requestedSinceMinutes != null
        ? (Number.isFinite(Number(requestedSinceMinutes))
            ? Math.min(43_200, Math.max(1, Math.round(Number(requestedSinceMinutes))))
            : null)
        : null;

      const bucketFilter = c.req.query('bucket') ?? null;
      const userIdFilter = c.req.query('userId') ?? null;
      const sourceIpFilter = c.req.query('sourceIp') ?? null;

      const allViolations = sanitizeAdminObservabilityRateLimitViolations(await kv.get(ADMIN_OBSERVABILITY_RATE_LIMIT_VIOLATIONS_KEY));

      const now = Date.now();
      let filtered = allViolations;

      if (sinceMinutes != null) {
        const cutoff = now - sinceMinutes * 60_000;
        filtered = filtered.filter((entry) => {
          const at = typeof entry.at === 'string' ? Date.parse(entry.at as string) : Number.NaN;
          return Number.isFinite(at) && at >= cutoff;
        });
      }

      if (bucketFilter) {
        filtered = filtered.filter((entry) => entry.bucket === bucketFilter);
      }

      if (userIdFilter) {
        filtered = filtered.filter((entry) => entry.userId === userIdFilter);
      }

      if (sourceIpFilter) {
        filtered = filtered.filter((entry) => entry.sourceIp === sourceIpFilter);
      }

      const sorted = filtered.sort((a, b) => Date.parse(String(b.at)) - Date.parse(String(a.at)));
      const items = sorted.slice(0, limit);

      const byBucket: Record<string, number> = {};
      const byUser: Record<string, number> = {};
      const byIp: Record<string, number> = {};
    
      filtered.forEach((v) => {
        const bucket = String(v.bucket);
        const userId = String(v.userId);
        const ip = String(v.sourceIp);
        byBucket[bucket] = (byBucket[bucket] ?? 0) + 1;
        byUser[userId] = (byUser[userId] ?? 0) + 1;
        byIp[ip] = (byIp[ip] ?? 0) + 1;
      });

      return c.json({
        total: allViolations.length,
        filteredTotal: filtered.length,
        items,
        stats: {
          byBucket,
          byUser,
          byIp,
        },
        filters: {
          limit,
          sinceMinutes: sinceMinutes ?? null,
          bucket: bucketFilter,
          userId: userIdFilter,
          sourceIp: sourceIpFilter,
        },
      });
    } catch (error) {
      console.error('Error fetching admin observability rate limit status:', error);
      return c.json({ error: 'Failed to fetch observability rate limit status' }, 500);
    }
  });

app.post('/make-server-a1c55d7e/admin/tasks', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-create');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const product = sanitizeTaskText(body?.product);
    const productUrl = sanitizeTaskUrl(body?.productUrl);
    const image = inferTaskImageUrl(body?.image, productUrl);
    const merchant = sanitizeTaskText(body?.merchant, inferMerchantFromTaskUrls(productUrl, image) || 'General');
    const hasExplicitPrice = Number.isFinite(Number(body?.price)) && Number(body?.price) > 0;
    const autoPrice = resolveAutomaticTaskPrice({
      product,
      merchant,
      productUrl,
      image,
    });
    const price = hasExplicitPrice ? roundMoney(Number(body.price)) : autoPrice.price;
    const vipConfigRecords = await listVipConfigRecords();
    const baseCommission = vipConfigRecords.find((tier) => tier.level === 1)?.commission ?? 0.005;
    const commission = Number.isFinite(Number(body?.commission)) && Number(body?.commission) > 0
      ? Number(body.commission)
      : baseCommission;

    if (!product) {
      return c.json({ error: 'product is required' }, 400);
    }
    if (!Number.isFinite(price) || price <= 0) {
      return c.json({ error: 'price must be greater than 0' }, 400);
    }
    if (!Number.isFinite(commission) || commission <= 0) {
      return c.json({ error: 'commission must be greater than 0' }, 400);
    }

    const task = normalizeTaskCatalogRecord({
      id: createFinanceId('task'),
      merchant,
      product,
      price,
      priceSource: hasExplicitPrice ? 'manual' : autoPrice.priceSource,
      commission,
      status: body?.status,
      image,
      rating: Number(body?.rating ?? 4),
      productUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await kv.set(`${TASK_CATALOG_KEY_PREFIX}${task.id}`, task);

    const adminUser = c.get('adminUser');
    const taskCreateActorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-task-catalog-create',
      taskCreateActorEmail,
      `Created task catalog entry '${task.id}' (${merchant} ${product}, \$${price}, ${commission}% commission)`,
    ).catch((e) => console.error('Failed to record admin-task-catalog-create audit event:', e));

    return c.json({ success: true, task }, 201);
  } catch (error) {
    console.error('Error creating admin task:', error);
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Product generation templates for intelligent VIP-aware bulk creation
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_GENERATION_TEMPLATES = {
  categories: ['Electronics', 'Wearables', 'Gaming', 'Office', 'Accessories', 'Home & Living', 'Fitness', 'Kitchen'],
  merchants: ['Amazon', 'Walmart', 'Target', 'Best Buy', 'eBay', 'Costco', 'Apple Store', 'Samsung', 'Sony Direct', 'Nike', 'Adidas', 'Etsy'],
  adjectives: ['Premium', 'Pro', 'Ultra', 'Elite', 'Smart', 'Wireless', 'Portable', 'Compact', 'Advanced', 'Professional', 'Deluxe', 'Slim', 'Max', 'Turbo'],
  productTypes: {
    Electronics: ['Bluetooth Speaker', 'USB Hub', 'Power Bank', 'Smart Plug', 'LED Desk Lamp', 'Wireless Charger', 'Digital Camera', 'USB-C Dock'],
    Wearables: ['Fitness Tracker', 'Smart Watch', 'Wireless Earbuds', 'Smart Ring', 'Sleep Tracker', 'Heart Rate Monitor', 'Smart Glasses'],
    Gaming: ['Gaming Headset', 'Mechanical Keyboard', 'Gaming Mouse', 'Monitor Stand', 'USB Microphone', 'RGB Mouse Pad', 'Game Controller', 'Capture Card'],
    Office: ['Ergonomic Chair Cushion', 'Standing Desk Mat', 'Monitor Arm', 'Lap Desk', 'Cable Management Box', 'Wrist Rest Pad', 'Desk Organizer'],
    Accessories: ['Phone Holder', 'Laptop Sleeve', 'Screen Cleaner Kit', 'Webcam Cover', 'Keyboard Cover', 'Cable Winder', 'Magnetic Phone Mount'],
    'Home & Living': ['Smart Dimmer Switch', 'Air Purifier', 'Smart Thermostat', 'Motion Sensor Light', 'Robot Vacuum Accessory', 'Security Camera'],
    Fitness: ['Resistance Bands Set', 'Foam Roller', 'Jump Rope', 'Yoga Mat', 'Push-Up Board', 'Ab Roller Wheel', 'Pull-Up Bar'],
    Kitchen: ['Electric Kettle', 'Digital Kitchen Scale', 'Spice Rack Organizer', 'Airtight Container Set', 'Herb Scissors Kit', 'Air Fryer'],
  } as Record<string, string[]>,
  imagesByCategory: {
    Electronics: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
    Wearables: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
    Gaming: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400&h=300&fit=crop',
    Office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
    Accessories: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=300&fit=crop',
    'Home & Living': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
    Fitness: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
    Kitchen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
  } as Record<string, string>,
};

// Price ranges per VIP tier (min/max product value in USD)
const VIP_PRICE_RANGES: Record<number, { min: number; max: number }> = {
  1: { min: 25, max: 120 },
  2: { min: 100, max: 280 },
  3: { min: 240, max: 600 },
  4: { min: 500, max: 1250 },
  5: { min: 1100, max: 2600 },
};

function generateProductForVipTier(
  vipLevel: number,
  vipCommission: number,
  category: string,
  usedNames: Set<string>,
  seed: number,
): { product: string; merchant: string; price: number; commission: number; image: string; category: string; vipTier: number } | null {
  const templates = PRODUCT_GENERATION_TEMPLATES;
  const typeList = templates.productTypes[category] ?? templates.productTypes['Electronics'];
  const priceRange = VIP_PRICE_RANGES[vipLevel] ?? VIP_PRICE_RANGES[1];

  for (let attempt = 0; attempt < 30; attempt++) {
    const adjIdx = (seed + attempt * 3) % templates.adjectives.length;
    const typeIdx = (seed + attempt * 7) % typeList.length;
    const merchantIdx = (seed + attempt * 5) % templates.merchants.length;
    const adjective = templates.adjectives[adjIdx];
    const productType = typeList[typeIdx];
    const merchant = templates.merchants[merchantIdx];
    const productName = `${adjective} ${productType}`;

    if (usedNames.has(productName.toLowerCase())) {
      continue;
    }

    // Varied price within range using seed-based deterministic spread
    const priceSpan = priceRange.max - priceRange.min;
    const normalizedSeed = ((seed * 17 + attempt * 13) % 100 + 100) % 100;
    const price = roundMoney(priceRange.min + (normalizedSeed / 100) * priceSpan);

    return {
      product: productName,
      merchant,
      price,
      commission: vipCommission,
      image: templates.imagesByCategory[category] ?? templates.imagesByCategory['Electronics'],
      category,
      vipTier: vipLevel,
    };
  }

  return null;
}

// POST /admin/tasks/bulk — create multiple tasks from JSON array or CSV data
app.post('/make-server-a1c55d7e/admin/tasks/bulk', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-bulk-create');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const rawTasks: unknown[] = Array.isArray(body?.tasks) ? body.tasks : [];
    const skipDuplicates: boolean = body?.skipDuplicates !== false;

    if (rawTasks.length === 0) {
      return c.json({ error: 'tasks array is required and must not be empty' }, 400);
    }
    if (rawTasks.length > 500) {
      return c.json({ error: 'Maximum 500 tasks per bulk request' }, 400);
    }

    const existingTasks = await listTaskCatalogRecords();
    const existingNames = new Set<string>(existingTasks.map((t: any) => String(t.product ?? '').toLowerCase().trim()));
    const vipConfigRecords = await listVipConfigRecords();
    const baseCommission = vipConfigRecords.find((tier) => tier.level === 1)?.commission ?? 0.005;

    const created: any[] = [];
    const skipped: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    const sessionNames = new Set<string>();

    for (let i = 0; i < rawTasks.length; i++) {
      const raw = rawTasks[i] as any;
      const product = sanitizeTaskText(raw?.product || raw?.name);
      if (!product) {
        errors.push({ index: i, error: 'product name is required' });
        continue;
      }

      const nameLower = product.toLowerCase().trim();
      if ((existingNames.has(nameLower) || sessionNames.has(nameLower)) && skipDuplicates) {
        skipped.push(product);
        continue;
      }

      const priceRaw = Number(raw?.price);
      const price = Number.isFinite(priceRaw) && priceRaw > 0 ? roundMoney(priceRaw) : null;
      if (price === null) {
        errors.push({ index: i, error: `price must be > 0 for "${product}"` });
        continue;
      }

      const commissionRaw = Number(raw?.commission);
      const commission = Number.isFinite(commissionRaw) && commissionRaw > 0 ? commissionRaw : baseCommission;
      const productUrl = sanitizeTaskUrl(raw?.productUrl);
      const imageRaw = sanitizeTaskText(raw?.image || raw?.imageUrl);
      const image = inferTaskImageUrl(imageRaw, productUrl);
      const merchant = sanitizeTaskText(
        raw?.merchant,
        inferMerchantFromTaskUrls(productUrl, image) || 'Marketplace',
      );
      const rawVipTier = Number(raw?.vipTier);
      const vipTier = Number.isInteger(rawVipTier) && rawVipTier >= 1 && rawVipTier <= 5 ? rawVipTier : 0;

      const task = normalizeTaskCatalogRecord({
        id: createFinanceId('task'),
        merchant,
        product,
        price,
        priceSource: 'manual',
        commission,
        status: raw?.status ?? 'Active',
        image,
        rating: Number.isFinite(Number(raw?.rating)) ? Number(raw.rating) : 4,
        productUrl,
        category: typeof raw?.category === 'string' ? raw.category : '',
        vipTier,
        source: 'Bulk Import',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await kv.set(`${TASK_CATALOG_KEY_PREFIX}${task.id}`, task);
      created.push(task);
      sessionNames.add(nameLower);
      existingNames.add(nameLower);
    }

    const adminUser = c.get('adminUser');
    const actorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-task-catalog-bulk-create',
      actorEmail,
      `Bulk created ${created.length} tasks (skipped ${skipped.length}, errors ${errors.length})`,
    ).catch(() => {});

    return c.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      errorDetails: errors,
      skippedNames: skipped,
      tasks: created,
    }, 201);
  } catch (error) {
    console.error('Error bulk creating tasks:', error);
    return c.json({ error: 'Failed to bulk create tasks' }, 500);
  }
});

// POST /admin/tasks/generate — intelligently generate VIP-aware products
app.post('/make-server-a1c55d7e/admin/tasks/generate', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-generate');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const requestedLevels: number[] = Array.isArray(body?.vipLevels) && body.vipLevels.length > 0
      ? body.vipLevels
          .map(Number)
          .filter((l: number) => Number.isInteger(l) && l >= 1 && l <= 5)
      : [1, 2, 3, 4, 5];

    const countPerLevel = Math.min(50, Math.max(1, Number(body?.countPerLevel) || 5));
    const preview = body?.preview === true;

    const requestedCategories: string[] =
      Array.isArray(body?.categories) && body.categories.length > 0
        ? body.categories.filter((cat: unknown) => typeof cat === 'string')
        : PRODUCT_GENERATION_TEMPLATES.categories;

    const vipConfigRecords = await listVipConfigRecords();
    const existingTasks = await listTaskCatalogRecords();
    const usedNames = new Set<string>(existingTasks.map((t: any) => String(t.product ?? '').toLowerCase().trim()));

    const created: any[] = [];
    const now = new Date().toISOString();
    let seed = Math.floor((Date.now() % 100000) + Math.random() * 9999);

    for (const level of requestedLevels) {
      const vipConfig = vipConfigRecords.find((v) => v.level === level);
      const vipCommission = vipConfig?.commission ?? level * 0.005;
      let levelCreated = 0;
      let categoryIdx = level % requestedCategories.length;

      while (levelCreated < countPerLevel) {
        const category = requestedCategories[categoryIdx % requestedCategories.length];
        categoryIdx++;
        const generated = generateProductForVipTier(level, vipCommission, category, usedNames, seed++);
        if (!generated) {
          seed += 100;
          // Prevent infinite loop if names exhausted
          if (seed > 1_000_000) {
            break;
          }
          continue;
        }

        const task = normalizeTaskCatalogRecord({
          id: createFinanceId('task'),
          merchant: generated.merchant,
          product: generated.product,
          price: generated.price,
          priceSource: 'generated',
          commission: generated.commission,
          status: 'Active',
          image: generated.image,
          rating: 4,
          productUrl: '',
          category: generated.category,
          vipTier: generated.vipTier,
          source: 'AI Generated',
          createdAt: now,
          updatedAt: now,
        });

        if (!preview) {
          await kv.set(`${TASK_CATALOG_KEY_PREFIX}${task.id}`, task);
        }
        created.push(task);
        usedNames.add(generated.product.toLowerCase().trim());
        levelCreated++;
      }
    }

    const adminUser = c.get('adminUser');
    const actorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    if (!preview) {
      await recordObservabilityAuditEvent(
        'admin-task-catalog-generate',
        actorEmail,
        `Generated ${created.length} tasks across VIP levels [${requestedLevels.join(', ')}]`,
      ).catch(() => {});
    }

    return c.json({
      success: true,
      preview,
      generated: created.length,
      byVipLevel: requestedLevels.reduce(
        (acc, l) => {
          acc[l] = created.filter((t) => t.vipTier === l).length;
          return acc;
        },
        {} as Record<number, number>,
      ),
      tasks: created,
    }, preview ? 200 : 201);
  } catch (error) {
    console.error('Error generating tasks:', error);
    return c.json({ error: 'Failed to generate tasks' }, 500);
  }
});

// DELETE /admin/tasks/bulk — delete multiple tasks by ID (must be before /:taskId)
app.delete('/make-server-a1c55d7e/admin/tasks/bulk', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-bulk-delete');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const taskIds: string[] = Array.isArray(body?.taskIds)
      ? body.taskIds
          .filter((id: unknown) => typeof id === 'string' && String(id).trim())
          .map((id: string) => String(id).trim())
      : [];

    if (taskIds.length === 0) {
      return c.json({ error: 'taskIds array is required and must not be empty' }, 400);
    }
    if (taskIds.length > 500) {
      return c.json({ error: 'Maximum 500 task IDs per bulk delete request' }, 400);
    }

    const deleted: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const rawId of taskIds) {
      const taskId = sanitizeTaskId(rawId);
      if (!taskId) {
        errors.push({ id: rawId, error: 'Invalid task ID' });
        continue;
      }
      const existing = await getTaskCatalogRecord(taskId);
      if (!existing) {
        errors.push({ id: taskId, error: 'Task not found' });
        continue;
      }
      await kv.del(`${TASK_CATALOG_KEY_PREFIX}${taskId}`);
      deleted.push(taskId);
    }

    const adminUser = c.get('adminUser');
    const actorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-task-catalog-bulk-delete',
      actorEmail,
      `Bulk deleted ${deleted.length} tasks (errors: ${errors.length})`,
    ).catch(() => {});

    return c.json({
      success: true,
      deleted: deleted.length,
      errors: errors.length,
      errorDetails: errors,
      deletedIds: deleted,
    });
  } catch (error) {
    console.error('Error bulk deleting tasks:', error);
    return c.json({ error: 'Failed to bulk delete tasks' }, 500);
  }
});

// PUT /admin/tasks/bulk — bulk-update status/price/commission (must be before /:taskId)
app.put('/make-server-a1c55d7e/admin/tasks/bulk', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-bulk-update');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const taskIds: string[] = Array.isArray(body?.taskIds)
      ? body.taskIds
          .filter((id: unknown) => typeof id === 'string' && String(id).trim())
          .map((id: string) => String(id).trim())
      : [];
    const updates = body?.updates ?? {};

    if (taskIds.length === 0) {
      return c.json({ error: 'taskIds array is required and must not be empty' }, 400);
    }
    if (taskIds.length > 500) {
      return c.json({ error: 'Maximum 500 task IDs per bulk update request' }, 400);
    }

    const updated: any[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const rawId of taskIds) {
      const taskId = sanitizeTaskId(rawId);
      if (!taskId) {
        errors.push({ id: rawId, error: 'Invalid task ID' });
        continue;
      }
      const existing = await getTaskCatalogRecord(taskId);
      if (!existing) {
        errors.push({ id: taskId, error: 'Task not found' });
        continue;
      }

      const newPrice =
        Number.isFinite(Number(updates?.price)) && Number(updates.price) > 0
          ? roundMoney(Number(updates.price))
          : existing.price;
      const newCommission =
        Number.isFinite(Number(updates?.commission)) && Number(updates.commission) > 0
          ? Number(updates.commission)
          : existing.commission;
      const newStatus =
        typeof updates?.status === 'string' && (updates.status === 'Active' || updates.status === 'Paused')
          ? updates.status
          : existing.status;

      const updatedTask = normalizeTaskCatalogRecord({
        ...existing,
        price: newPrice,
        commission: newCommission,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      await kv.set(`${TASK_CATALOG_KEY_PREFIX}${taskId}`, updatedTask);
      updated.push(updatedTask);
    }

    const adminUser = c.get('adminUser');
    const actorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-task-catalog-bulk-update',
      actorEmail,
      `Bulk updated ${updated.length} tasks (errors: ${errors.length})`,
    ).catch(() => {});

    return c.json({
      success: true,
      updated: updated.length,
      errors: errors.length,
      errorDetails: errors,
      tasks: updated,
    });
  } catch (error) {
    console.error('Error bulk updating tasks:', error);
    return c.json({ error: 'Failed to bulk update tasks' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/tasks/:taskId', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-update');
    if (rateLimited) {
      return rateLimited;
    }

    const taskId = sanitizeTaskId(c.req.param('taskId'));
    if (!taskId) {
      return c.json({ error: 'Invalid task ID' }, 400);
    }

    const existingTask = await getTaskCatalogRecord(taskId);
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }

    const body = await c.req.json();
    const productUrl = sanitizeTaskUrl(body?.productUrl) || existingTask.productUrl;
    const image = inferTaskImageUrl(body?.image, productUrl || existingTask.image);
    const merchant = sanitizeTaskText(
      body?.merchant,
      existingTask.merchant || inferMerchantFromTaskUrls(productUrl, image) || 'General',
    );
    const product = sanitizeTaskText(body?.product, existingTask.product);
    const price = Number.isFinite(Number(body?.price)) ? roundMoney(Number(body.price)) : existingTask.price;
    const commission = Number.isFinite(Number(body?.commission)) ? Number(body.commission) : existingTask.commission;

    if (!product) {
      return c.json({ error: 'product is required' }, 400);
    }
    if (!Number.isFinite(price) || price <= 0) {
      return c.json({ error: 'price must be greater than 0' }, 400);
    }
    if (!Number.isFinite(commission) || commission <= 0) {
      return c.json({ error: 'commission must be greater than 0' }, 400);
    }

    const updatedTask = normalizeTaskCatalogRecord({
      ...existingTask,
      merchant,
      product,
      price,
      commission,
      status: body?.status ?? existingTask.status,
      image,
      rating: Number.isFinite(Number(body?.rating)) ? Number(body.rating) : existingTask.rating,
      productUrl,
      updatedAt: new Date().toISOString(),
    });

    await kv.set(`${TASK_CATALOG_KEY_PREFIX}${taskId}`, updatedTask);

    const adminUser = c.get('adminUser');
    const taskUpdateActorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-task-catalog-update',
      taskUpdateActorEmail,
      `Updated task catalog entry '${taskId}' (${updatedTask.merchant} ${updatedTask.product}, \$${updatedTask.price}, ${updatedTask.commission}% commission)`,
    ).catch((e) => console.error('Failed to record admin-task-catalog-update audit event:', e));

    return c.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Error updating admin task:', error);
    return c.json({ error: 'Failed to update task' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/vip-config/:level', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!canEditVipConfig(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:vip-config-update');
    if (rateLimited) {
      return rateLimited;
    }

    const level = Number(c.req.param('level'));
    if (!Number.isInteger(level) || level <= 0) {
      return c.json({ error: 'Invalid VIP level' }, 400);
    }

    const existingTier = await getVipConfigForLevel(level);
    if (existingTier.level !== level) {
      return c.json({ error: 'VIP level not found' }, 404);
    }

    const body = await c.req.json();
    const investment = Number.isFinite(Number(body?.investment)) ? roundMoney(Number(body.investment)) : existingTier.investment;
    const dailyTasks = Number.isFinite(Number(body?.dailyTasks)) ? Math.round(Number(body.dailyTasks)) : existingTier.dailyTasks;
    const commission = Number.isFinite(Number(body?.commission)) ? Number(body.commission) : existingTier.commission;
    const taskPriceMin = Number.isFinite(Number(body?.taskPriceMin)) ? roundMoney(Number(body.taskPriceMin)) : (existingTier.taskPriceMin ?? 0);
    const taskPriceMax = Number.isFinite(Number(body?.taskPriceMax)) ? roundMoney(Number(body.taskPriceMax)) : (existingTier.taskPriceMax ?? 0);

    if (!Number.isFinite(investment) || investment <= 0) {
      return c.json({ error: 'investment must be greater than 0' }, 400);
    }
    if (!Number.isInteger(dailyTasks) || dailyTasks <= 0) {
      return c.json({ error: 'dailyTasks must be a whole number greater than 0' }, 400);
    }
    if (!Number.isFinite(commission) || commission <= 0) {
      return c.json({ error: 'commission must be greater than 0' }, 400);
    }
    if ((taskPriceMin > 0 || taskPriceMax > 0) && !(taskPriceMin > 0 && taskPriceMax > 0)) {
      return c.json({ error: 'taskPriceMin and taskPriceMax must both be greater than 0 when enabling controlled commission ranges' }, 400);
    }
    if (taskPriceMin > 0 && taskPriceMax > 0 && taskPriceMax < taskPriceMin) {
      return c.json({ error: 'taskPriceMax must be greater than or equal to taskPriceMin' }, 400);
    }

    const updatedTier = normalizeVipConfigRecord({
      ...existingTier,
      name: body?.name ?? existingTier.name,
      investment,
      dailyTasks,
      commission,
      taskPriceMin,
      taskPriceMax,
      color: body?.color ?? existingTier.color,
      updatedAt: new Date().toISOString(),
    });

    await kv.set(`${VIP_CONFIG_KEY_PREFIX}${level}`, updatedTier);
    await syncUsersForVipLevels([level]).catch((e: unknown) => console.error('VIP sync after config update failed:', e));

    const vipActorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-vip-config-update',
      vipActorEmail,
      `Updated VIP tier level ${level} (investment: \$${updatedTier.investment}, dailyTasks: ${updatedTier.dailyTasks}, commission: ${updatedTier.commission}%)`,
    ).catch((e) => console.error('Failed to record admin-vip-config-update audit event:', e));

    return c.json({ success: true, tier: updatedTier });
  } catch (error) {
    console.error('Error updating VIP config:', error);
    return c.json({ error: 'Failed to update VIP config' }, 500);
  }
});

app.post('/make-server-a1c55d7e/admin/sync-all-users-vip', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!canEditVipConfig(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:sync-all-users-vip');
    if (rateLimited) {
      return rateLimited;
    }

    const levels = [1, 2, 3, 4, 5];
    const summaries = await syncUsersForVipLevels(levels);

    const processed = summaries.reduce((total, entry) => total + entry.processed, 0);
    const succeeded = summaries.reduce((total, entry) => total + entry.succeeded, 0);
    const failed = summaries.reduce((total, entry) => total + entry.failed, 0);

    const actorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-sync-all-users-vip',
      actorEmail,
      `Bulk VIP sync completed (processed: ${processed}, succeeded: ${succeeded}, failed: ${failed})`,
    ).catch(() => {});

    return c.json({
      success: true,
      message: failed > 0
        ? 'VIP sync completed with warnings. See summary for failed users.'
        : 'All users synced to their VIP tier task configuration.',
      summary: {
        processed,
        succeeded,
        failed,
        levels: summaries.map((entry) => ({
          level: entry.level,
          processed: entry.processed,
          succeeded: entry.succeeded,
          failed: entry.failed,
          errors: entry.errors.slice(0, 20),
        })),
      },
    });
  } catch (error) {
    console.error('Error syncing all users to VIP tiers:', error);
    return c.json({ error: 'Failed to sync users' }, 500);
  }
});

app.put('/make-server-a1c55d7e/admin/rewards-config', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    if (!isSuperAdmin(adminUser)) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:rewards-config-update');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await c.req.json();
    const existing = await getRewardsConfigRecord();

    const merged = {
      ...existing,
      workday: Array.isArray(body?.workday) ? body.workday : existing.workday,
      reset: Array.isArray(body?.reset) ? body.reset : existing.reset,
      accumulated: Array.isArray(body?.accumulated) ? body.accumulated : existing.accumulated,
      productSystem: body?.productSystem && typeof body.productSystem === 'object'
        ? { ...existing.productSystem, ...body.productSystem }
        : existing.productSystem,
      updatedAt: new Date().toISOString(),
    };

    const config = normalizeRewardsConfigRecord(merged);
    config.updatedAt = new Date().toISOString();
    await kv.set(REWARDS_CONFIG_KEY, config);

    const rewardsActorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-rewards-config-update',
      rewardsActorEmail,
      `Updated rewards config (workday tiers: ${Array.isArray(merged?.workday) ? merged.workday.length : 0}, reset tiers: ${Array.isArray(merged?.reset) ? merged.reset.length : 0})`,
    ).catch((e) => console.error('Failed to record admin-rewards-config-update audit event:', e));

    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error updating admin rewards config:', error);
    return c.json({ error: 'Failed to update rewards config' }, 500);
  }
});

app.delete('/make-server-a1c55d7e/admin/tasks/:taskId', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const rateLimited = enforceAdminRateLimit(c, 'admin:tasks-delete');
    if (rateLimited) {
      return rateLimited;
    }

    const taskId = sanitizeTaskId(c.req.param('taskId'));
    if (!taskId) {
      return c.json({ error: 'Invalid task ID' }, 400);
    }

    const existingTask = await getTaskCatalogRecord(taskId);
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }

    await kv.del(`${TASK_CATALOG_KEY_PREFIX}${taskId}`);

    const adminUser = c.get('adminUser');
    const taskDeleteActorEmail = typeof adminUser?.email === 'string' && adminUser.email
      ? adminUser.email
      : String(adminUser?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-task-catalog-delete',
      taskDeleteActorEmail,
      `Deleted task catalog entry '${taskId}'`,
    ).catch((e) => console.error('Failed to record admin-task-catalog-delete audit event:', e));

    return c.json({ success: true, deletedTaskId: taskId });
  } catch (error) {
    console.error('Error deleting admin task:', error);
    return c.json({ error: 'Failed to delete task' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/withdrawals', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:withdrawals-read');
    if (rateLimited) {
      return rateLimited;
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const allUsers = await kv.getEntriesByPrefix('user:');
    const normalizedUsers = allUsers
      .map((entry) => {
        const username = getUsernameFromUserKvEntry(entry);
        return username ? normalizeUserRecord(entry.value, username) : null;
      })
      .filter((user): user is ReturnType<typeof normalizeUserRecord> => Boolean(user));

    const visibleUsernames = new Set(
      normalizedUsers
        .filter((user) => Boolean(user.username) && user.username !== ROOT_REFERRAL_USERNAME)
        .filter((user) => callerIsSuperAdmin || user.referredByAdminId === callingAdmin?.id)
        .map((user) => user.username),
    );

    // Build wallet profile map for cross-referencing withdrawal methods
    const walletProfileByUsername = new Map<string, ReturnType<typeof normalizeStoredWalletProfile>>();
    for (const user of normalizedUsers) {
      if (user.username) {
        walletProfileByUsername.set(user.username, normalizeStoredWalletProfile(user.walletProfile));
      }
    }

    const rawWithdrawals = (await listWithdrawalRecords())
      .filter((withdrawal) => visibleUsernames.has(withdrawal.username));

    // Correct historical records where method doesn't reflect bound wallet
    const withdrawals = rawWithdrawals.map((w) => {
      const profile = walletProfileByUsername.get(w.username) ?? null;
      if (profile?.type === 'crypto') {
        const dest = getWalletProfileDestination(profile);
        if (dest && walletDestinationsMatch(w.walletAddress, dest)) {
          return { ...w, method: formatWalletAssetLabel(profile.walletType), network: sanitizeFinanceMethod(profile.network, 'mainnet') };
        }
      }
      return w;
    });

    return c.json({ withdrawals });
  } catch (error) {
    console.error('Error fetching admin withdrawals:', error);
    return c.json({ error: 'Failed to fetch withdrawals' }, 500);
  }
});

app.post('/make-server-a1c55d7e/admin/withdrawals/:withdrawalId/review', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = await enforceCriticalAdminRateLimit(c, 'admin:withdrawal-review');
    if (rateLimited) {
      return rateLimited;
    }

    const withdrawalId = String(c.req.param('withdrawalId') ?? '').trim();
    if (!withdrawalId) {
      return c.json({ error: 'withdrawalId is required' }, 400);
    }

    const body = await c.req.json();
    const action = typeof body?.action === 'string' ? body.action.trim().toLowerCase() : '';
    if (action !== 'approve' && action !== 'reject') {
      return c.json({ error: 'action must be approve or reject' }, 400);
    }

    const txHash = typeof body?.txHash === 'string' ? body.txHash.trim() : '';
    const rejectionReason = typeof body?.rejectionReason === 'string' ? body.rejectionReason.trim() : '';
    const withdrawalKey = `${WITHDRAWAL_KEY_PREFIX}${withdrawalId}`;
    const existingWithdrawal = await kv.get(withdrawalKey);
    if (!existingWithdrawal) {
      return c.json({ error: 'Withdrawal request not found' }, 404);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const withdrawal = normalizeWithdrawalRecord(existingWithdrawal);
    if (withdrawal.status !== 'Pending') {
      return c.json({ error: 'Withdrawal request has already been processed' }, 400);
    }

    const reviewResult = await withUserFinancialLock(withdrawal.username, async () => {
      const userKey = `user:${withdrawal.username}`;
      const userData = await kv.get(userKey);
      if (!userData) {
        return { response: c.json({ error: 'User not found' }, 404) };
      }

      const normalizedUserData = normalizeUserRecord(userData, withdrawal.username);
      if (!callerIsSuperAdmin && normalizedUserData.referredByAdminId !== callingAdmin?.id) {
        return { response: c.json({ error: 'Forbidden' }, 403) };
      }

      const lockedWithdrawalRaw = await kv.get(withdrawalKey);
      if (!lockedWithdrawalRaw) {
        return { response: c.json({ error: 'Withdrawal request not found' }, 404) };
      }

      const lockedWithdrawal = normalizeWithdrawalRecord(lockedWithdrawalRaw);
      if (lockedWithdrawal.status !== 'Pending') {
        return { response: c.json({ error: 'Withdrawal request has already been processed' }, 400) };
      }

      const before = snapshotFinancialState(normalizedUserData);
      const reviewedAt = new Date().toISOString();
      lockedWithdrawal.status = action === 'approve' ? 'Approved' : 'Rejected';
      lockedWithdrawal.reviewedAt = reviewedAt;
      lockedWithdrawal.reviewerId = callingAdmin?.id ?? null;
      lockedWithdrawal.reviewerEmail = typeof callingAdmin?.email === 'string' ? callingAdmin.email : null;
      lockedWithdrawal.txHash = txHash;
      lockedWithdrawal.rejectionReason = action === 'reject' ? rejectionReason : '';

      if (action === 'approve') {
        normalizedUserData.holdAmount = roundMoney(Math.max(0, normalizedUserData.holdAmount - lockedWithdrawal.amount));
        normalizedUserData.balance = roundMoney(normalizedUserData.balance - lockedWithdrawal.amount);
      } else {
        normalizedUserData.holdAmount = roundMoney(Math.max(0, normalizedUserData.holdAmount - lockedWithdrawal.amount));
      }

      const writes: Array<{ key: string; value: unknown }> = [
        { key: withdrawalKey, value: lockedWithdrawal },
      ];
      const transactionKey = `${TRANSACTION_KEY_PREFIX}${lockedWithdrawal.transactionId}`;
      const existingTransaction = await kv.get(transactionKey);
      if (existingTransaction) {
        const updatedTransaction = normalizeTransactionRecord({
          ...existingTransaction,
          status: action === 'approve' ? 'Completed' : 'Rejected',
          txHash,
          updatedAt: reviewedAt,
          date: reviewedAt,
          description: action === 'approve' ? 'Withdrawal approved by admin' : 'Withdrawal rejected by admin',
        });
        writes.push({ key: transactionKey, value: updatedTransaction });
      }

      const persisted = await persistFinancialState({
        username: withdrawal.username,
        user: normalizedUserData,
        operation: action === 'approve' ? 'admin_withdrawal_approved' : 'admin_withdrawal_rejected',
        before,
        writes,
        ledgerMetadata: {
          withdrawalId,
          transactionId: lockedWithdrawal.transactionId,
          action,
        },
      });

      return {
        withdrawal: lockedWithdrawal,
        user: persisted.user,
      };
    });

    if ('response' in reviewResult) {
      return reviewResult.response;
    }

    const reviewActorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    const reviewAuditAction = action === 'approve' ? 'admin-withdrawal-approve' : 'admin-withdrawal-reject';
    const reviewAuditDetail = action === 'approve'
      ? `Approved withdrawal '${withdrawalId}' ($${withdrawal.amount}) for user '${withdrawal.username}'${txHash ? ` — txHash: ${txHash}` : ''}`
      : `Rejected withdrawal '${withdrawalId}' ($${withdrawal.amount}) for user '${withdrawal.username}'${rejectionReason ? ` — reason: ${rejectionReason}` : ''}`;
    await recordObservabilityAuditEvent(
      reviewAuditAction,
      reviewActorEmail,
      reviewAuditDetail,
    ).catch((e) => console.error('Failed to record withdrawal-review audit event:', e));

    return c.json({
      success: true,
      withdrawal: reviewResult.withdrawal,
      balance: reviewResult.user.balance,
      holdAmount: reviewResult.user.holdAmount,
      availableAmount: roundMoney(reviewResult.user.balance - reviewResult.user.holdAmount),
    });
  } catch (error) {
    console.error('Error reviewing withdrawal request:', error);
    return c.json({ error: 'Failed to review withdrawal request' }, 500);
  }
})

// Get premium assignments for the session-authenticated user
app.get('/make-server-a1c55d7e/me/premium', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const premiumPrefix = `premium:${sessionResult.session.username}:`;
    const premiums = await kv.getByPrefix(premiumPrefix);

    // Sort by assigned date descending
    const sortedPremiums = premiums.sort((a, b) =>
      new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );

    return c.json(sortedPremiums);
  } catch (error) {
    console.error('Error fetching session premium assignments:', error);
    return c.json({ error: 'Failed to fetch premium assignments' }, 500);
  }
});

// Get premium assignments across scoped users for admin views
app.get("/make-server-a1c55d7e/admin/premium-assignments", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:premium-assignments');
    if (rateLimited) {
      return rateLimited;
    }

    const adminUser = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(adminUser);

    const allUsers = await kv.getByPrefix('user:');
    const normalizedUsers = allUsers
      .map((candidate) => {
        const username = typeof candidate?.username === 'string' ? candidate.username : null;
        if (!username) {
          return null;
        }
        return normalizeUserRecord(candidate, username);
      })
      .filter((user): user is ReturnType<typeof normalizeUserRecord> => Boolean(user));

    const scopedUsers = callerIsSuperAdmin
      ? normalizedUsers
      : normalizedUsers.filter((user) => user.referredByAdminId === adminUser?.id);

    const assignments = scopedUsers.flatMap((user) => {
      const queue = Array.isArray(user.premiumQueue) ? user.premiumQueue : [];
      return queue.map((assignment, index) => ({
        username: user.username,
        vipLevel: user.vipLevel,
        queuePosition: index + 1,
        isActive: user.activePremium?.id === assignment?.id,
        ...assignment,
      }));
    });

    assignments.sort((left, right) => {
      const leftTime = typeof left.assignedAt === 'string' ? new Date(left.assignedAt).getTime() : 0;
      const rightTime = typeof right.assignedAt === 'string' ? new Date(right.assignedAt).getTime() : 0;
      return rightTime - leftTime;
    });

    return c.json({ assignments });
  } catch (error) {
    console.error('Error fetching admin premium assignments:', error);
    return c.json({ error: 'Failed to fetch premium assignments' }, 500);
  }
});

// ==================== CS SYSTEM ENDPOINTS ====================

const SUPPORT_LINKS_KEY = 'support:links';
const DEFAULT_SUPPORT_LINKS = {
  whatsappNumber: '1234567890',
  telegramUsername: 'steadfastdigital',
  supportEmail: 'support@steadfastdigital.com',
};

function sanitizeSupportLinks(value: unknown) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SUPPORT_LINKS };
  }

  const candidate = value as Record<string, unknown>;
  const whatsappNumber = typeof candidate.whatsappNumber === 'string' && candidate.whatsappNumber.trim()
    ? candidate.whatsappNumber.trim()
    : DEFAULT_SUPPORT_LINKS.whatsappNumber;
  const telegramUsername = typeof candidate.telegramUsername === 'string' && candidate.telegramUsername.trim()
    ? candidate.telegramUsername.trim()
    : DEFAULT_SUPPORT_LINKS.telegramUsername;
  const supportEmail = typeof candidate.supportEmail === 'string' && candidate.supportEmail.trim()
    ? candidate.supportEmail.trim()
    : DEFAULT_SUPPORT_LINKS.supportEmail;

  return {
    whatsappNumber,
    telegramUsername,
    supportEmail,
  };
}

// Get support contact links
app.get("/make-server-a1c55d7e/cs/support-links", async (c) => {
  try {
    const [saved, csSettingsRaw] = await Promise.all([kv.get(SUPPORT_LINKS_KEY), kv.get(ADMIN_PLATFORM_SETTINGS_KEY)]);
    const csSettings = sanitizeAdminPlatformSettings(csSettingsRaw);
    if (!isPlatformWithinHours(csSettings)) {
      return c.json({ error: 'Customer support is not available outside platform working hours (9 AM – 10 PM EST).', code: 'outside_platform_hours' }, 503);
    }
    return c.json(sanitizeSupportLinks(saved));
  } catch (error) {
    console.error('Error fetching support links:', error);
    return c.json({ error: 'Failed to fetch support links' }, 500);
  }
});

// Update support contact links
app.post("/make-server-a1c55d7e/cs/support-links", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:cs-support-links-update');
    if (rateLimited) {
      return rateLimited;
    }

    const payload = sanitizeSupportLinks(await c.req.json());
    await kv.set(SUPPORT_LINKS_KEY, payload);
    return c.json({ success: true, links: payload });
  } catch (error) {
    console.error('Error saving support links:', error);
    return c.json({ error: 'Failed to save support links' }, 500);
  }
});

// Create a support ticket
app.post("/make-server-a1c55d7e/cs/create-ticket", async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:create-ticket');
    if (rateLimited) return rateLimited;

    const { subject, message, category, priority } = await c.req.json();
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const username = sessionResult.session.username;

    if (!subject || !message || !category) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ticket = {
      id: ticketId,
      username,
      subject,
      message,
      category,
      priority: priority || 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
      assignedTo: null,
    };
    
    const ticketKey = `ticket:${ticketId}`;
    await kv.set(ticketKey, ticket);
    
    // Add to user's tickets list
    const userTicketsKey = `user:${username}:tickets`;
    const userTickets = await kv.get(userTicketsKey) || [];
    userTickets.push(ticketId);
    await kv.set(userTicketsKey, userTickets);
    
    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return c.json({ error: 'Failed to create support ticket' }, 500);
  }
});

// Get all tickets (admin)
app.get("/make-server-a1c55d7e/cs/admin/tickets", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:cs-tickets-read');
    if (rateLimited) {
      return rateLimited;
    }

    const ticketPrefix = 'ticket:ticket_';
    const tickets = await kv.getByPrefix(ticketPrefix);
    
    // Sort by created date descending
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json(tickets);
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    return c.json({ error: 'Failed to fetch all tickets' }, 500);
  }
});

// Add response to ticket
app.post("/make-server-a1c55d7e/cs/respond", async (c) => {
  try {
    const { ticketId, message, respondedBy: rawRespondedBy, isAdmin } = await c.req.json();
    let respondedBy = '';
    let sessionUsername: string | null = null;
    let adminUser: any = null;
    let callerIsSuperAdmin = false;

    if (isAdmin) {
      const unauthorized = await requireAdmin(c);
      if (unauthorized) {
        return unauthorized;
      }
      const rateLimited = enforceAdminRateLimit(c, 'admin:cs-respond');
      if (rateLimited) {
        return rateLimited;
      }

      adminUser = c.get('adminUser');
      callerIsSuperAdmin = isSuperAdmin(adminUser);
      respondedBy = mapAuthUserToAdminRecord(adminUser ?? {}).username || adminUser?.email || adminUser?.id || 'admin';
    } else {
      const sessionResult = await requireActiveUserSession(c);
      if ('response' in sessionResult) {
        return sessionResult.response;
      }
      sessionUsername = sessionResult.session.username;

      const requestedRespondedBy = sanitizeUsername(rawRespondedBy);
      if (requestedRespondedBy && requestedRespondedBy.toLowerCase() !== sessionUsername.toLowerCase()) {
        return c.json({ error: 'Forbidden: requested user does not match active session' }, 403);
      }

      respondedBy = sessionResult.session.username;
    }
    
    if (!ticketId || !message || !respondedBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const ticketKey = `ticket:${ticketId}`;
    const ticket = await kv.get(ticketKey);
    
    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    if (isAdmin) {
      const ticketUsername = sanitizeUsername(ticket.username);
      if (!ticketUsername) {
        return c.json({ error: 'Ticket owner is invalid' }, 400);
      }

      const canonicalTicketUsername = (await resolveCanonicalUsername(ticketUsername)) ?? ticketUsername;
      const targetUserData = await kv.get(`user:${canonicalTicketUsername}`);
      if (!targetUserData) {
        return c.json({ error: 'User not found' }, 404);
      }

      const normalizedTargetUser = normalizeUserRecord(targetUserData, canonicalTicketUsername);
      if (!callerIsSuperAdmin && normalizedTargetUser.referredByAdminId !== adminUser?.id) {
        return c.json({ error: 'Forbidden' }, 403);
      }
    }

    if (!isAdmin && sessionUsername && ticket.username !== sessionUsername) {
      return c.json({ error: 'Forbidden: requested user does not match active session' }, 403);
    }
    
    const response = {
      id: `response_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      message,
      respondedBy,
      isAdmin: isAdmin || false,
      createdAt: new Date().toISOString(),
    };
    
    ticket.responses.push(response);
    ticket.updatedAt = new Date().toISOString();
    
    await kv.set(ticketKey, ticket);
    
    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error responding to ticket:', error);
    return c.json({ error: 'Failed to respond to ticket' }, 500);
  }
});

// Update ticket status
app.post("/make-server-a1c55d7e/cs/update-status", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }

    const adminUser = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(adminUser);

    const rateLimited = enforceAdminRateLimit(c, 'admin:cs-update-status');
    if (rateLimited) {
      return rateLimited;
    }

    const { ticketId, status, assignedTo } = await c.req.json();
    
    if (!ticketId || !status) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const VALID_TICKET_STATUSES = ['open', 'in-progress', 'resolved', 'closed'];
    if (!VALID_TICKET_STATUSES.includes(status)) {
      return c.json({ error: `Invalid status. Must be one of: ${VALID_TICKET_STATUSES.join(', ')}` }, 400);
    }
    
    const ticketKey = `ticket:${ticketId}`;
    const ticket = await kv.get(ticketKey);
    
    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    const ticketUsername = sanitizeUsername(ticket.username);
    if (!ticketUsername) {
      return c.json({ error: 'Ticket owner is invalid' }, 400);
    }

    const canonicalTicketUsername = (await resolveCanonicalUsername(ticketUsername)) ?? ticketUsername;
    const targetUserData = await kv.get(`user:${canonicalTicketUsername}`);
    if (!targetUserData) {
      return c.json({ error: 'User not found' }, 404);
    }

    const normalizedTargetUser = normalizeUserRecord(targetUserData, canonicalTicketUsername);
    if (!callerIsSuperAdmin && normalizedTargetUser.referredByAdminId !== adminUser?.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    
    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo;
    }
    
    await kv.set(ticketKey, ticket);
    
    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return c.json({ error: 'Failed to update ticket status' }, 500);
  }
});

// Create live chat message
type ChatAttachmentType = 'image' | 'video' | 'audio' | 'file';
type ChatResponseState = 'idle' | 'awaiting-support' | 'support-replied';

const CHAT_IMAGE_PREFIX = '__img__:';
const CHAT_ATTACHMENT_PREFIX = '__att__:';
const CHAT_ATTACHMENT_PREFIX_LEGACY = '__att_:';

function decodeChatMessagePreview(rawMessage: unknown): { text: string; attachmentType: ChatAttachmentType | null } {
  const safeRawMessage = typeof rawMessage === 'string' ? rawMessage : '';
  if (!safeRawMessage) {
    return { text: '', attachmentType: null };
  }

  if (safeRawMessage.startsWith(CHAT_ATTACHMENT_PREFIX) || safeRawMessage.startsWith(CHAT_ATTACHMENT_PREFIX_LEGACY)) {
    try {
      const payloadString = safeRawMessage.startsWith(CHAT_ATTACHMENT_PREFIX)
        ? safeRawMessage.slice(CHAT_ATTACHMENT_PREFIX.length)
        : safeRawMessage.slice(CHAT_ATTACHMENT_PREFIX_LEGACY.length);
      const payload = JSON.parse(payloadString) as {
        text?: unknown;
        attachment?: Record<string, unknown>;
      };
      const attachmentType = payload?.attachment?.type;
      return {
        text: typeof payload?.text === 'string' ? payload.text.trim() : '',
        attachmentType: attachmentType === 'image' || attachmentType === 'video' || attachmentType === 'audio' || attachmentType === 'file'
          ? attachmentType
          : null,
      };
    } catch {
      return {
        text: 'Attachment message',
        attachmentType: null,
      };
    }
  }

  if (!safeRawMessage.startsWith(CHAT_IMAGE_PREFIX)) {
    return { text: safeRawMessage.trim(), attachmentType: null };
  }

  const payload = safeRawMessage.slice(CHAT_IMAGE_PREFIX.length);
  const newlineIndex = payload.indexOf('\n');
  return {
    text: newlineIndex === -1 ? '' : payload.slice(newlineIndex + 1).trim(),
    attachmentType: 'image',
  };
}

function buildChatMessagePreview(rawMessage: unknown): { preview: string; attachmentType: ChatAttachmentType | null } {
  const decoded = decodeChatMessagePreview(rawMessage);
  if (decoded.attachmentType) {
    const label = decoded.attachmentType.charAt(0).toUpperCase() + decoded.attachmentType.slice(1);
    return {
      preview: decoded.text ? `[${label}] ${decoded.text}` : `[${label}]`,
      attachmentType: decoded.attachmentType,
    };
  }

  return {
    preview: decoded.text || 'New message',
    attachmentType: null,
  };
}

function computeAverageAdminResponseMs(messages: any[]): number | null {
  const durations: number[] = [];
  let pendingUserTimestamp: number | null = null;

  for (const message of messages) {
    const timestampValue = new Date(String(message?.timestamp ?? '')).getTime();
    if (!Number.isFinite(timestampValue)) {
      continue;
    }

    if (Boolean(message?.isAdmin)) {
      if (pendingUserTimestamp !== null) {
        durations.push(Math.max(0, timestampValue - pendingUserTimestamp));
        pendingUserTimestamp = null;
      }
      continue;
    }

    if (pendingUserTimestamp === null) {
      pendingUserTimestamp = timestampValue;
    }
  }

  if (durations.length === 0) {
    return null;
  }

  return Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
}

function buildChatThreadSummary(username: string, messages: any[]) {
  const safeMessages = Array.isArray(messages)
    ? messages.filter((message) => message && typeof message === 'object')
    : [];
  const lastMessage = safeMessages.length > 0 ? safeMessages[safeMessages.length - 1] : null;
  const preview = buildChatMessagePreview(lastMessage?.message ?? '');
  const unreadUserMessages = safeMessages.filter((message) => message?.read === false && !Boolean(message?.isAdmin)).length;
  const unreadAdminMessages = safeMessages.filter((message) => message?.read === false && Boolean(message?.isAdmin)).length;
  const latestUserMessage = [...safeMessages].reverse().find((message) => !Boolean(message?.isAdmin) && typeof message?.timestamp === 'string');
  const latestAdminMessage = [...safeMessages].reverse().find((message) => Boolean(message?.isAdmin) && typeof message?.timestamp === 'string');
  const lastSenderRole: 'user' | 'admin' | 'system' = lastMessage
    ? (Boolean(lastMessage?.isAdmin) ? 'admin' : 'user')
    : 'system';
  const responseState: ChatResponseState = safeMessages.length === 0
    ? 'idle'
    : (lastSenderRole === 'user' ? 'awaiting-support' : 'support-replied');

  return {
    username,
    lastMessage: typeof lastMessage?.message === 'string' ? lastMessage.message : '',
    lastMessagePreview: preview.preview,
    lastMessageTime: typeof lastMessage?.timestamp === 'string' ? lastMessage.timestamp : '',
    unreadCount: unreadUserMessages,
    totalMessages: safeMessages.length,
    pendingUserMessages: unreadUserMessages,
    unreadAdminCount: unreadAdminMessages,
    lastSenderRole,
    latestUserMessageAt: typeof latestUserMessage?.timestamp === 'string' ? latestUserMessage.timestamp : null,
    latestAdminMessageAt: typeof latestAdminMessage?.timestamp === 'string' ? latestAdminMessage.timestamp : null,
    responseState,
    averageAdminResponseMs: computeAverageAdminResponseMs(safeMessages),
    lastMessageAttachmentType: preview.attachmentType,
  };
}

app.post("/make-server-a1c55d7e/cs/chat/send", async (c) => {
  try {
    const { username: rawChatUsername, message, isAdmin } = await c.req.json();
    let username = '';

    if (isAdmin) {
      const unauthorized = await requireAdmin(c);
      if (unauthorized) {
        return unauthorized;
      }
      const rateLimited = enforceAdminRateLimit(c, 'admin:cs-chat-send');
      if (rateLimited) {
        return rateLimited;
      }

      const requestedUsername = sanitizeUsername(rawChatUsername);
      if (!requestedUsername) {
        return c.json({ error: 'Invalid username' }, 400);
      }

      const canonicalRequestedUsername = await resolveCanonicalUsername(requestedUsername);
      if (!canonicalRequestedUsername) {
        return c.json({ error: 'User not found' }, 404);
      }

      const adminUser = c.get('adminUser');
      const callerIsSuperAdmin = isSuperAdmin(adminUser);
      const userData = await kv.get(`user:${canonicalRequestedUsername}`);
      if (!userData) {
        return c.json({ error: 'User not found' }, 404);
      }

      const normalizedUser = normalizeUserRecord(userData, canonicalRequestedUsername);
      if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== adminUser?.id) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      username = canonicalRequestedUsername;
    } else {
      const sessionResult = await requireActiveUserSession(c);
      if ('response' in sessionResult) {
        return sessionResult.response;
      }
      username = sessionResult.session.username;
    }
    
    const normalizedMessage = typeof message === 'string' ? message : '';

    if (!username || !normalizedMessage.trim()) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const chatKey = `chat:${username}`;
    const chatMessages = await kv.get(chatKey) || [];
    const messageTimestamp = new Date().toISOString();
    
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      message: normalizedMessage,
      conversationUsername: username,
      sender: isAdmin
        ? (mapAuthUserToAdminRecord(c.get('adminUser') ?? {}).username || c.get('adminUser')?.email || c.get('adminUser')?.id || 'support')
        : username,
      isAdmin: isAdmin || false,
      timestamp: messageTimestamp,
      deliveredAt: messageTimestamp,
      read: false,
    };
    
    chatMessages.push(newMessage);
    
    // Keep only last 100 messages
    if (chatMessages.length > 100) {
      chatMessages.shift();
    }
    
    await kv.set(chatKey, chatMessages);
    
    return c.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return c.json({ error: 'Failed to send chat message' }, 500);
  }
});

// Get chat messages
app.get("/make-server-a1c55d7e/cs/chat/:username", async (c) => {
  try {
    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    let username = '';
    const forwardedUserJwt = c.req.header('x-user-jwt') ?? '';

    if (forwardedUserJwt.trim().length > 0) {
      const unauthorized = await requireAdmin(c);
      if (unauthorized) {
        return unauthorized;
      }
      const rateLimited = enforceAdminRateLimit(c, 'admin:cs-chat-read-thread');
      if (rateLimited) {
        return rateLimited;
      }

      const canonicalRequestedUsername = await resolveCanonicalUsername(requestedUsername);
      if (!canonicalRequestedUsername) {
        return c.json({ error: 'User not found' }, 404);
      }

      const adminUser = c.get('adminUser');
      const callerIsSuperAdmin = isSuperAdmin(adminUser);
      const userData = await kv.get(`user:${canonicalRequestedUsername}`);
      if (!userData) {
        return c.json({ error: 'User not found' }, 404);
      }

      const normalizedUser = normalizeUserRecord(userData, canonicalRequestedUsername);
      if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== adminUser?.id) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      username = canonicalRequestedUsername;
    } else {
      const identity = await resolveSessionBoundUsername(c, requestedUsername);
      if ('response' in identity) {
        return identity.response;
      }
      username = identity.username;
    }

    const chatKey = `chat:${username}`;

    const messages = await kv.get(chatKey) || [];

    return c.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return c.json({ error: 'Failed to fetch chat messages' }, 500);
  }
});

// Mark chat messages as read for the current viewer
app.post("/make-server-a1c55d7e/cs/chat/mark-read", async (c) => {
  try {
    const { username: rawMarkReadUsername, viewer } = await c.req.json();

    if (viewer === 'admin') {
      const unauthorized = await requireAdmin(c);
      if (unauthorized) {
        return unauthorized;
      }
      const rateLimited = enforceAdminRateLimit(c, 'admin:cs-chat-mark-read');
      if (rateLimited) {
        return rateLimited;
      }
    }

    if (viewer !== 'admin' && viewer !== 'user') {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    let username = '';
    if (viewer === 'user') {
      const sessionResult = await requireActiveUserSession(c);
      if ('response' in sessionResult) {
        return sessionResult.response;
      }
      username = sessionResult.session.username;
    } else {
      const requestedUsername = sanitizeUsername(rawMarkReadUsername);
      if (!requestedUsername) {
        return c.json({ error: 'Missing required fields' }, 400);
      }

      const canonicalRequestedUsername = await resolveCanonicalUsername(requestedUsername);
      if (!canonicalRequestedUsername) {
        return c.json({ error: 'User not found' }, 404);
      }

      const adminUser = c.get('adminUser');
      const callerIsSuperAdmin = isSuperAdmin(adminUser);
      const userData = await kv.get(`user:${canonicalRequestedUsername}`);
      if (!userData) {
        return c.json({ error: 'User not found' }, 404);
      }

      const normalizedUser = normalizeUserRecord(userData, canonicalRequestedUsername);
      if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== adminUser?.id) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      username = canonicalRequestedUsername;
    }

    const chatKey = `chat:${username}`;
    const messages = await kv.get(chatKey) || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return c.json({ success: true, updated: 0 });
    }

    const shouldMarkAdminMessages = viewer === 'user';
    let updated = 0;

    const nextMessages = messages.map((message) => {
      if (
        message &&
        typeof message === 'object' &&
        message.read === false &&
        Boolean(message.isAdmin) === shouldMarkAdminMessages
      ) {
        updated += 1;
        return {
          ...message,
          read: true,
        };
      }

      return message;
    });

    if (updated > 0) {
      await kv.set(chatKey, nextMessages);
    }

    return c.json({ success: true, updated });
  } catch (error) {
    console.error('Error marking chat messages as read:', error);
    return c.json({ error: 'Failed to mark chat messages as read' }, 500);
  }
});

// Get all active chats (admin)
app.get("/make-server-a1c55d7e/cs/admin/chats", async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) {
      return unauthorized;
    }
    const rateLimited = enforceAdminRateLimit(c, 'admin:cs-chats-read');
    if (rateLimited) {
      return rateLimited;
    }

    const chatPrefix = 'chat:';
    // Query key+value directly so username can be derived from the KV key
    const { data: kvRows, error: kvError } = await authClient!
      .from('kv_store_a1c55d7e')
      .select('key, value')
      .like('key', `${chatPrefix}%`);
    if (kvError) throw new Error(kvError.message);
    const chatSummaries = (kvRows ?? [])
      .filter(row => Array.isArray(row.value) && row.value.length > 0)
      .map(({ key, value: messages }) => {
        const usernameFromKey = sanitizeUsername(key.slice(chatPrefix.length)) || 'unknown';
        return {
          ...buildChatThreadSummary(usernameFromKey, messages),
        };
      });
    
    chatSummaries.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    
    return c.json(chatSummaries);
  } catch (error) {
    console.error('Error fetching all chats:', error);
    return c.json({ error: 'Failed to fetch all chats' }, 500);
  }
});

app.get('/make-server-a1c55d7e/me/chat/summary', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const username = sessionResult.session.username;
    const messages = await kv.get(`chat:${username}`) || [];

    return c.json(buildChatThreadSummary(username, messages));
  } catch (error) {
    console.error('Error fetching user chat summary:', error);
    return c.json({ error: 'Failed to fetch chat summary' }, 500);
  }
});

// ==================== PASSWORD RESET ENDPOINTS ====================

// Request password reset
app.post("/make-server-a1c55d7e/auth/forgot-password", async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:forgot-password', FORGOT_PASSWORD_RATE_LIMIT_MAX);
    if (rateLimited) return rateLimited;

    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }
    
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailLocalPart = normalizedEmail.includes('@') ? normalizedEmail.split('@')[0] : normalizedEmail;
    const resetUsername = emailLocalPart ? await resolveCanonicalUsername(emailLocalPart) : null;

    const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const resetExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    
    // Store reset token
    const resetKey = `password_reset:${resetToken}`;
    await kv.set(resetKey, {
      email,
      username: resetUsername,
      token: resetToken,
      expiresAt: resetExpiry,
      used: false,
    });
    
    // In a real implementation, send email with reset link
    // For now, we'll just log it
    console.log(`Password reset requested for: ${email}`);
    console.log(`Reset token: ${resetToken}`);
    console.log(`Reset link: /reset-password?token=${resetToken}`);
    
    return c.json({
      success: true,
      message: 'Password reset instructions sent to email',
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return c.json({ error: 'Failed to process password reset request' }, 500);
  }
});

// Verify reset token
app.get("/make-server-a1c55d7e/auth/verify-reset-token/:token", async (c) => {
  try {
    const token = sanitizeResetToken(c.req.param("token"));
    if (!token) {
      return c.json({ valid: false, error: 'Invalid reset token format' }, 400);
    }
    const resetKey = `password_reset:${token}`;

    const resetData = await kv.get(resetKey);
    
    if (!resetData) {
      return c.json({ valid: false, error: 'Invalid or expired reset token' }, 400);
    }
    
    if (resetData.used) {
      return c.json({ valid: false, error: 'This reset link has already been used' }, 400);
    }
    
    if (new Date(resetData.expiresAt) < new Date()) {
      return c.json({ valid: false, error: 'This reset link has expired' }, 400);
    }
    
    return c.json({ valid: true, email: resetData.email });
  } catch (error) {
    console.error('Error verifying reset token:', error);
    return c.json({ error: 'Failed to verify reset token' }, 500);
  }
});

// Reset password with token
app.post("/make-server-a1c55d7e/auth/reset-password", async (c) => {
  try {
    const { token: rawResetToken, newPassword, username: rawResetUsername } = await c.req.json();
    const token = sanitizeResetToken(rawResetToken);
    const username = sanitizeUsername(rawResetUsername);

    if (!token || !newPassword || !username) {
      return c.json({ error: 'Token, username, and new password are required' }, 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Verify token
    const resetKey = `password_reset:${token}`;
    const resetData = await kv.get(resetKey);
    
    if (!resetData || resetData.used || new Date(resetData.expiresAt) < new Date()) {
      return c.json({ error: 'Invalid or expired reset token' }, 400);
    }

    if (typeof resetData.username === 'string' && resetData.username.trim()) {
      const tokenUsername = sanitizeUsername(resetData.username);
      if (!tokenUsername || tokenUsername !== username) {
        return c.json({ error: 'Token does not match username' }, 400);
      }
    }
    
    // Get user data
    const userKey = `user:${username}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Hash the new password before storing
    userData.password = await hashPassword(newPassword);
    userData.mustChangePassword = false;
    userData.passwordUpdatedAt = new Date().toISOString();
    await kv.set(userKey, userData);
    await revokeUserSessionsForUsername(username);

    // Mark token as used
    resetData.used = true;
    resetData.usedAt = new Date().toISOString();
    await kv.set(resetKey, resetData);
    
    console.log(`Password reset successful for user: ${username}`);
    
    return c.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return c.json({ error: 'Failed to reset password' }, 500);
  }
});

// Change password (authenticated user)
app.post("/make-server-a1c55d7e/auth/change-password", async (c) => {
  try {
    const { currentPassword, newPassword } = await c.req.json();
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }

    const username = sessionResult.session.username;

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'All fields are required' }, 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400);
    }

    const canonicalUsername = await resolveCanonicalUsername(username);
    if (!canonicalUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userKey = `user:${canonicalUsername}`;
    const userData = await kv.get(userKey);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Verify current password (constant-time, supports legacy plaintext migration)
    if (userData.password && !await verifyPassword(currentPassword, userData.password)) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Hash and store the new password
    userData.password = await hashPassword(newPassword);
    userData.mustChangePassword = false;
    userData.passwordUpdatedAt = new Date().toISOString();
    await kv.set(userKey, userData);

    await revokeUserSessionsForUsername(canonicalUsername, {
      preserveSessionId: sessionResult.session.sessionId,
      preservedMustChangePassword: false,
    });
    
    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

// Change user login/transaction credentials from profile (server-backed session token required)
app.post('/make-server-a1c55d7e/auth/change-credentials', async (c) => {
  try {
    const rateLimited = await enforceCriticalUserRateLimit(c, 'user:change-credentials', 8);
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const currentLoginPassword = typeof body?.currentLoginPassword === 'string' ? body.currentLoginPassword : '';
    const newLoginPassword = typeof body?.newLoginPassword === 'string' ? body.newLoginPassword : '';
    const newTransactionPassword = typeof body?.newTransactionPassword === 'string' ? body.newTransactionPassword : '';

    if (!currentLoginPassword) {
      return c.json({ error: 'currentLoginPassword is required' }, 400);
    }
    if (!newLoginPassword && !newTransactionPassword) {
      return c.json({ error: 'At least one new credential is required' }, 400);
    }
    if (newLoginPassword && newLoginPassword.length < 6) {
      return c.json({ error: 'New login password must be at least 6 characters' }, 400);
    }
    if (newTransactionPassword && newTransactionPassword.length < 6) {
      return c.json({ error: 'New transaction password must be at least 6 characters' }, 400);
    }

    const session = await getSessionFromRequest(c);
    if (!session) {
      c.header('Set-Cookie', buildSessionClearCookieValue());
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    const userKey = `user:${session.username}`;
    const userData = await kv.get(userKey);
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (!(await verifyPassword(currentLoginPassword, String((userData as any).password ?? '')))) {
      return c.json({ error: 'Current login password is incorrect' }, 401);
    }

    if (newLoginPassword) {
      (userData as any).password = await hashPassword(newLoginPassword);
    }
    if (newTransactionPassword) {
      (userData as any).transactionPassword = await hashPassword(newTransactionPassword);
    }

    (userData as any).mustChangePassword = false;
    (userData as any).passwordUpdatedAt = new Date().toISOString();
    await kv.set(userKey, userData);

    if (newLoginPassword) {
      await revokeUserSessionsForUsername(session.username, {
        preserveSessionId: session.sessionId,
        preservedMustChangePassword: false,
      });
    } else {
      // Keep session state synchronized with password-policy marker.
      const sessionRecord = await getValidSessionById(session.sessionId);
      if (sessionRecord) {
        sessionRecord.mustChangePassword = false;
        await kv.set(`${USER_SESSION_PREFIX}${session.sessionId}`, sessionRecord);
      }
    }

    return c.json({
      ok: true,
      username: session.username,
      mustChangePassword: false,
      updated: {
        loginPassword: Boolean(newLoginPassword),
        transactionPassword: Boolean(newTransactionPassword),
      },
    });
  } catch (error) {
    console.error('Error changing user credentials:', error);
    return c.json({ error: 'Failed to update credentials' }, 500);
  }
});

// ── Admin Invitation Code endpoints ─────────────────────────────────────────
// KV layout:
//   admin:invite:code:<CODE>        → { subAdminId, subAdminEmail, subAdminName, usageCount, createdAt }
//   admin:invite:by-admin:<adminId> → <CODE>  (one code per sub-admin)

// GET /admin/invitation-codes  – super-admin only
// Returns all sub-admins paired with their invitation codes.
app.get('/make-server-a1c55d7e/admin/invitation-codes', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    if (!isSuperAdmin(c.get('adminUser'))) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const limited = enforceAdminRateLimit(c, 'admin-invitation-codes:list');
    if (limited) return limited;

    if (!authClient) return c.json({ error: 'Server auth configuration missing' }, 500);

    // Fetch all admin users from Supabase Auth
    const allUsers: any[] = [];
    let page = 1;
    while (page <= 5) {
      const { data, error } = await authClient.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const batch = Array.isArray(data?.users) ? data.users : [];
      allUsers.push(...batch);
      if (batch.length < 200) break;
      page += 1;
    }

    const subAdmins = allUsers.filter((u) => hasAdminRole(u));

    // Load existing codes from KV
    const codeRecords = await kv.getByPrefix('admin:invite:code:');
    const codeByAdminId = new Map<string, { code: string; usageCount: number; createdAt: string }>();
    for (const rec of codeRecords) {
      if (rec && typeof rec.subAdminId === 'string' && typeof rec.code === 'string') {
        codeByAdminId.set(rec.subAdminId, {
          code: rec.code,
          usageCount: typeof rec.usageCount === 'number' ? rec.usageCount : 0,
          createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : '',
        });
      }
    }

    const codes = subAdmins.map((u) => {
      const info = codeByAdminId.get(u.id);
      return {
        subAdminId: u.id,
        subAdminEmail: u.email ?? '',
        subAdminName: getAdminRoleName(u),
        roleName: getAdminRoleName(u),
        isSuperAdmin: isSuperAdmin(u),
        code: info?.code ?? null,
        usageCount: info?.usageCount ?? 0,
        createdAt: info?.createdAt ?? null,
      };
    });

    return c.json({ codes });
  } catch (err) {
    console.error('invitation-codes list error:', err);
    return c.json({ error: 'Failed to fetch invitation codes' }, 500);
  }
});

// POST /admin/invitation-codes/generate  – super-admin only
// Body: { subAdminId: string }  Generates or regenerates a code for one sub-admin.
app.post('/make-server-a1c55d7e/admin/invitation-codes/generate', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    if (!isSuperAdmin(c.get('adminUser'))) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const limited = enforceAdminRateLimit(c, 'admin-invitation-codes:generate');
    if (limited) return limited;

    if (!authClient) return c.json({ error: 'Server auth configuration missing' }, 500);

    const body = await c.req.json();
    const subAdminId = typeof body?.subAdminId === 'string' ? body.subAdminId.trim() : '';
    if (!subAdminId) return c.json({ error: 'subAdminId is required' }, 400);

    // Verify the target user exists and has an admin role
    const { data: targetData, error: targetError } = await authClient.auth.admin.getUserById(subAdminId);
    if (targetError || !targetData?.user) return c.json({ error: 'Sub-admin user not found' }, 404);
    if (!hasAdminRole(targetData.user)) return c.json({ error: 'Target user does not have an admin role' }, 400);

    // Supersede old code if any — we keep the KV record so that users who signed up with
    // the old code remain traceable during sub-admin scope filtering, but mark it so new
    // signups are rejected.
    const oldCodeKey = `admin:invite:by-admin:${subAdminId}`;
    const oldCode = await kv.get(oldCodeKey);
    if (typeof oldCode === 'string' && oldCode) {
      const oldRecord = await kv.get(`admin:invite:code:${oldCode}`);
      if (oldRecord && typeof oldRecord === 'object') {
        await kv.set(`admin:invite:code:${oldCode}`, {
          ...oldRecord,
          superseded: true,
          supersededAt: new Date().toISOString(),
        });
      }
    }

    // Generate a unique code (collision-safe)
    let code: string;
    let attempts = 0;
    do {
      code = generateAdminInviteCode();
      const existing = await kv.get(`admin:invite:code:${code}`);
      if (!existing) break;
      attempts += 1;
    } while (attempts < 20);

    const record = {
      code,
      subAdminId,
      subAdminEmail: targetData.user.email ?? '',
      subAdminName: getAdminRoleName(targetData.user),
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`admin:invite:code:${code}`, record);
    await kv.set(oldCodeKey, code);

    const inviteGenActorEmail = typeof c.get('adminUser')?.email === 'string' && c.get('adminUser')?.email
      ? c.get('adminUser')?.email
      : String(c.get('adminUser')?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-invitation-code-generate',
      inviteGenActorEmail,
      `Generated invitation code for admin '${targetData.user.email ?? subAdminId}'`,
    ).catch((e) => console.error('Failed to record admin-invitation-code-generate audit event:', e));

    return c.json({ subAdminId, code, createdAt: record.createdAt });
  } catch (err) {
    console.error('invitation-code generate error:', err);
    return c.json({ error: 'Failed to generate invitation code' }, 500);
  }
});

// POST /admin/invitation-codes/assign-missing  – super-admin only
// Generates invitation codes for all admins that don't have one yet (legacy admins)
app.post('/make-server-a1c55d7e/admin/invitation-codes/assign-missing', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    if (!isSuperAdmin(c.get('adminUser'))) {
      return c.json({ error: 'Forbidden: super-admin access required' }, 403);
    }

    const limited = enforceAdminRateLimit(c, 'admin-invitation-codes:assign-missing');
    if (limited) return limited;

    if (!authClient) return c.json({ error: 'Server auth configuration missing' }, 500);

    // Fetch all admin users from Supabase Auth
    const allUsers: any[] = [];
    let page = 1;
    while (page <= 5) {
      const { data, error } = await authClient.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const batch = Array.isArray(data?.users) ? data.users : [];
      allUsers.push(...batch);
      if (batch.length < 200) break;
      page += 1;
    }

    const admins = allUsers.filter((u) => hasAdminRole(u));
    const results: any[] = [];

    for (const admin of admins) {
      // Check if this admin already has a code
      const existingCodeKey = `admin:invite:by-admin:${admin.id}`;
      const existingCode = await kv.get(existingCodeKey);

      if (existingCode && typeof existingCode === 'string' && sanitizeAdminInviteCode(existingCode)) {
        results.push({
          id: admin.id,
          email: admin.email ?? '',
          name: getAdminRoleName(admin),
          status: 'already_has_code',
          code: existingCode,
        });
        continue;
      }

      // Generate a new code for this admin
      let code: string;
      let attempts = 0;
      do {
        code = generateAdminShortCode();
        const existing = await kv.get(`admin:invite:code:${code}`);
        if (!existing) break;
        attempts += 1;
      } while (attempts < 20);

      const record = {
        code,
        subAdminId: admin.id,
        subAdminEmail: admin.email ?? '',
        subAdminName: getAdminRoleName(admin),
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };

      await kv.set(`admin:invite:code:${code}`, record);
      await kv.set(existingCodeKey, code);

      results.push({
        id: admin.id,
        email: admin.email ?? '',
        name: getAdminRoleName(admin),
        status: 'newly_assigned',
        code,
      });
    }

    const inviteBulkActorEmail = typeof c.get('adminUser')?.email === 'string' && c.get('adminUser')?.email
      ? c.get('adminUser')?.email
      : String(c.get('adminUser')?.id ?? 'unknown');
    const newlyAssigned = results.filter((r) => r.status === 'newly_assigned').length;
    await recordObservabilityAuditEvent(
      'admin-invitation-codes-bulk-assign',
      inviteBulkActorEmail,
      `Assigned ${newlyAssigned} invitation codes to admins without codes (${admins.length} admins total)`,
    ).catch((e) => console.error('Failed to record admin-invitation-codes-bulk-assign audit event:', e));

    return c.json({
      message: 'Invitation codes assigned to admins without codes',
      assigned: newlyAssigned,
      already_had: results.filter((r) => r.status === 'already_has_code').length,
      results,
    });
  } catch (err) {
    console.error('assign-missing-codes error:', err);
    return c.json({ error: 'Failed to assign invitation codes' }, 500);
  }
});

// POST /validate-admin-invite-code  – public (no auth required)
// Body: { code: string }
// Returns { valid: true, subAdminId, subAdminName } or 404 if invalid.
app.post('/make-server-a1c55d7e/validate-admin-invite-code', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'public:validate-admin-code', 20);
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const code = sanitizeAdminInviteCode(body?.code);
    if (!code) return c.json({ valid: false, error: 'Invalid code format' }, 400);

    const record = await kv.get(`admin:invite:code:${code}`);
    if (!record || typeof record.subAdminId !== 'string') {
      return c.json({ valid: false, error: 'Invitation code not found' }, 404);
    }

    return c.json({ valid: true, subAdminId: record.subAdminId, subAdminName: record.subAdminName ?? '' });
  } catch (err) {
    console.error('validate-admin-invite-code error:', err);
    return c.json({ valid: false, error: 'Validation failed' }, 500);
  }
});

// GET /admin/invitation-codes/mine  – any admin
// Returns the current admin's own invitation code
app.get('/make-server-a1c55d7e/admin/invitation-codes/mine', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-invitation-codes:mine');
    if (limited) return limited;

    const adminUser = c.get('adminUser');
    if (!adminUser || !adminUser.id) {
      return c.json({ error: 'Admin user not found' }, 401);
    }

    // Get this admin's code from KV
    const codeKey = `admin:invite:by-admin:${adminUser.id}`;
    let code = await kv.get(codeKey);

    // Auto-create/repair a 5-char code for legacy admins created before this feature.
    if (!code || typeof code !== 'string' || !sanitizeAdminInviteCode(code)) {
      const legacyCode = typeof code === 'string' ? code : null;
      let generatedCode: string;
      let attempts = 0;
      do {
        generatedCode = generateAdminShortCode();
        const existing = await kv.get(`admin:invite:code:${generatedCode}`);
        if (!existing) break;
        attempts += 1;
      } while (attempts < 20);

      const generatedRecord = {
        code: generatedCode,
        subAdminId: adminUser.id,
        subAdminEmail: adminUser.email ?? '',
        subAdminName: getAdminRoleName(adminUser),
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };

      await kv.set(`admin:invite:code:${generatedCode}`, generatedRecord);
      await kv.set(codeKey, generatedCode);
      if (legacyCode) {
        await kv.del(`admin:invite:code:${legacyCode}`);
      }
      code = generatedCode;
    }

    const codeRecord = await kv.get(`admin:invite:code:${code}`);
    if (!codeRecord) {
      const repairedRecord = {
        code,
        subAdminId: adminUser.id,
        subAdminEmail: adminUser.email ?? '',
        subAdminName: getAdminRoleName(adminUser),
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };
      await kv.set(`admin:invite:code:${code}`, repairedRecord);
      return c.json(repairedRecord);
    }

    return c.json({
      code,
      subAdminId: adminUser.id,
      subAdminEmail: adminUser.email ?? '',
      subAdminName: getAdminRoleName(adminUser),
      usageCount: typeof codeRecord.usageCount === 'number' ? codeRecord.usageCount : 0,
      createdAt: typeof codeRecord.createdAt === 'string' ? codeRecord.createdAt : '',
    });
  } catch (err) {
    console.error('admin-invitation-codes:mine error:', err);
    return c.json({ code: null, error: 'Failed to fetch your invitation code' }, 500);
  }
});

// POST /referral/link-admin-invite
// Called at signup to attach referredByAdminId to the new user's record.
// Body: { username, adminInviteCode }
app.post('/make-server-a1c55d7e/referral/link-admin-invite', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:link-admin-invite');
    if (rateLimited) return rateLimited;

    const body = await c.req.json();
    const code = sanitizeAdminInviteCode(body?.adminInviteCode);

    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }
    const username = sessionResult.session.username;

    if (!code) return c.json({ error: 'adminInviteCode is required' }, 400);

    const record = await kv.get(`admin:invite:code:${code}`);
    if (!record || typeof record.subAdminId !== 'string') {
      return c.json({ error: 'Admin invitation code not found' }, 404);
    }

    const userData = await getOrCreateUserRecord(username);
    userData.referredByAdminId = record.subAdminId;
    await kv.set(`user:${username}`, userData);

    // Increment usage count on the code record
    record.usageCount = (typeof record.usageCount === 'number' ? record.usageCount : 0) + 1;
    await kv.set(`admin:invite:code:${code}`, record);

    return c.json({ success: true, username, referredByAdminId: record.subAdminId });
  } catch (err) {
    console.error('link-admin-invite error:', err);
    return c.json({ error: 'Failed to link admin invite' }, 500);
  }
});

// GET /admin/platform-users  – admin-gated, scoped by role
// Super-admin: returns all platform users (KV) with referredByAdminId.
// Sub-admin: returns only users where referredByAdminId = caller's user ID.
app.get('/make-server-a1c55d7e/admin/platform-users', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:list');
    if (limited) return limited;

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const callingAdminEmail = typeof callingAdmin?.email === 'string'
      ? callingAdmin.email.trim().toLowerCase()
      : '';
    const userMap = new Map<string, ReturnType<typeof normalizeUserRecord>>();
    const mergeUserEntries = async (
      entries: Array<{ key: string; value: any }>,
      options: {
        resolveCanonical?: boolean;
        syncWithVip?: boolean;
        persistSyncedUser?: boolean;
      } = {},
    ) => {
      const {
        resolveCanonical = true,
        syncWithVip = true,
        persistSyncedUser = true,
      } = options;
      for (const entry of entries) {
        const rawUsername = getUsernameFromUserKvEntry(entry);
        if (!rawUsername || rawUsername === 'steadfast_root') {
          continue;
        }

        try {
          const canonicalUsername = resolveCanonical
            ? ((await resolveCanonicalUsername(rawUsername)) ?? rawUsername)
            : rawUsername;
          if (userMap.has(canonicalUsername.toLowerCase())) {
            continue;
          }

          const normalizedUser = syncWithVip
            ? await syncUserWithVipConfig(entry.value, canonicalUsername)
            : normalizeUserRecord(entry.value, canonicalUsername);
          if (syncWithVip && persistSyncedUser) {
            await kv.set(`user:${canonicalUsername}`, normalizedUser);
          }
          userMap.set(canonicalUsername.toLowerCase(), normalizedUser);
        } catch (entryError) {
          console.error('admin/platform-users merge entry failed:', rawUsername, entryError);
        }
      }
    };

    let currentAdminInviteCode: string | null = null;
    const adminOwnedCodes = new Set<string>();
    let scopeFallbackApplied = false;
    let scopedUsers: ReturnType<typeof normalizeUserRecord>[] = [];

    if (callerIsSuperAdmin) {
      try {
        await mergeUserEntries(await kv.getEntriesByPrefix('user:'), {
          resolveCanonical: false,
          syncWithVip: false,
          persistSyncedUser: false,
        });
      } catch (scanError) {
        console.error('admin/platform-users super-admin kv scan failed:', scanError);
      }

      if (authClient) {
        let page = 1;
        const perPage = 200;
        const maxPages = 10;

        while (page <= maxPages) {
          const { data, error } = await authClient.auth.admin.listUsers({ page, perPage });
          if (error) {
            console.error('admin/platform-users auth scan error:', error.message);
            break;
          }

          const batch = Array.isArray(data?.users) ? data.users : [];
          for (const authUser of batch) {
            if (hasAdminRole(authUser)) {
              continue;
            }

            const metadataUsername = sanitizeUsername(
              typeof authUser?.user_metadata?.username === 'string' ? authUser.user_metadata.username : '',
            );
            const emailLocal = sanitizeUsername(
              typeof authUser?.email === 'string' ? (authUser.email.split('@')[0] ?? '') : '',
            );
            const candidateUsername = metadataUsername || emailLocal;
            if (!candidateUsername || userMap.has(candidateUsername.toLowerCase())) {
              continue;
            }

            try {
              const recoveredUser = await bootstrapMissingPlatformUserRecord(candidateUsername, { referredByAdminId: null });
              const normalizedRecovered = await syncUserWithVipConfig(recoveredUser, candidateUsername);
              await kv.set(`user:${candidateUsername}`, normalizedRecovered);
              userMap.set(candidateUsername.toLowerCase(), normalizedRecovered);
            } catch (recoveryError) {
              console.error('admin/platform-users auto-recovery failed:', candidateUsername, recoveryError);
            }
          }

          if (batch.length < perPage) {
            break;
          }
          page += 1;
        }
      }

      scopedUsers = Array.from(userMap.values());
    } else {
      const relatedAdminIds = new Set<string>();
      if (typeof callingAdmin?.id === 'string' && callingAdmin.id) {
        relatedAdminIds.add(callingAdmin.id);
        const inviteCodeRecord = await kv.get(`admin:invite:by-admin:${callingAdmin.id}`);
        currentAdminInviteCode = sanitizeAdminInviteCode(inviteCodeRecord);
        if (currentAdminInviteCode) {
          adminOwnedCodes.add(currentAdminInviteCode);
        }
      }

      const allAdminCodeRecords = await kv.getByPrefix('admin:invite:code:');
      for (const codeRecord of allAdminCodeRecords) {
        const codeOwnerId = String(codeRecord?.subAdminId ?? '');
        const codeOwnerEmail = typeof codeRecord?.subAdminEmail === 'string'
          ? codeRecord.subAdminEmail.trim().toLowerCase()
          : '';
        const matchesCurrentAdmin = codeOwnerId === callingAdmin?.id;
        const matchesAdminEmail = Boolean(callingAdminEmail) && codeOwnerEmail === callingAdminEmail;

        if (!matchesCurrentAdmin && !matchesAdminEmail) {
          continue;
        }

        const code = sanitizeAdminInviteCode(codeRecord?.code);
        if (code) {
          adminOwnedCodes.add(code);
        }
        if (codeOwnerId) {
          relatedAdminIds.add(codeOwnerId);
        }
      }

      const executedQueries = new Set<string>();
      const loadUsersByField = async (field: 'referredByAdminId' | 'invitedByCode', rawValue: string | null) => {
        if (!rawValue) {
          return;
        }

        const value = field === 'invitedByCode' ? rawValue.trim().toUpperCase() : rawValue;
        if (!value) {
          return;
        }

        const queryKey = `${field}:${value}`;
        if (executedQueries.has(queryKey)) {
          return;
        }
        executedQueries.add(queryKey);

        const entries = await kv.getEntriesByPrefixAndJsonFieldEquals('user:', field, value);
        await mergeUserEntries(entries);
      };

      for (const adminId of relatedAdminIds) {
        await loadUsersByField('referredByAdminId', adminId);
      }

      const directOwnedCount = userMap.size;
      for (const code of adminOwnedCodes) {
        await loadUsersByField('invitedByCode', code);
      }
      if (userMap.size > directOwnedCount) {
        scopeFallbackApplied = true;
      }

      const processedInviteCodes = new Set<string>();
      const pendingInviteCodes = Array.from(
        new Set(
          Array.from(userMap.values())
            .map((user) => sanitizeInviteCode(user.invitationCode))
            .filter((code): code is string => Boolean(code)),
        ),
      );

      while (pendingInviteCodes.length > 0) {
        const invitationCode = pendingInviteCodes.shift() ?? null;
        if (!invitationCode || processedInviteCodes.has(invitationCode)) {
          continue;
        }

        processedInviteCodes.add(invitationCode);
        const beforeCount = userMap.size;
        await loadUsersByField('invitedByCode', invitationCode);
        if (userMap.size > beforeCount) {
          scopeFallbackApplied = true;
        }

        for (const user of userMap.values()) {
          const nestedInvitationCode = sanitizeInviteCode(user.invitationCode);
          if (nestedInvitationCode && !processedInviteCodes.has(nestedInvitationCode)) {
            pendingInviteCodes.push(nestedInvitationCode);
          }
        }
      }

      scopedUsers = Array.from(userMap.values());
    }

    // For super-admin, try to resolve sub-admin names from Auth users
    let adminNameMap: Map<string, string> = new Map();
    if (callerIsSuperAdmin && authClient) {
      try {
        const authPage: any[] = [];
        let p = 1;
        while (p <= 5) {
          const { data } = await authClient.auth.admin.listUsers({ page: p, perPage: 200 });
          const batch = Array.isArray(data?.users) ? data.users : [];
          authPage.push(...batch);
          if (batch.length < 200) break;
          p += 1;
        }
        for (const au of authPage) {
          if (au?.id) {
            adminNameMap.set(au.id, getAdminRoleName(au));
          }
        }
      } catch (_e) { /* non-critical */ }
    }

    const users = scopedUsers.map((u) => ({
      username: u.username,
      vipLevel: u.vipLevel,
      balance: u.balance,
      phone: typeof u.phone === 'string' && u.phone ? u.phone : '-',
      tasksCompleted: u.tasksCompleted,
      tasksLimit: u.tasksLimit,
      taskSetCount: u.taskSetCount,
      tasksPerSet: u.tasksPerSet,
      tasksCompletedInSet: u.tasksCompletedInSet,
      completedTaskSets: u.completedTaskSets,
      pendingTaskReset: u.pendingTaskReset,
      holdAmount: u.holdAmount,
      availableAmount: roundMoney(Number(u.balance ?? 0) - Number(u.holdAmount ?? 0)),
      isFrozen: u.isFrozen,
      isSuspended: Boolean(u.isSuspended),
      walletProfile: normalizeStoredWalletProfile(u.walletProfile),
      invitationCode: typeof u.invitationCode === 'string' && u.invitationCode ? u.invitationCode : null,
      lastLoginAt: typeof u.lastLoginAt === 'string' && u.lastLoginAt ? u.lastLoginAt : null,
      lastLoginIp: typeof u.lastLoginIp === 'string' && u.lastLoginIp ? u.lastLoginIp : null,
      lastLoginLocation: typeof u.lastLoginLocation === 'string' && u.lastLoginLocation ? u.lastLoginLocation : null,
      lastActivityAt: typeof u.lastActivityAt === 'string' && u.lastActivityAt ? u.lastActivityAt : null,
      lastActivityIp: typeof u.lastActivityIp === 'string' && u.lastActivityIp ? u.lastActivityIp : null,
      lastActivityLocation: typeof u.lastActivityLocation === 'string' && u.lastActivityLocation ? u.lastActivityLocation : null,
      referredByAdminId: u.referredByAdminId ?? null,
      referredByAdminName: u.referredByAdminId
        ? (adminNameMap.get(u.referredByAdminId) ?? u.referredByAdminId)
        : 'Direct',
      createdAt: typeof (u as any).createdAt === 'string' ? (u as any).createdAt : null,
      creditScore: typeof u.creditScore === 'number' ? u.creditScore : 100,
    }));

    return c.json({
      users,
      total: users.length,
      scoped: !callerIsSuperAdmin,
      scopeFallbackApplied,
    });
  } catch (err) {
    console.error('admin/platform-users error:', err);
    return c.json({ error: 'Failed to fetch platform users' }, 500);
  }
});

app.get('/make-server-a1c55d7e/admin/platform-users/:username/audit', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:audit');
    if (limited) return limited;

    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const canonicalUsername = await resolveCanonicalUsername(requestedUsername);
    if (!canonicalUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userData = await getOrCreateUserRecord(canonicalUsername);
    const normalizedUser = normalizeUserRecord(userData, canonicalUsername);
    if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    return c.json(await buildAdminPlatformUserAudit(canonicalUsername));
  } catch (err) {
    console.error('admin/platform-users/audit error:', err);
    return c.json({ error: 'Failed to fetch user audit details' }, 500);
  }
});

app.post('/make-server-a1c55d7e/admin/platform-users/:username/task-controls', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:task-controls');
    if (limited) return limited;

    const username = sanitizeUsername(c.req.param('username'));
    if (!username) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const body = await c.req.json();
    const shouldResetCurrentSet = body?.resetCurrentSet === true;
    const shouldUnfreezeAccount = body?.restoreNaturalState === true || body?.unfreezeAccount === true;
    const shouldSuspendAccount = body?.suspendAccount === true;
    const shouldUnsuspendAccount = body?.unsuspendAccount === true;

    const controlResult = await withUserFinancialLock(username, async () => {
      const userKey = `user:${username}`;
      const existingUser = await kv.get(userKey);
      if (!existingUser) {
        return { response: c.json({ error: 'User not found' }, 404) };
      }

      const normalizedUser = await syncUserWithVipConfig(existingUser, username);
      if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
        return { response: c.json({ error: 'Forbidden' }, 403) };
      }

      const before = snapshotFinancialState(normalizedUser);
      const nextTaskSetCount = Number.isFinite(Number(body?.taskSetCount))
        ? Math.max(1, Math.round(Number(body.taskSetCount)))
        : normalizedUser.taskSetCount;
      const vipConfig = await getVipConfigForLevel(Number(normalizedUser.vipLevel ?? 1));
      const nextTasksPerSet = Math.max(1, Math.round(Number(vipConfig.dailyTasks ?? normalizedUser.tasksPerSet ?? 1)));

      normalizedUser.taskSetCountOverride = nextTaskSetCount;
      normalizedUser.tasksPerSetOverride = null;
      normalizedUser.taskSetCount = nextTaskSetCount;
      normalizedUser.tasksPerSet = nextTasksPerSet;
      normalizedUser.tasksLimit = nextTaskSetCount * nextTasksPerSet;
      normalizedUser.tasksCompleted = Math.min(normalizedUser.tasksCompleted, normalizedUser.tasksLimit);

      if (shouldResetCurrentSet) {
        if (!normalizedUser.pendingTaskReset && normalizedUser.tasksCompletedInSet < normalizedUser.tasksPerSet) {
          return { response: c.json({ error: 'Current task set is not yet complete.' }, 400) };
        }
        // Do NOT increment completedTaskSets here — the task-submission handler
        // already incremented it when the set was completed. Admin reset only
        // unlocks the next set by zeroing the in-set counter.
        normalizedUser.tasksCompletedInSet = 0;
        normalizedUser.pendingTaskReset = false;
      }

      if (shouldSuspendAccount) {
        normalizedUser.isSuspended = true;
      }

      if (shouldUnsuspendAccount) {
        normalizedUser.isSuspended = false;
      }

      if (shouldUnfreezeAccount) {
        const restored = restoreUserToNaturalState(normalizedUser);
        Object.assign(normalizedUser, restored);
        normalizedUser.pendingTaskReset = false;
      }

      const persisted = await persistFinancialState({
        username,
        user: normalizedUser,
        operation: 'admin_user_task_controls_update',
        before,
        ledgerMetadata: {
          resetCurrentSet: shouldResetCurrentSet,
          restoreNaturalState: shouldUnfreezeAccount,
          suspendAccount: shouldSuspendAccount,
          unsuspendAccount: shouldUnsuspendAccount,
        },
      });

      return {
        user: persisted.user,
      };
    });

    if ('response' in controlResult) {
      return controlResult.response;
    }

    const appliedTaskSetCount = Number.isFinite(Number(controlResult.user?.taskSetCount))
      ? Number(controlResult.user.taskSetCount)
      : null;
    const appliedTasksPerSet = Number.isFinite(Number(controlResult.user?.tasksPerSet))
      ? Number(controlResult.user.tasksPerSet)
      : null;

    const taskCtrlActorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    const ctrlAction = (() => {
      const flags = [
        shouldResetCurrentSet ? 'reset-set' : '',
        shouldSuspendAccount ? 'suspend' : '',
        shouldUnsuspendAccount ? 'unsuspend' : '',
        shouldUnfreezeAccount ? 'unfreeze' : '',
      ].filter(Boolean);
      return flags.length > 0 ? flags.join('+') : 'update';
    })();
    await recordObservabilityAuditEvent(
      'admin-user-task-controls-update',
      taskCtrlActorEmail,
      `Modified task controls for user '${username}' (taskSetCount: ${appliedTaskSetCount ?? 'n/a'}, vipTasksPerSet: ${appliedTasksPerSet ?? 'n/a'}, action: ${ctrlAction})`,
    ).catch((e) => console.error('Failed to record admin-user-task-controls-update audit event:', e));

    return c.json({
      success: true,
      user: controlResult.user,
      taskProgress: buildUserTaskProgress(controlResult.user),
    });
  } catch (err) {
    console.error('admin/platform-users/task-controls error:', err);
    return c.json({ error: 'Failed to update user task controls' }, 500);
  }
});

app.post('/make-server-a1c55d7e/admin/platform-users/:username/recalculate-financial-state', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = await enforceCriticalAdminRateLimit(c, 'admin-platform-users:recalculate-financial-state');
    if (limited) return limited;

    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const canonicalUsername = await resolveCanonicalUsername(requestedUsername);
    if (!canonicalUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    const recalculationResult = await withUserFinancialLock(canonicalUsername, async () => {
      const userKey = `user:${canonicalUsername}`;
      const existingUser = await kv.get(userKey);
      if (!existingUser) {
        return { response: c.json({ error: 'User not found' }, 404) };
      }

      const normalizedUser = await syncUserWithVipConfig(existingUser, canonicalUsername);
      if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
        return { response: c.json({ error: 'Forbidden' }, 403) };
      }

      const beforeState = snapshotFinancialState(normalizedUser);
      const before = {
        balance: roundMoney(Number(normalizedUser.balance ?? 0)),
        holdAmount: roundMoney(Number(normalizedUser.holdAmount ?? 0)),
        isFrozen: Boolean(normalizedUser.isFrozen),
        isSuspended: Boolean(normalizedUser.isSuspended),
        activePremiumStatus: typeof normalizedUser.activePremium?.status === 'string' ? normalizedUser.activePremium.status : null,
        topUpRequired: roundMoney(Number(normalizedUser?.activePremium?.topUpRequired ?? normalizedUser?.activePremium?.negativeAmount ?? 0)),
      };

      const outstandingTopUp = Number(normalizedUser?.activePremium?.topUpRequired ?? normalizedUser?.activePremium?.negativeAmount ?? 0);
      const shouldAutoUnfreeze = Boolean(normalizedUser.isFrozen)
        && Boolean(normalizedUser.activePremium)
        && Number.isFinite(outstandingTopUp)
        && outstandingTopUp <= 0;

      let recalculatedUser = { ...normalizedUser };
      if (shouldAutoUnfreeze) {
        recalculatedUser = restoreUserToNaturalState(recalculatedUser);
        recalculatedUser.pendingTaskReset = false;
      }

      recalculatedUser.balance = roundMoney(Number(recalculatedUser.balance ?? 0));
      recalculatedUser.holdAmount = roundMoney(Math.max(0, Number(recalculatedUser.holdAmount ?? 0)));
      recalculatedUser.tasksCompleted = Math.min(
        Math.max(0, (Number(recalculatedUser.completedTaskSets ?? 0) * Number(recalculatedUser.tasksPerSet ?? 1)) + Number(recalculatedUser.tasksCompletedInSet ?? 0)),
        Number(recalculatedUser.tasksLimit ?? 0),
      );

      const persisted = await persistFinancialState({
        username: canonicalUsername,
        user: recalculatedUser,
        operation: shouldAutoUnfreeze ? 'admin_financial_state_recalculated_and_unfrozen' : 'admin_financial_state_recalculated',
        before: beforeState,
        ledgerMetadata: {
          autoUnfreezeApplied: shouldAutoUnfreeze,
        },
      });

      return {
        before,
        recalculatedUser: persisted.user,
        shouldAutoUnfreeze,
      };
    });

    if ('response' in recalculationResult) {
      return recalculationResult.response;
    }

    const after = {
      balance: roundMoney(Number(recalculationResult.recalculatedUser.balance ?? 0)),
      holdAmount: roundMoney(Number(recalculationResult.recalculatedUser.holdAmount ?? 0)),
      isFrozen: Boolean(recalculationResult.recalculatedUser.isFrozen),
      isSuspended: Boolean(recalculationResult.recalculatedUser.isSuspended),
      activePremiumStatus: typeof recalculationResult.recalculatedUser.activePremium?.status === 'string' ? recalculationResult.recalculatedUser.activePremium.status : null,
      topUpRequired: roundMoney(Number(recalculationResult.recalculatedUser?.activePremium?.topUpRequired ?? recalculationResult.recalculatedUser?.activePremium?.negativeAmount ?? 0)),
    };

    const actorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-user-financial-recalculate',
      actorEmail,
      `Recalculated financial state for user '${canonicalUsername}' (autoUnfreeze: ${shouldAutoUnfreeze ? 'yes' : 'no'})`,
    ).catch((e) => console.error('Failed to record admin-user-financial-recalculate audit event:', e));

    return c.json({
      success: true,
      autoUnfreezeApplied: recalculationResult.shouldAutoUnfreeze,
      before: recalculationResult.before,
      after,
      user: recalculationResult.recalculatedUser,
      taskProgress: buildUserTaskProgress(recalculationResult.recalculatedUser),
    });
  } catch (err) {
    console.error('admin/platform-users/recalculate-financial-state error:', err);
    return c.json({ error: 'Failed to recalculate financial state' }, 500);
  }
});

app.post('/make-server-a1c55d7e/admin/platform-users/reconcile-premium-settlements', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = await enforceCriticalAdminRateLimit(c, 'admin-platform-users:reconcile-premium-settlements');
    if (limited) return limited;

    const body = await c.req.json().catch(() => ({} as any));
    const requestedUsername = sanitizeUsername(body?.username);
    const dryRun = body?.dryRun !== false;
    const reconcileTodayCommission = body?.reconcileTodayCommission === true;
    const maxUsers = Number.isFinite(Number(body?.maxUsers))
      ? Math.max(1, Math.min(500, Math.round(Number(body.maxUsers))))
      : 200;

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);

    let candidateUsers: string[] = [];
    if (requestedUsername) {
      const canonical = await resolveCanonicalUsername(requestedUsername);
      if (!canonical) {
        return c.json({ error: 'User not found' }, 404);
      }
      candidateUsers = [canonical];
    } else {
      const allUsers = await kv.getEntriesByPrefix('user:');
      candidateUsers = allUsers
        .map((entry) => getUsernameFromUserKvEntry(entry))
        .filter((entry): entry is string => Boolean(entry))
        .slice(0, maxUsers);
    }

    const report: Array<any> = [];
    let processed = 0;
    let skippedUnauthorized = 0;
    let usersChanged = 0;
    let usersAutoUnfrozen = 0;
    let commissionReconciliations = 0;
    let settlementBackfills = 0;
    let settlementBackfillAmount = 0;

    for (const username of candidateUsers) {
      const reconciliation = await withUserFinancialLock(username, async () => {
        const userKey = `user:${username}`;
        const existingUser = await kv.get(userKey);
        if (!existingUser) {
          return { skipped: true as const };
        }

        let normalizedUser = await syncUserWithVipConfig(existingUser, username);
        if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
          return { unauthorized: true as const };
        }

        const beforeState = snapshotFinancialState(normalizedUser);
        const before = {
          balance: roundMoney(Number(normalizedUser.balance ?? 0)),
          todayCommission: roundMoney(Number(normalizedUser.todayCommission ?? 0)),
          holdAmount: roundMoney(Number(normalizedUser.holdAmount ?? 0)),
          isFrozen: Boolean(normalizedUser.isFrozen),
        };

        let changed = false;
        let userCommissionReconciliations = 0;
        let userAutoUnfrozen = false;
        let userSettlementBackfills = 0;
        let userSettlementBackfillAmount = 0;
        const transactions = await listTransactionRecords(username);
        const writes: Array<{ key: string; value: unknown }> = [];

        if (reconcileTodayCommission) {
          const commissionResetDate = getCommissionDateKey();
          const commissionTotal = sumCompletedCommissionTransactions(transactions, commissionResetDate);
          if (Math.abs(commissionTotal - Number(normalizedUser.todayCommission ?? 0)) > RECONCILIATION_EPSILON) {
            userCommissionReconciliations += 1;
            changed = true;
            normalizedUser.todayCommission = commissionTotal;
            normalizedUser.lastCommissionResetDate = commissionResetDate;
          }
        }

        const outstandingTopUp = Number(normalizedUser?.activePremium?.topUpRequired ?? normalizedUser?.activePremium?.negativeAmount ?? 0);
        const shouldAutoUnfreeze = Boolean(normalizedUser.isFrozen)
          && Boolean(normalizedUser.activePremium)
          && Number.isFinite(outstandingTopUp)
          && outstandingTopUp <= 0;

        if (shouldAutoUnfreeze) {
          userAutoUnfrozen = true;
          changed = true;
          normalizedUser = restoreUserToNaturalState(normalizedUser);
          normalizedUser.pendingTaskReset = false;
        }

        const premiumPrefix = `premium:${username}:`;
        const premiumRecords = (await kv.getByPrefix(premiumPrefix))
          .filter((premium) => typeof premium?.id === 'string')
          .sort((left, right) => {
            const leftMs = parseIsoDateMs(left?.completedAt) ?? 0;
            const rightMs = parseIsoDateMs(right?.completedAt) ?? 0;
            return leftMs - rightMs;
          });

        for (const premium of premiumRecords) {
          if (String(premium?.status ?? '').toLowerCase() !== 'completed') {
            continue;
          }

          const premiumId = String(premium.id);
          const completionMs = parseIsoDateMs(premium?.completedAt);
          const holdReleaseAmount = roundMoney(Math.max(
            0,
            Number(premium?.topUpRequired ?? premium?.negativeAmount ?? premium?.configuredUpholdAmount ?? 0),
          ));
          if (holdReleaseAmount <= 0) {
            continue;
          }

          if (typeof premium?.settlementReleaseAppliedAt === 'string' && premium.settlementReleaseAppliedAt) {
            continue;
          }

          if (completionMs !== null && completionMs >= PREMIUM_SETTLEMENT_FIX_DEPLOYED_AT_MS) {
            continue;
          }

          const hasSettlementReleaseTx = transactions.some((tx) =>
            tx?.referenceId === premiumId
            && String(tx?.source ?? '').toLowerCase() === 'premium_settlement_release'
            && String(tx?.status ?? 'Completed').toLowerCase() === 'completed',
          );
          if (hasSettlementReleaseTx) {
            continue;
          }

          const hasPostCompletionNonPremiumActivity = completionMs !== null
            ? transactions.some((tx) => {
                const txMs = parseIsoDateMs(tx?.date ?? tx?.createdAt);
                const txSource = String(tx?.source ?? '').toLowerCase();
                if (txMs === null || txMs <= completionMs) {
                  return false;
                }
                return txSource !== 'premium_task' && txSource !== 'premium_settlement_release';
              })
            : true;

          if (hasPostCompletionNonPremiumActivity) {
            continue;
          }

          userSettlementBackfills += 1;
          userSettlementBackfillAmount = roundMoney(userSettlementBackfillAmount + holdReleaseAmount);
          changed = true;

          if (!dryRun) {
            normalizedUser.balance = roundMoney(Number(normalizedUser.balance ?? 0) + holdReleaseAmount);
            const settlementTx = buildTransactionRecord({
              username,
              type: 'Deposit',
              amount: holdReleaseAmount,
              method: 'Premium Settlement Release',
              source: 'premium_settlement_release',
              description: 'Backfilled premium hold release after settlement-rule upgrade',
              referenceId: premiumId,
            });
            transactions.unshift(settlementTx);
            writes.push({ key: `${TRANSACTION_KEY_PREFIX}${settlementTx.id}`, value: settlementTx });

            const premiumKey = `${premiumPrefix}${premiumId}`;
            writes.push({
              key: premiumKey,
              value: {
                ...premium,
                settlementReleaseAppliedAt: new Date().toISOString(),
                settlementReleaseAmount: holdReleaseAmount,
                settlementReleaseSource: 'reconcile-premium-settlements',
              },
            });
          }
        }

        normalizedUser.balance = roundMoney(Number(normalizedUser.balance ?? 0));
        normalizedUser.todayCommission = roundMoney(Number(normalizedUser.todayCommission ?? 0));
        normalizedUser.holdAmount = roundMoney(Math.max(0, Number(normalizedUser.holdAmount ?? 0)));

        if (changed && !dryRun) {
          const persisted = await persistFinancialState({
            username,
            user: normalizedUser,
            operation: 'admin_reconcile_premium_settlements',
            before: beforeState,
            writes,
            ledgerMetadata: {
              settlementBackfills: userSettlementBackfills,
              settlementBackfillAmount: userSettlementBackfillAmount,
              commissionReconciliations: userCommissionReconciliations,
              autoUnfrozen: userAutoUnfrozen,
            },
          });
          normalizedUser = persisted.user;
        }

        return {
          processed: true as const,
          changed,
          before,
          after: {
            balance: roundMoney(Number(normalizedUser.balance ?? 0)),
            todayCommission: roundMoney(Number(normalizedUser.todayCommission ?? 0)),
            holdAmount: roundMoney(Number(normalizedUser.holdAmount ?? 0)),
            isFrozen: Boolean(normalizedUser.isFrozen),
          },
          userAutoUnfrozen,
          userCommissionReconciliations,
          userSettlementBackfills,
          userSettlementBackfillAmount,
        };
      });

      if ('unauthorized' in reconciliation) {
        skippedUnauthorized += 1;
        continue;
      }
      if ('skipped' in reconciliation) {
        continue;
      }

      processed += 1;
      if (reconciliation.changed) {
        usersChanged += 1;
      }
      if (reconciliation.userAutoUnfrozen) {
        usersAutoUnfrozen += 1;
      }
      commissionReconciliations += reconciliation.userCommissionReconciliations;
      settlementBackfills += reconciliation.userSettlementBackfills;
      settlementBackfillAmount = roundMoney(settlementBackfillAmount + reconciliation.userSettlementBackfillAmount);

      report.push({
        username,
        changed: reconciliation.changed,
        before: reconciliation.before,
        after: reconciliation.after,
      });
    }

    const actorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-premium-settlement-reconcile',
      actorEmail,
      `Reconciled premium settlements (dryRun: ${dryRun ? 'yes' : 'no'}, reconcileTodayCommission: ${reconcileTodayCommission ? 'yes' : 'no'}, processed: ${processed}, changed: ${usersChanged}, settlementBackfills: ${settlementBackfills}, amount: $${settlementBackfillAmount.toFixed(2)})`,
    ).catch((e) => console.error('Failed to record admin-premium-settlement-reconcile audit event:', e));

    return c.json({
      success: true,
      dryRun,
      reconcileTodayCommission,
      processed,
      usersChanged,
      skippedUnauthorized,
      usersAutoUnfrozen,
      commissionReconciliations,
      settlementBackfills,
      settlementBackfillAmount: roundMoney(settlementBackfillAmount),
      report,
    });
  } catch (err) {
    console.error('admin/platform-users/reconcile-premium-settlements error:', err);
    return c.json({ error: 'Failed to reconcile premium settlements' }, 500);
  }
});

// GET /admin/platform-users/discover-ghost-users – super-admin only
// Returns list of auth users without corresponding platform KV records
app.get('/make-server-a1c55d7e/admin/platform-users/discover-ghost-users', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:discover-ghost-users');
    if (limited) return limited;

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);

    if (!callerIsSuperAdmin) {
      return c.json({ error: 'Only super-admin can discover ghost users' }, 403);
    }

    // Get all KV platform usernames for quick lookup
    const kvUsers = new Set<string>();
    const allRawUsers = await kv.getEntriesByPrefix('user:');
    for (const raw of allRawUsers) {
      const rawUsername = getUsernameFromUserKvEntry(raw);
      if (rawUsername && rawUsername !== 'steadfast_root') {
        const canon = (await resolveCanonicalUsername(rawUsername)) ?? rawUsername;
        kvUsers.add(canon.toLowerCase());
      }
    }

    // Query all auth users for ghost accounts
    const ghostUsers: any[] = [];
    if (authClient) {
      try {
        let p = 1;
        let totalScanned = 0;
        const maxPages = 10; // ~2000 users max
        
        while (p <= maxPages) {
          const { data } = await authClient.auth.admin.listUsers({ page: p, perPage: 200 });
          const batch = Array.isArray(data?.users) ? data.users : [];
          
          for (const authUser of batch) {
            totalScanned++;
            const metadataUsername = sanitizeUsername(
              typeof authUser?.user_metadata?.username === 'string' ? authUser.user_metadata.username : '',
            );
            const emailLocal = sanitizeUsername(
              typeof authUser?.email === 'string' ? (authUser.email.split('@')[0] ?? '') : '',
            );
            const checkUsername = (metadataUsername || emailLocal || '').toLowerCase();
            
            // If auth user exists but no corresponding KV record, it's a ghost
            if (checkUsername && !kvUsers.has(checkUsername)) {
              ghostUsers.push({
                id: authUser.id,
                email: authUser.email,
                username: metadataUsername || emailLocal || '(unknown)',
                createdAt: authUser.created_at,
                lastSignInAt: authUser.last_sign_in_at,
              });
            }
          }
          
          if (batch.length < 200) break;
          p += 1;
        }
      } catch (e) {
        console.error('Error scanning auth users for ghosts:', e);
        return c.json({ error: 'Failed to scan auth system' }, 500);
      }
    }

    await recordObservabilityAuditEvent(
      'admin_ghost_user_discovery',
      typeof callingAdmin?.email === 'string' ? callingAdmin.email : String(callingAdmin?.id ?? 'unknown'),
      `Discovered ${ghostUsers.length} ghost users (auth-only, no platform records)`,
    ).catch((e) => console.error('Failed to record discovery audit event:', e));

    return c.json({
      success: true,
      ghostUsersCount: ghostUsers.length,
      ghostUsers: ghostUsers.slice(0, 100), // Max 100 to avoid huge response
      totalScanned: totalScanned || 0,
      discoveredAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('admin/platform-users/discover-ghost-users error:', err);
    return c.json({ error: 'Failed to discover ghost users' }, 500);
  }
});

// POST /admin/platform-users/:username/recover-ghost-user – super-admin only
// Explicitly recovers a ghost user by bootstrapping their platform KV record from auth
app.post('/make-server-a1c55d7e/admin/platform-users/:username/recover-ghost-user', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:recover-ghost-user');
    if (limited) return limited;

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);

    if (!callerIsSuperAdmin) {
      return c.json({ error: 'Only super-admin can recover ghost users' }, 403);
    }

    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    // Check if user already has a platform record
    const existingRecord = await kv.get(`user:${requestedUsername}`);
    if (existingRecord) {
      return c.json({
        ok: true,
        username: requestedUsername,
        status: 'already_recovered',
        message: 'User already has a platform record',
      });
    }

    // Search for auth user
    const authUser = await findAuthUserForPlatformUsername(requestedUsername);
    if (!authUser) {
      return c.json({ error: 'User not found in auth system' }, 404);
    }

    // Bootstrap the missing platform record
    const canonicalUsername = requestedUsername;
    const recoveredUser = await bootstrapMissingPlatformUserRecord(canonicalUsername, {
      referredByAdminId: typeof callingAdmin?.id === 'string' ? callingAdmin.id : null,
    });

    // Log this recovery
    await recordObservabilityAuditEvent(
      'admin_ghost_user_recovered',
      typeof callingAdmin?.email === 'string' ? callingAdmin.email : String(callingAdmin?.id ?? 'unknown'),
      `Recovered ghost user '${canonicalUsername}' by bootstrapping platform record from auth (authId: ${authUser.id})`,
    ).catch((e) => console.error('Failed to record recovery audit event:', e));

    logStructuredEvent(c, 'admin_ghost_user_recovered', 'info', {
      username: canonicalUsername,
      authUserId: authUser.id,
      recoveredAt: new Date().toISOString(),
    });

    return c.json({
      ok: true,
      username: canonicalUsername,
      status: 'recovered',
      authId: authUser.id,
      platformRecord: {
        balance: recoveredUser.balance,
        vipLevel: recoveredUser.vipLevel,
        isFrozen: recoveredUser.isFrozen,
        tasksLimit: recoveredUser.tasksLimit,
      },
      recoveredAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('admin/platform-users/recover-ghost-user error:', err);
    return c.json({ error: 'Failed to recover ghost user' }, 500);
  }
});

// Admin-reset user credentials (login + transaction) without email dependency.
// Admin provides new values; server stores only hashes and forces next password change.
app.post('/make-server-a1c55d7e/admin/platform-users/:username/reset-credentials', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:reset-credentials');
    if (limited) return limited;

    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const resolvedCanonicalUsername = await resolveCanonicalUsername(requestedUsername);
    let canonicalUsername = resolvedCanonicalUsername ?? requestedUsername;
    let userKey = `user:${canonicalUsername}`;
    let existingUser = resolvedCanonicalUsername ? await kv.get(userKey) : null;
    let bootstrappedFromAuth = false;

    if (!existingUser) {
      if (!callerIsSuperAdmin) {
        return c.json({ error: 'User not found' }, 404);
      }

      const authUser = await findAuthUserForPlatformUsername(requestedUsername);
      if (!authUser) {
        return c.json({ error: 'User not found' }, 404);
      }

      const metadataUsername = sanitizeUsername(
        typeof authUser?.user_metadata?.username === 'string' ? authUser.user_metadata.username : '',
      );
      const emailLocal = sanitizeUsername(
        typeof authUser?.email === 'string' ? (authUser.email.split('@')[0] ?? '') : '',
      );
      canonicalUsername = metadataUsername || emailLocal || requestedUsername;
      existingUser = await bootstrapMissingPlatformUserRecord(canonicalUsername, {
        referredByAdminId: typeof callingAdmin?.id === 'string' ? callingAdmin.id : null,
      });
      userKey = `user:${canonicalUsername}`;
      bootstrappedFromAuth = true;

      logStructuredEvent(c, 'admin_missing_user_bootstrapped', 'info', {
        username: canonicalUsername,
        reason: 'reset-credentials',
      });
    }

    const normalizedUser = await syncUserWithVipConfig(existingUser, canonicalUsername);
    if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json();
    const nextLoginPassword = typeof body?.loginPassword === 'string' ? body.loginPassword.trim() : '';
    const nextTransactionPassword = typeof body?.transactionPassword === 'string' ? body.transactionPassword.trim() : '';

    if (nextLoginPassword.length < 6 || nextTransactionPassword.length < 6) {
      return c.json({ error: 'loginPassword and transactionPassword must each be at least 6 characters.' }, 400);
    }

    normalizedUser.password = await hashPassword(nextLoginPassword);
    normalizedUser.transactionPassword = await hashPassword(nextTransactionPassword);
    normalizedUser.mustChangePassword = true;
    normalizedUser.passwordUpdatedAt = new Date().toISOString();

    await kv.set(userKey, normalizedUser);
    await assignUsernameLookup(canonicalUsername);

    const resetActorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'user-credentials-reset',
      resetActorEmail,
      `Reset login and transaction password for user '${canonicalUsername}' (mustChangePassword=true, bootstrappedFromAuth=${bootstrappedFromAuth ? 'yes' : 'no'})`,
    ).catch((e) => console.error('Failed to record user-credentials-reset audit event:', e));

    return c.json({
      ok: true,
      username: canonicalUsername,
      mustChangePassword: true,
      bootstrappedFromAuth,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('admin/platform-users/reset-credentials error:', err);
    return c.json({ error: 'Failed to reset user credentials' }, 500);
  }
});

app.post('/make-server-a1c55d7e/admin/platform-users/:username/balance-adjustment', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = await enforceCriticalAdminRateLimit(c, 'admin-platform-users:balance-adjustment');
    if (limited) return limited;

    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const canonicalUsername = await resolveCanonicalUsername(requestedUsername);
    if (!canonicalUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    const body = await c.req.json();
    const mode = body?.mode === 'debit' ? 'debit' : 'credit';
    const amount = roundMoney(Number(body?.amount ?? 0));
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 200) : '';

    if (!Number.isFinite(amount) || amount <= 0) {
      return c.json({ error: 'Amount must be greater than 0' }, 400);
    }

    if (!reason) {
      return c.json({ error: 'Reason is required' }, 400);
    }

    const adjustmentReferenceId = createFinanceId('adj');
    const adjustmentResult = await withUserFinancialLock(canonicalUsername, async () => {
      const userKey = `user:${canonicalUsername}`;
      const existingUser = await kv.get(userKey);
      if (!existingUser) {
        return { response: c.json({ error: 'User not found' }, 404) };
      }

      const normalizedUser = await syncUserWithVipConfig(existingUser, canonicalUsername);
      if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
        return { response: c.json({ error: 'Forbidden' }, 403) };
      }

      if (mode === 'debit' && normalizedUser.balance < amount) {
        return { response: c.json({ error: 'User balance is too low for this deduction' }, 400) };
      }

      const before = snapshotFinancialState(normalizedUser);
      normalizedUser.balance = roundMoney(normalizedUser.balance + (mode === 'credit' ? amount : -amount));

      // Track lucky bonus when admin credits with Lucky Bonus label
      const isLuckyBonusCredit = mode === 'credit' && body?.isBonus === true
        && typeof body?.bonusLabel === 'string' && body.bonusLabel.toLowerCase().includes('lucky');
      if (isLuckyBonusCredit) {
        normalizedUser.luckyBonus = roundMoney((normalizedUser.luckyBonus || 0) + amount);
      }

      const rewardSyncResult = mode === 'credit'
        ? await applyAutomaticRewardsForUser(canonicalUsername, normalizedUser)
        : { normalizedUser, rewardsApplied: [] as Array<{ category: 'workday' | 'reset' | 'accumulated'; amount: number; reference: string }> };
      const finalUser = rewardSyncResult.normalizedUser;
      const transaction = buildTransactionRecord({
        username: canonicalUsername,
        type: mode === 'credit' ? 'Deposit' : 'Withdrawal',
        amount,
        status: 'Completed',
        method: 'Admin Adjustment',
        source: 'admin-adjustment',
        description: `${mode === 'credit' ? 'Admin top-up' : 'Admin deduction'}: ${reason}`,
        referenceId: adjustmentReferenceId,
      });

      const persisted = await persistFinancialState({
        username: canonicalUsername,
        user: finalUser,
        operation: mode === 'credit' ? 'admin_balance_adjustment_credit' : 'admin_balance_adjustment_debit',
        before,
        writes: [
          { key: `${TRANSACTION_KEY_PREFIX}${transaction.id}`, value: transaction },
        ],
        ledgerMetadata: {
          amount,
          mode,
          reason,
          referenceId: adjustmentReferenceId,
        },
      });

      return {
        user: persisted.user,
        transaction,
        rewardsApplied: rewardSyncResult.rewardsApplied,
      };
    });

    if ('response' in adjustmentResult) {
      return adjustmentResult.response;
    }

    const actorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-user-balance-adjustment',
      actorEmail,
      `${mode === 'credit' ? 'Credited' : 'Debited'} $${amount.toFixed(2)} for user '${canonicalUsername}' (new balance: $${adjustmentResult.user.balance.toFixed(2)}; reason: ${reason})`,
    ).catch((e) => console.error('Failed to record admin-user-balance-adjustment audit event:', e));

    return c.json({
      success: true,
      user: adjustmentResult.user,
      transaction: adjustmentResult.transaction,
      rewardsApplied: adjustmentResult.rewardsApplied,
    });
  } catch (err) {
    console.error('admin/platform-users/balance-adjustment error:', err);
    return c.json({ error: 'Failed to adjust user balance' }, 500);
  }
});

app.post('/make-server-a1c55d7e/admin/platform-users/:username/vip-level', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = await enforceCriticalAdminRateLimit(c, 'admin-platform-users:vip-level');
    if (limited) return limited;

    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const canonicalUsername = await resolveCanonicalUsername(requestedUsername);
    if (!canonicalUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    const body = await c.req.json();
    const newVipLevel = body?.vipLevel ?? null;
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 200) : '';

    // Validate input: newVipLevel must be null (clear override) or 1-5
    let normalizedVipLevel = null;
    if (newVipLevel !== null && newVipLevel !== undefined) {
      const parsed = Number(newVipLevel);
      if (!Number.isFinite(parsed)) {
        return c.json({ error: 'VIP level must be null or a number between 1 and 5' }, 400);
      }
      normalizedVipLevel = Math.max(1, Math.min(5, Math.round(parsed)));
    }

    if (!reason) {
      return c.json({ error: 'Reason is required' }, 400);
    }

    const vipLevelReferenceId = createFinanceId('vopl');
    const vipLevelResult = await withUserFinancialLock(canonicalUsername, async () => {
      const userKey = `user:${canonicalUsername}`;
      const existingUser = await kv.get(userKey);
      if (!existingUser) {
        return { response: c.json({ error: 'User not found' }, 404) };
      }

      const normalizedUser = await normalizeUserRecord(existingUser);
      if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
        return { response: c.json({ error: 'Forbidden' }, 403) };
      }

      const previousVipLevel = normalizedUser.vipLevel;
      const previousManualVipLevel = normalizedUser.manualVipLevel;

      // Set the manual VIP level override
      normalizedUser.manualVipLevel = normalizedVipLevel;

      // Re-sync to recalculate VIP level (respecting manual override if set)
      const syncedUser = await syncUserWithVipConfig(normalizedUser, canonicalUsername);

      const auditMessage = normalizedVipLevel === null
        ? `Cleared VIP level override for '${canonicalUsername}' (VIP reverted to auto-calc: ${previousVipLevel} → ${syncedUser.vipLevel}; reason: ${reason})`
        : `Set VIP level override to ${normalizedVipLevel} for '${canonicalUsername}' (VIP changed: ${previousVipLevel} → ${syncedUser.vipLevel}; reason: ${reason})`;

      // Save to KV
      await kv.put(`user:${canonicalUsername}`, syncedUser);

      return {
        user: syncedUser,
        previousVipLevel,
        previousManualVipLevel,
        newManualVipLevel: normalizedVipLevel,
        referenceId: vipLevelReferenceId,
      };
    });

    if ('response' in vipLevelResult) {
      return vipLevelResult.response;
    }

    const actorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-user-vip-level-override',
      actorEmail,
      normalizedVipLevel === null
        ? `Cleared VIP level override for '${canonicalUsername}' (VIP reverted to auto-calc: ${vipLevelResult.previousVipLevel} → ${vipLevelResult.user.vipLevel}; reason: ${reason})`
        : `Set VIP level override to ${normalizedVipLevel} for '${canonicalUsername}' (VIP changed: ${vipLevelResult.previousVipLevel} → ${vipLevelResult.user.vipLevel}; reason: ${reason})`,
    ).catch((e) => console.error('Failed to record admin-user-vip-level-override audit event:', e));

    return c.json({
      success: true,
      user: vipLevelResult.user,
      previousVipLevel: vipLevelResult.previousVipLevel,
      previousManualVipLevel: vipLevelResult.previousManualVipLevel,
      newManualVipLevel: vipLevelResult.newManualVipLevel,
      referenceId: vipLevelResult.referenceId,
    });
  } catch (err) {
    console.error('admin/platform-users/vip-level error:', err);
    return c.json({ error: 'Failed to set user VIP level' }, 500);
  }
});

app.patch('/make-server-a1c55d7e/admin/platform-users/:username/credit-score', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:credit-score');
    if (limited) return limited;

    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const canonicalUsername = await resolveCanonicalUsername(requestedUsername);
    if (!canonicalUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userKey = `user:${canonicalUsername}`;
    const existingUser = await kv.get(userKey);
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const normalizedUser = await syncUserWithVipConfig(existingUser, canonicalUsername);
    if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json();
    const rawScore = Number(body?.creditScore);
    if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 100) {
      return c.json({ error: 'creditScore must be a number between 0 and 100' }, 400);
    }
    const newCreditScore = Math.round(rawScore);

    normalizedUser.creditScore = newCreditScore;
    await kv.set(userKey, normalizedUser);

    const actorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-user-credit-score',
      actorEmail,
      `Set credit score to ${newCreditScore} for user '${canonicalUsername}'`,
    ).catch((e) => console.error('Failed to record admin-user-credit-score audit event:', e));

    return c.json({
      success: true,
      creditScore: newCreditScore,
      user: normalizedUser,
      taskProgress: buildUserTaskProgress(normalizedUser),
    });
  } catch (err) {
    console.error('admin/platform-users/credit-score error:', err);
    return c.json({ error: 'Failed to update credit score' }, 500);
  }
});

app.delete('/make-server-a1c55d7e/admin/platform-users/:username', async (c) => {
  try {
    const unauthorized = await requireAdmin(c);
    if (unauthorized) return unauthorized;

    const limited = enforceAdminRateLimit(c, 'admin-platform-users:delete');
    if (limited) return limited;

    const requestedUsername = sanitizeUsername(c.req.param('username'));
    if (!requestedUsername) {
      return c.json({ error: 'Invalid username' }, 400);
    }

    const callingAdmin = c.get('adminUser');
    const callerIsSuperAdmin = isSuperAdmin(callingAdmin);
    const canonicalUsername = await resolveCanonicalUsername(requestedUsername);
    if (!canonicalUsername) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (canonicalUsername === ROOT_REFERRAL_USERNAME) {
      return c.json({ error: 'Root referral account cannot be deleted' }, 400);
    }

    const userKey = `user:${canonicalUsername}`;
    const existingUser = await kv.get(userKey);
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const normalizedUser = await syncUserWithVipConfig(existingUser, canonicalUsername);
    if (!callerIsSuperAdmin && normalizedUser.referredByAdminId !== callingAdmin?.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Delete all support tickets belonging to this user
    const userTicketsKey = `user:${canonicalUsername}:tickets`;
    const ticketIndex = await kv.get(userTicketsKey);
    const ticketIds = Array.isArray(ticketIndex) ? ticketIndex : [];
    for (const ticketId of ticketIds) {
      if (typeof ticketId === 'string' && ticketId.trim().length > 0) {
        await kv.del(`ticket:${ticketId}`);
      }
    }
    await kv.del(userTicketsKey);

    // Delete the user's own referral invite code so it can no longer be used
    const userInvitationCode = typeof normalizedUser.invitationCode === 'string' && normalizedUser.invitationCode
      ? normalizedUser.invitationCode
      : null;
    if (userInvitationCode) {
      await kv.del(`referral:invite:${userInvitationCode}`).catch(() => {/* non-critical */});
    }

    // Remove user from parent's children array
    const invitedByCode = typeof normalizedUser.invitedByCode === 'string' && normalizedUser.invitedByCode
      ? normalizedUser.invitedByCode
      : null;
    if (invitedByCode) {
      const parentUsername = await kv.get(`referral:invite:${invitedByCode}`);
      if (typeof parentUsername === 'string' && parentUsername) {
        const parentData = await kv.get(`user:${parentUsername}`);
        if (parentData && Array.isArray(parentData.children)) {
          parentData.children = parentData.children.filter((c: string) => c !== canonicalUsername);
          await kv.set(`user:${parentUsername}`, parentData).catch(() => {/* non-critical */});
        }
      }
    }

    // Delete lookup key and user record last
    await kv.del(`user:lookup:${canonicalUsername.toLowerCase()}`);
    await kv.del(userKey);

    const deleteActorEmail = typeof callingAdmin?.email === 'string' && callingAdmin.email
      ? callingAdmin.email
      : String(callingAdmin?.id ?? 'unknown');
    await recordObservabilityAuditEvent(
      'admin-platform-user-delete',
      deleteActorEmail,
      `Deleted platform user '${canonicalUsername}' and all associated data (tickets, referral code, parent tree)`,
    ).catch((e) => console.error('Failed to record admin-platform-user-delete audit event:', e));

    return c.json({ success: true, username: canonicalUsername });
  } catch (err) {
    console.error('admin/platform-users/delete error:', err);
    return c.json({ error: 'Failed to delete platform user' }, 500);
  }
});

// ==================== SESSION-NATIVE /me/support ENDPOINTS ====================

// GET /me/support – fetch tickets for the session-authenticated user (no username in request)
app.get('/make-server-a1c55d7e/me/support', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }
    const username = sessionResult.session.username;

    const userTicketsKey = `user:${username}:tickets`;
    const ticketIds: string[] = await kv.get(userTicketsKey) || [];

    const fetched = await Promise.all(ticketIds.map(id => kv.get(`ticket:${id}`)));
    const tickets = fetched.filter(Boolean);

    tickets.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json(tickets);
  } catch (error) {
    console.error('Error fetching session user tickets:', error);
    return c.json({ error: 'Failed to fetch tickets' }, 500);
  }
});

// POST /me/support/create – create a ticket as the session-authenticated user
app.post('/make-server-a1c55d7e/me/support/create', async (c) => {
  try {
    const rateLimited = enforceUserRateLimit(c, 'user:create-ticket');
    if (rateLimited) return rateLimited;

    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }
    const username = sessionResult.session.username;

    const body = await c.req.json();
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const category = typeof body?.category === 'string' ? body.category.trim() : '';
    const priority = typeof body?.priority === 'string' ? body.priority.trim() : 'medium';

    if (!subject || !message || !category) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ticket = {
      id: ticketId,
      username,
      subject,
      message,
      category,
      priority,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
      assignedTo: null,
    };

    await kv.set(`ticket:${ticketId}`, ticket);

    const userTicketsKey = `user:${username}:tickets`;
    const userTickets = await kv.get(userTicketsKey) || [];
    userTickets.push(ticketId);
    await kv.set(userTicketsKey, userTickets);

    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error creating session user ticket:', error);
    return c.json({ error: 'Failed to create ticket' }, 500);
  }
});

// POST /me/support/reply – reply to a ticket owned by the session-authenticated user
app.post('/make-server-a1c55d7e/me/support/reply', async (c) => {
  try {
    const sessionResult = await requireActiveUserSession(c);
    if ('response' in sessionResult) {
      return sessionResult.response;
    }
    const username = sessionResult.session.username;

    const body = await c.req.json();
    const ticketId = typeof body?.ticketId === 'string' ? body.ticketId.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!ticketId || !message) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const ticketKey = `ticket:${ticketId}`;
    const ticket = await kv.get(ticketKey);

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    if (ticket.username !== username) {
      return c.json({ error: 'Forbidden: ticket does not belong to the active session' }, 403);
    }

    const response = {
      id: `response_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      message,
      respondedBy: username,
      isAdmin: false,
      createdAt: new Date().toISOString(),
    };

    ticket.responses.push(response);
    ticket.updatedAt = new Date().toISOString();
    await kv.set(ticketKey, ticket);

    return c.json({ success: true, ticket });
  } catch (error) {
    console.error('Error replying to ticket:', error);
    return c.json({ error: 'Failed to reply to ticket' }, 500);
  }
});

Deno.serve(app.fetch);
