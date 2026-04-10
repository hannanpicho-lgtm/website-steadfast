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

/**
 * Prefetch likely next-route chunks so navigation feels instant.
 * Only triggers once per path, and only after the current page has loaded.
 */
const prefetchMap: Record<string, string[]> = {
  '/': ['./pages/Login', './pages/Signup'],
  '/login': ['./pages/UserHome', './pages/Signup'],
  '/signup': ['./pages/Login'],
  '/home': ['./pages/Starting', './pages/Records', './pages/Profile'],
};

function usePrefetchRoutes() {
  const { pathname } = useLocation();

  useEffect(() => {
    const targets = prefetchMap[pathname];
    if (!targets) return;

    const schedule = typeof requestIdleCallback === 'function' ? requestIdleCallback : (cb: () => void) => setTimeout(cb, 1);
    const cancel = typeof cancelIdleCallback === 'function' ? cancelIdleCallback : clearTimeout;

    const id = schedule(() => {
      for (const mod of targets) {
        import(/* @vite-ignore */ mod).catch(() => {});
      }
    });

    return () => cancel(id);
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
      <div id="main-content">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </>
  );
}