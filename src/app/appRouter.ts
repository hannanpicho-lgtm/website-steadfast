import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import RouteLoadFallback from "./components/RouteLoadFallback";

type RouteModule = {
  default: ComponentType;
};

function isRecoverableRouteLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("loading chunk") ||
    message.includes("chunkloaderror") ||
    message.includes("importing a module script failed")
  );
}

const sleep = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

function tryOneTimeRouteReload(): boolean {
  const reloadKey = `route-reload:${window.location.pathname}`;
  if (window.sessionStorage.getItem(reloadKey) === '1') {
    return false;
  }

  window.sessionStorage.setItem(reloadKey, '1');
  window.location.reload();
  return true;
}

const lazyRoute = (importer: () => Promise<RouteModule>) => async () => {
  const maxRetries = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const module = await importer();
      window.sessionStorage.removeItem(`route-reload:${window.location.pathname}`);

      return {
        Component: module.default,
      };
    } catch (error) {
      lastError = error;
      if (!isRecoverableRouteLoadError(error) || attempt === maxRetries) {
        if (attempt === maxRetries && isRecoverableRouteLoadError(error)) {
          tryOneTimeRouteReload();
        }
        break;
      }
      await sleep(250 * (attempt + 1));
    }
  }

  console.error("Route lazy-load failed after retries:", lastError);

  return {
    Component: RouteLoadFallback,
  };
};

const router = createBrowserRouter([
  {
    path: "/",
    ErrorBoundary: RouteErrorBoundary,
    lazy: lazyRoute(() => import("./layouts/RootLayout")),
    children: [
      {
        index: true,
        lazy: lazyRoute(() => import("./pages/Home")),
      },
      {
        path: "login",
        lazy: lazyRoute(() => import("./pages/Login")),
      },
      {
        path: "signup",
        lazy: lazyRoute(() => import("./pages/Signup")),
      },
      {
        path: "forgot-password",
        lazy: lazyRoute(() => import("./pages/ForgotPassword")),
      },
      {
        lazy: lazyRoute(() => import("./layouts/RequireAuthLayout")),
        children: [
          {
            path: "home",
            lazy: lazyRoute(() => import("./pages/UserHome")),
          },
          {
            path: "starting",
            lazy: lazyRoute(() => import("./pages/Starting")),
          },
          {
            path: "records",
            lazy: lazyRoute(() => import("./pages/Records")),
          },
          {
            path: "vip-levels",
            lazy: lazyRoute(() => import("./pages/VipLevels")),
          },
          {
            path: "activity",
            lazy: lazyRoute(() => import("./pages/Activity")),
          },
          {
            path: "withdrawal",
            lazy: lazyRoute(() => import("./pages/Withdrawal")),
          },
          {
            path: "withdrawal-history",
            lazy: lazyRoute(() => import("./pages/WithdrawalHistory")),
          },
          {
            path: "deposit",
            lazy: lazyRoute(() => import("./pages/Deposit")),
          },
          {
            path: "profile",
            lazy: lazyRoute(() => import("./pages/Profile")),
          },
          {
            path: "connect-wallet",
            lazy: lazyRoute(() => import("./pages/ConnectWallet")),
          },
          {
            path: "logout",
            lazy: lazyRoute(() => import("./pages/Logout")),
          },
          {
            path: "support",
            lazy: lazyRoute(() => import("./pages/Support")),
          },
        ],
      },
      {
        lazy: lazyRoute(() => import("./layouts/RequireAdminLayout")),
        children: [
          {
            path: "admin",
            lazy: lazyRoute(() => import("./pages/Admin")),
          },
        ],
      },
      {
        path: "terms-conditions",
        lazy: lazyRoute(() => import("./pages/TermsConditions")),
      },
      {
        path: "certificate",
        lazy: lazyRoute(() => import("./pages/Certificate")),
      },
      {
        path: "faqs",
        lazy: lazyRoute(() => import("./pages/FAQs")),
      },
      {
        path: "about",
        lazy: lazyRoute(() => import("./pages/About")),
      },
      {
        path: "deployment-status",
        lazy: lazyRoute(() => import("./pages/DeploymentStatus")),
      },
      {
        path: "*",
        lazy: lazyRoute(() => import("./pages/NotFound")),
      },
    ],
  },
]);

export default router;
