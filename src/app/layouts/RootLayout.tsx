import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { warmApiCompatibilityState } from '../services/apiCompatibility';
import SessionTimeoutWarning from '../components/SessionTimeoutWarning';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { PageTransition } from '../components/PageTransition';
import { NetworkStatus } from '../components/NetworkStatus';
import { TopProgressBar } from '../components/TopProgressBar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import PlatformModeBanner from '../components/PlatformModeBanner';
import { RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';
import { getSessionUsername } from '../services/serverAuth';
import { fetchJsonWithRetry } from '../services/networkClient';
import { buildUserScopedCacheKey, buildPublicCacheKey } from '../services/apiCompatibility';

/**
 * Prefetch likely next-route chunks AND data so navigation feels instant.
 * Chunk prefetch: loads JS modules via idle callback.
 * Data prefetch: fires API requests into the browser's HTTP cache.
 */
const prefetchMap: Record<string, string[]> = {
  '/': ['./pages/Login', './pages/Signup'],
  '/login': ['./pages/UserHome', './pages/Signup'],
  '/signup': ['./pages/Login'],
  '/home': [
    './pages/Starting', './pages/Records', './pages/Profile',
    './pages/VipLevels', './pages/Activity', './pages/Deposit',
    './pages/Certificate', './pages/Withdrawal',
  ],
  '/starting': ['./pages/Records'],
  '/records': ['./pages/Starting'],
};

type DataPrefetchEntry = {
  endpoint: string;
  cacheKey: (username: string) => string;
  cacheTtlMs: number;
};

function userKey(base: string, username: string) {
  return buildUserScopedCacheKey(base, username, 'v1');
}
function userKeyV2(base: string, username: string) {
  return buildUserScopedCacheKey(base, username, 'v2');
}

const dataPrefetchEntries: Record<string, DataPrefetchEntry[]> = {
  '/home': [
    { endpoint: '/v2/me/starting-snapshot?includeCatalog=true&includeConfig=true&catalogLimit=50', cacheKey: (u) => userKeyV2('starting:snapshot', u), cacheTtlMs: 45_000 },
    { endpoint: '/me/records-snapshot?tasksLimit=120&transactionsLimit=120&includeCatalog=true&includeVip=true', cacheKey: (u) => userKeyV2('records:snapshot', u), cacheTtlMs: 45_000 },
    { endpoint: '/me/financials', cacheKey: (u) => userKey('me:financials', u), cacheTtlMs: 30_000 },
    { endpoint: '/me/transactions', cacheKey: (u) => userKey('deposit:transactions', u), cacheTtlMs: 45_000 },
    { endpoint: '/vip-config', cacheKey: () => buildPublicCacheKey('vip-config', 'v1'), cacheTtlMs: 300_000 },
    { endpoint: '/v2/me/activity-snapshot?includeConfig=true&transactionsLimit=80&withdrawalsLimit=40', cacheKey: (u) => userKeyV2('activity:snapshot', u), cacheTtlMs: 45_000 },
  ],
  '/starting': [
    { endpoint: '/me/records-snapshot?tasksLimit=120&transactionsLimit=120&includeCatalog=true&includeVip=true', cacheKey: (u) => userKeyV2('records:snapshot', u), cacheTtlMs: 45_000 },
    { endpoint: '/me/financials', cacheKey: (u) => userKey('me:financials', u), cacheTtlMs: 30_000 },
    { endpoint: '/me/transactions', cacheKey: (u) => userKey('deposit:transactions', u), cacheTtlMs: 45_000 },
    { endpoint: '/vip-config', cacheKey: () => buildPublicCacheKey('vip-config', 'v1'), cacheTtlMs: 300_000 },
    { endpoint: '/v2/me/activity-snapshot?includeConfig=true&transactionsLimit=80&withdrawalsLimit=40', cacheKey: (u) => userKeyV2('activity:snapshot', u), cacheTtlMs: 45_000 },
  ],
  '/records': [
    { endpoint: '/v2/me/starting-snapshot?includeCatalog=true&includeConfig=true&catalogLimit=50', cacheKey: (u) => userKeyV2('starting:snapshot', u), cacheTtlMs: 45_000 },
    { endpoint: '/me/financials', cacheKey: (u) => userKey('me:financials', u), cacheTtlMs: 30_000 },
    { endpoint: '/me/transactions', cacheKey: (u) => userKey('deposit:transactions', u), cacheTtlMs: 45_000 },
    { endpoint: '/vip-config', cacheKey: () => buildPublicCacheKey('vip-config', 'v1'), cacheTtlMs: 300_000 },
    { endpoint: '/v2/me/activity-snapshot?includeConfig=true&transactionsLimit=80&withdrawalsLimit=40', cacheKey: (u) => userKeyV2('activity:snapshot', u), cacheTtlMs: 45_000 },
  ],
};

const prefetchedDataUrls = new Set<string>();

function prefetchData(entries: DataPrefetchEntry[]) {
  const username = getSessionUsername();
  if (!username) return;
  
  const baseUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;
  for (const entry of entries) {
    const url = `${baseUrl}${entry.endpoint}`;
    if (prefetchedDataUrls.has(url)) continue;
    prefetchedDataUrls.add(url);
    
    fetchJsonWithRetry({
      url,
      timeoutMs: 10_000,
      retries: 1,
      retryDelayMs: 300,
      cacheKey: entry.cacheKey(username),
      cacheTtlMs: entry.cacheTtlMs,
      pageTag: 'prefetch',
    }).catch(() => {});
  }
}

function usePrefetchRoutes() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Fire data prefetch IMMEDIATELY — don't wait for idle.
    // This is the critical path: pages need this data on mount.
    const dataTargets = dataPrefetchEntries[pathname];
    if (dataTargets) {
      prefetchData(dataTargets);
    }

    // JS chunk prefetch can wait for idle — it's less urgent.
    const schedule = typeof requestIdleCallback === 'function' ? requestIdleCallback : (cb: () => void) => setTimeout(cb, 1);
    const cancel = typeof cancelIdleCallback === 'function' ? cancelIdleCallback : clearTimeout;

    const id = schedule(() => {
      const targets = prefetchMap[pathname];
      if (targets) {
        for (const mod of targets) {
          import(/* @vite-ignore */ mod).catch(() => {});
        }
      }
    });

    return () => cancel(id as number);
  }, [pathname]);
}

export default function RootLayout() {
  usePrefetchRoutes();
  useKeyboardShortcuts();

  useEffect(() => {
    void warmApiCompatibilityState();
  }, []);

  return (
    <>
      <PlatformModeBanner />
      <NetworkStatus />
      <TopProgressBar />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#00D9FF] focus:text-[#1a1f2e] focus:rounded-lg focus:font-semibold focus:text-sm"
      >
        Skip to main content
      </a>
      <SessionTimeoutWarning />
      <AnnouncementBanner />
      <div id="main-content" className="flex-1 flex flex-col min-h-0">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
      <div id="bottom-nav-portal" />
    </>
  );
}