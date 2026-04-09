import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { warmApiCompatibilityState } from '../services/apiCompatibility';

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

    const id = requestIdleCallback(() => {
      for (const mod of targets) {
        import(/* @vite-ignore */ mod).catch(() => {});
      }
    });

    return () => cancelIdleCallback(id);
  }, [pathname]);
}

export default function RootLayout() {
  usePrefetchRoutes();

  useEffect(() => {
    void warmApiCompatibilityState();
  }, []);

  return (
    <>
      <Outlet />
    </>
  );
}