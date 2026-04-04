
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

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  