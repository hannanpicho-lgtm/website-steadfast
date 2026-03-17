import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";

type RouteModule = {
  default: ComponentType;
};

const lazyRoute = (importer: () => Promise<RouteModule>) => async () => {
  const module = await importer();

  return {
    Component: module.default,
  };
};

export const router = createBrowserRouter([
  {
    path: "/",
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