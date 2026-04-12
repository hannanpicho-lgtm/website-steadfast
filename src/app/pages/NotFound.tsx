import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6" style={{ background: '#0a0a0a' }}>
      <div className="max-w-md w-full bg-[#141414] border border-white/[0.06] rounded-xl shadow-sm p-8 text-center">
        <p className="text-sm font-semibold tracking-wide text-[#0066b3]">404</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-100">Page not found</h1>
        <p className="mt-3 text-sm text-gray-400">
          The page you requested does not exist or the link is outdated.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            to="/home"
            className="px-4 py-2 rounded-lg bg-[#0066b3] text-white text-sm font-medium hover:bg-[#0052a3] transition-colors text-center"
          >
            Go to Home
          </Link>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg border border-white/[0.1] text-gray-300 text-sm font-medium hover:bg-white/[0.05] transition-colors text-center"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
