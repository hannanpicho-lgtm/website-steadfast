import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Starting from "./pages/Starting";
import Records from "./pages/Records";
import VipLevels from "./pages/VipLevels";
import Activity from "./pages/Activity";
import Withdrawal from "./pages/Withdrawal";
import Deposit from "./pages/Deposit";
import TermsConditions from "./pages/TermsConditions";
import Certificate from "./pages/Certificate";
import FAQs from "./pages/FAQs";
import About from "./pages/About";
import Profile from "./pages/Profile";
import ConnectWallet from "./pages/ConnectWallet";
import Logout from "./pages/Logout";
import Admin from "./pages/Admin";
import Support from "./pages/Support";
import DeploymentStatus from "./pages/DeploymentStatus";
import RootLayout from "./layouts/RootLayout";
import RequireAuthLayout from "./layouts/RequireAuthLayout";
import RequireAdminLayout from "./layouts/RequireAdminLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: Home,
      },
      {
        path: "login",
        Component: Login,
      },
      {
        path: "signup",
        Component: Signup,
      },
      {
        path: "forgot-password",
        Component: ForgotPassword,
      },
      {
        Component: RequireAuthLayout,
        children: [
          {
            path: "starting",
            Component: Starting,
          },
          {
            path: "records",
            Component: Records,
          },
          {
            path: "vip-levels",
            Component: VipLevels,
          },
          {
            path: "activity",
            Component: Activity,
          },
          {
            path: "withdrawal",
            Component: Withdrawal,
          },
          {
            path: "deposit",
            Component: Deposit,
          },
          {
            path: "profile",
            Component: Profile,
          },
          {
            path: "connect-wallet",
            Component: ConnectWallet,
          },
          {
            path: "logout",
            Component: Logout,
          },
          {
            path: "support",
            Component: Support,
          },
        ],
      },
      {
        Component: RequireAdminLayout,
        children: [
          {
            path: "admin",
            Component: Admin,
          },
        ],
      },
      {
        path: "terms-conditions",
        Component: TermsConditions,
      },
      {
        path: "certificate",
        Component: Certificate,
      },
      {
        path: "faqs",
        Component: FAQs,
      },
      {
        path: "about",
        Component: About,
      },
      {
        path: "deployment-status",
        Component: DeploymentStatus,
      },
    ],
  },
]);