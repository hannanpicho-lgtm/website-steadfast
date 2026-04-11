import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('chunkloaderror') ||
    msg.includes('importing a module script failed')
  );
}

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return 'Page not found.';
    if (error.status === 403) return 'You do not have permission to view this page.';
    return 'This page is temporarily unavailable.';
  }
  return '';
}

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  // Log for debugging without exposing details to the UI.
  useEffect(() => {
    console.error('[RouteErrorBoundary]', error);
  }, [error]);

  // If this is a stale-chunk error (new deploy invalidated old JS bundles),
  // auto-reload once — the fresh chunks will load correctly after a reload.
  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    const reloadKey = `route-error-reload:${window.location.pathname}`;
    if (window.sessionStorage.getItem(reloadKey) === '1') return;
    window.sessionStorage.setItem(reloadKey, '1');
    window.location.reload();
  }, [error]);

  return (
    <div className="min-h-screen bg-[#1a1f2e] text-gray-100 flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-red-400/30 bg-[#252b3d] p-8 shadow-xl">
        <div className="flex items-center gap-3 text-red-300 mb-4">
          <AlertTriangle size={24} />
          <h1 className="text-xl font-semibold">We hit a temporary page issue</h1>
        </div>
        <p className="text-gray-200 mb-2">Your session is still active. You can try reloading or continue from another page.</p>
        {message ? <p className="text-sm text-gray-400 break-words mb-1">{message}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-lg bg-[#00D9FF] text-[#1a1f2e] px-4 py-2 font-semibold hover:bg-[#14c6e5] transition-colors"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          <Link
            to="/home"
            className="rounded-lg border border-[#00D9FF]/50 text-[#8be9ff] px-4 py-2 font-semibold hover:bg-[#00D9FF]/10 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-gray-500 text-gray-200 px-4 py-2 font-semibold hover:bg-gray-700/40 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}