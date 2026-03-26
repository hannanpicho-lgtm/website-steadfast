
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { installServerAuthFetchBridge } from "./app/services/serverAuth";
  import "./styles/index.css";

  installServerAuthFetchBridge();

  createRoot(document.getElementById("root")!).render(<App />);
  