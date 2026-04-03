import { Suspense } from "react";
import { RouterProvider } from "react-router";
import router from "./appRouter";
import { Toaster } from "./components/ui/sonner";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#1a1f2e] text-gray-300 flex items-center justify-center px-6">
      <div className="text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#00D9FF]/30 border-t-[#00D9FF] animate-spin" />
        <p className="text-sm uppercase tracking-[0.3em] text-[#00D9FF]">Loading route</p>
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