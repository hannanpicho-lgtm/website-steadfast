
  import { StrictMode } from "react";
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { installServerAuthFetchBridge } from "./app/services/serverAuth";
  import "./styles/index.css";

  installServerAuthFetchBridge();

  // Catch async errors outside the React tree
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[Unhandled Promise]", event.reason);
  });

  // Register service worker for PWA / offline shell caching.
  // Runs after the page has loaded so it never delays the initial render.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          // SW registration is best-effort — failure is silent and harmless.
        });
    });
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  // Report Core Web Vitals (LCP, CLS, INP, FCP, TTFB)
  import('./app/utils/reportWebVitals').then(({ reportWebVitals }) => reportWebVitals());
  