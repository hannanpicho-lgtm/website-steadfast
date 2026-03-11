import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
        <p className="text-sm font-semibold tracking-wide text-[#0066b3]">404</p>
        <h1 className="mt-2 text-2xl font-bold text-[#1f2937]">Page not found</h1>
        <p className="mt-3 text-sm text-gray-600">
          The page you requested does not exist or the link is outdated.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/starting"
            className="px-4 py-2 rounded-lg bg-[#0066b3] text-white text-sm font-medium hover:bg-[#0052a3] transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
