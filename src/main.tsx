import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/500.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "@fontsource/barlow-semi-condensed/700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installE2EBridgeIfConfigured } from "./test/e2eBridge";
import "./index.css";

installE2EBridgeIfConfigured();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
