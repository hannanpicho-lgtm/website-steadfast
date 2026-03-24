import { AlertTriangle } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`.trim();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while loading this page.';
}

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-[#1a1f2e] text-gray-100 flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-red-400/30 bg-[#252b3d] p-8 shadow-xl">
        <div className="flex items-center gap-3 text-red-300 mb-4">
          <AlertTriangle size={24} />
          <h1 className="text-xl font-semibold">We hit a temporary page issue</h1>
        </div>
        <p className="text-gray-200 mb-2">Your session is still active. Please continue from another page.</p>
        <p className="text-sm text-gray-400 break-words">Details: {message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/home"
            className="rounded-lg bg-[#00D9FF] text-[#1a1f2e] px-4 py-2 font-semibold hover:bg-[#14c6e5] transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-[#00D9FF]/50 text-[#8be9ff] px-4 py-2 font-semibold hover:bg-[#00D9FF]/10 transition-colors"
          >
            Go To Login
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