import { Suspense } from "react";
import { RouterProvider } from "react-router";
import router from "./appRouter";
import { Toaster } from "./components/ui/sonner";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 flex items-center justify-center px-6" style={{ background: '#0a0a0a' }}>
      <div className="text-center space-y-3">
        <div className="mx-auto h-8 w-8 rounded-full border-2 border-[#c8956c]/30 border-t-[#c8956c] animate-spin" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster position="top-center" richColors />
    </AppErrorBoundary>
  );
}