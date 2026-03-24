import { Link } from 'react-router';

export default function RouteLoadFallback() {
  return (
    <div className="min-h-screen bg-[#1a1f2e] text-gray-100 flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-[#00D9FF]/30 bg-[#252b3d] p-8 shadow-xl text-center">
        <h1 className="text-xl font-semibold text-white">Reconnecting this page...</h1>
        <p className="text-sm text-gray-300 mt-2">
          We could not load this screen right now. Please continue using the app from a safe page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/home"
            className="rounded-lg bg-[#00D9FF] text-[#1a1f2e] px-4 py-2 font-semibold hover:bg-[#14c6e5] transition-colors"
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
