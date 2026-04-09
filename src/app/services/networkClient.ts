import {
  FRONTEND_APP_VERSION,
  FRONTEND_CONTRACT_VERSION,
  FRONTEND_SUPPORTED_API_VERSIONS,
  reportClientCompatibilityEvent,
  type ApiVersion,
  type CompatibilityFeatureName,
} from './apiCompatibility';
import { publicAnonKey } from '@utils/supabase/info';

type CacheEnvelope<T> = {
  timestamp: number;
  payload: T;
};

type ApiMetricSample = {
  at: string;
  endpoint: string;
  method: string;
  durationMs: number;
  status: number | null;
  ok: boolean;
  pageTag?: string;
  retriesUsed: number;
  cacheHit: boolean;
};

type FetchJsonWithRetryParams = {
  url: string;
  init?: RequestInit;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  cacheKey?: string;
  cacheTtlMs?: number;
  pageTag?: string;
  featureTag?: CompatibilityFeatureName;
  expectedApiVersion?: ApiVersion;
};

const API_METRICS_STORAGE_KEY = 'perf:api-metrics:v1';
const API_METRICS_MAX_SAMPLES = 250;
const TRANSIENT_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

class HttpRequestError extends Error {
  status: number;
  transient: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpRequestError';
    this.status = status;
    this.transient = TRANSIENT_HTTP_STATUSES.has(status);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeEndpoint(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function readFromSessionCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.timestamp !== 'number') {
      return null;
    }

    if (Date.now() - parsed.timestamp > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
}

function writeToSessionCache<T>(key: string, payload: T): void {
  try {
    const envelope: CacheEnvelope<T> = {
      timestamp: Date.now(),
      payload,
    };
    sessionStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Cache should not block user flows.
  }
}

function isTransientNetworkError(error: unknown): boolean {
  if (error instanceof HttpRequestError) {
    return error.transient;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  return false;
}

function recordApiMetric(sample: ApiMetricSample): void {
  try {
    const raw = localStorage.getItem(API_METRICS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(existing) ? existing : [];
    const next = [sample, ...list].slice(0, API_METRICS_MAX_SAMPLES);
    localStorage.setItem(API_METRICS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Metrics should never interrupt API calls.
  }
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init.headers ?? {});

  // Supabase API gateway requires Authorization or apikey header on every request.
  // Without it, the gateway returns 401 with Access-Control-Allow-Origin: * which
  // browsers block when credentials: 'include' is set, hiding the real error.
  if (!headers.has('Authorization') && !headers.has('apikey')) {
    headers.set('Authorization', `Bearer ${publicAnonKey}`);
  }

  if (!headers.has('x-client-app-version')) {
    headers.set('x-client-app-version', FRONTEND_APP_VERSION);
  }
  if (!headers.has('x-client-contract-version')) {
    headers.set('x-client-contract-version', FRONTEND_CONTRACT_VERSION);
  }
  if (!headers.has('x-client-supported-api-versions')) {
    headers.set('x-client-supported-api-versions', FRONTEND_SUPPORTED_API_VERSIONS.join(','));
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new HttpRequestError(
        String((payload as Record<string, unknown>)?.error ?? `Request failed (${response.status})`),
        response.status,
      );
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJsonWithRetry<T>(params: FetchJsonWithRetryParams): Promise<T> {
  const {
    url,
    init = {},
    timeoutMs = 7000,
    retries = 2,
    retryDelayMs = 300,
    cacheKey,
    cacheTtlMs,
    pageTag,
    featureTag,
    expectedApiVersion,
  } = params;

  if (cacheKey && cacheTtlMs && cacheTtlMs > 0) {
    const cached = readFromSessionCache<T>(cacheKey, cacheTtlMs);
    if (cached !== null) {
      recordApiMetric({
        at: new Date().toISOString(),
        endpoint: normalizeEndpoint(url),
        method: (init.method ?? 'GET').toUpperCase(),
        durationMs: 0,
        status: 200,
        ok: true,
        pageTag,
        retriesUsed: 0,
        cacheHit: true,
      });
      return cached;
    }
  }

  let lastError: unknown;
  const startedAt = performance.now();

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const payload = await fetchJsonWithTimeout(url, init, timeoutMs);
      const durationMs = Math.round(performance.now() - startedAt);

      recordApiMetric({
        at: new Date().toISOString(),
        endpoint: normalizeEndpoint(url),
        method: (init.method ?? 'GET').toUpperCase(),
        durationMs,
        status: 200,
        ok: true,
        pageTag,
        retriesUsed: attempt,
        cacheHit: false,
      });

      if (cacheKey && cacheTtlMs && cacheTtlMs > 0) {
        writeToSessionCache(cacheKey, payload as T);
      }

      return payload as T;
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < retries && isTransientNetworkError(error);
      if (!shouldRetry) {
        const durationMs = Math.round(performance.now() - startedAt);
        const status = error instanceof HttpRequestError ? error.status : null;

        recordApiMetric({
          at: new Date().toISOString(),
          endpoint: normalizeEndpoint(url),
          method: (init.method ?? 'GET').toUpperCase(),
          durationMs,
          status,
          ok: false,
          pageTag,
          retriesUsed: attempt,
          cacheHit: false,
        });

        void reportClientCompatibilityEvent({
          event: 'endpoint_failure',
          feature: featureTag ?? null,
          endpoint: normalizeEndpoint(url),
          expectedApiVersion: expectedApiVersion ?? null,
          status,
          reason: error instanceof Error ? error.message : 'request_failed',
          detail: {
            pageTag: pageTag ?? null,
            retriesUsed: attempt,
          },
        });

        throw error;
      }

      await wait(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}

/** Returns true when an error from fetchJsonWithRetry indicates the session has expired (HTTP 401). */
export function isAuthError(error: unknown): boolean {
  return error instanceof HttpRequestError && error.status === 401;
}

export function readApiMetrics(): ApiMetricSample[] {
  try {
    const raw = localStorage.getItem(API_METRICS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function invalidateSessionCacheByPrefix(prefix: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (typeof key === 'string' && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      sessionStorage.removeItem(key);
    }
  } catch {
    // Cache invalidation should never block user flows.
  }
}
