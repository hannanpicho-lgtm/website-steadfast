import { Link } from 'react-router';

export default function RouteLoadFallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center px-6" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#141414] p-8 shadow-xl text-center" style={{ background: '#141414' }}>
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
