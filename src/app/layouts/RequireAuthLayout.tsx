import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { verifyAndRestoreSession } from '../services/serverAuth';
import { useVersionCheck, type VersionCheckState } from '../hooks/useVersionCheck';

function StaleVersionBanner({ state, onDismiss }: { state: VersionCheckState; onDismiss: () => void }) {
  if (state.status !== 'stale' && state.status !== 'mismatch') {
    return null;
  }

  const message =
    state.status === 'mismatch'
      ? 'API service mismatch detected. Please refresh your browser.'
      : 'A newer deployment is available. Refresh for best experience.';

  return (
    <div
      role="alert"
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between gap-4 bg-amber-500/90 backdrop-blur-sm px-4 py-2.5 text-sm text-amber-950"
    >
      <span className="font-medium">{message}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => window.location.reload()}
          className="rounded bg-amber-900/20 hover:bg-amber-900/30 px-3 py-1 font-semibold transition-colors"
        >
          Refresh
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded px-2 py-1 hover:bg-amber-900/20 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function RequireAuthLayout() {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');
  const [versionState, setVersionState] = useState<VersionCheckState>({ status: 'pending' });
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const alertedCommitRef = useRef<string | null>(null);

  useVersionCheck((state) => {
    setVersionState(state);

    // One-time alert per unique stale/mismatch event
    if (state.status === 'stale') {
      const key = state.payload.commitSha ?? 'unknown';
      if (alertedCommitRef.current !== key) {
        alertedCommitRef.current = key;
        setBannerDismissed(false);
      }
    } else if (state.status === 'mismatch') {
      const key = `mismatch:${state.service}`;
      if (alertedCommitRef.current !== key) {
        alertedCommitRef.current = key;
        setBannerDismissed(false);
      }
    }
  });

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const restored = await verifyAndRestoreSession();
      if (!isMounted) return;
      setStatus(restored ? 'authorized' : 'unauthorized');
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#1a1f2e] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#00D9FF]/30 border-t-[#00D9FF] animate-spin" />
          <p className="text-sm tracking-widest text-[#00D9FF]/70 uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return <Navigate to="/login" replace state={buildLoginRedirectState(location.pathname, { authReason: 'sign-in-required' })} />;
  }

  const showBanner = !bannerDismissed && (versionState.status === 'stale' || versionState.status === 'mismatch');

  return (
    <>
      <Outlet />
      {showBanner && (
        <StaleVersionBanner state={versionState} onDismiss={() => setBannerDismissed(true)} />
      )}
    </>
  );
}
