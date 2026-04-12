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
import { buildServerSessionHeaders } from '../services/serverAuth';

/**
 * Prefetch likely next-route chunks AND data so navigation feels instant.
 * Chunk prefetch: loads JS modules via idle callback.
 * Data prefetch: fires API requests into the browser's HTTP cache.
 */
const prefetchMap: Record<string, string[]> = {
  '/': ['./pages/Login', './pages/Signup'],
  '/login': ['./pages/UserHome', './pages/Signup'],
  '/signup': ['./pages/Login'],
  '/home': ['./pages/Starting', './pages/Records', './pages/Profile'],
  '/starting': ['./pages/Records'],
  '/records': ['./pages/Starting'],
};

const dataPrefetchMap: Record<string, string[]> = {
  '/home': [
    '/v2/me/starting-snapshot?includeCatalog=true&includeConfig=true&catalogLimit=50',
    '/me/records-snapshot?tasksLimit=120&transactionsLimit=120&includeCatalog=true&includeVip=true',
  ],
  '/starting': [
    '/me/records-snapshot?tasksLimit=120&transactionsLimit=120&includeCatalog=true&includeVip=true',
  ],
  '/records': [
    '/v2/me/starting-snapshot?includeCatalog=true&includeConfig=true&catalogLimit=50',
  ],
};

const prefetchedDataUrls = new Set<string>();

function prefetchData(endpoints: string[]) {
  const username = getSessionUsername();
  if (!username) return;
  
  const baseUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;
  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    if (prefetchedDataUrls.has(url)) continue;
    prefetchedDataUrls.add(url);
    
    fetch(url, {
      credentials: 'include',
      headers: buildServerSessionHeaders({
        'Authorization': `Bearer ${RUNTIME_ENVIRONMENT.publicAnonKey}`,
      }),
    }).catch(() => {});
  }
}

function usePrefetchRoutes() {
  const { pathname } = useLocation();

  useEffect(() => {
    const schedule = typeof requestIdleCallback === 'function' ? requestIdleCallback : (cb: () => void) => setTimeout(cb, 1);
    const cancel = typeof cancelIdleCallback === 'function' ? cancelIdleCallback : clearTimeout;

    const id = schedule(() => {
      const targets = prefetchMap[pathname];
      if (targets) {
        for (const mod of targets) {
          import(/* @vite-ignore */ mod).catch(() => {});
        }
      }
      
      const dataTargets = dataPrefetchMap[pathname];
      if (dataTargets) {
        prefetchData(dataTargets);
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