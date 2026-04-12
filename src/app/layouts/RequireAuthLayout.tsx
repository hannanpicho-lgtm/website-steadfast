import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { verifyAndRestoreSession } from '../services/serverAuth';

// In-memory cache so navigating between auth-guarded pages doesn't re-verify
// every mount. The session is re-checked only if the cache is stale (>60s).
let cachedAuthResult: { username: string; checkedAt: number } | null = null;
const AUTH_CACHE_TTL_MS = 60_000;

export default function RequireAuthLayout() {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>(() => {
    // If we verified recently, skip the spinner entirely
    if (cachedAuthResult && Date.now() - cachedAuthResult.checkedAt < AUTH_CACHE_TTL_MS) {
      return 'authorized';
    }
    return 'checking';
  });

  useEffect(() => {
    // Already authorized from cache — skip network call
    if (status === 'authorized' && cachedAuthResult && Date.now() - cachedAuthResult.checkedAt < AUTH_CACHE_TTL_MS) {
      return;
    }

    let isMounted = true;

    void (async () => {
      const restored = await verifyAndRestoreSession();
      if (!isMounted) return;
      if (restored) {
        cachedAuthResult = { username: restored, checkedAt: Date.now() };
        setStatus('authorized');
      } else {
        cachedAuthResult = null;
        setStatus('unauthorized');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-[#c8956c]/30 border-t-[#c8956c] animate-spin" />
        </div>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return <Navigate to="/login" replace state={buildLoginRedirectState(location.pathname, { authReason: 'sign-in-required' })} />;
  }

  return <Outlet />;
}
