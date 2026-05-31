import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./index.css";

// Vercel Web Analytics — cookieless, no personal data (good fit for a kids'
// game). Only mounted on the real deployment; on localhost the insights script
// isn't served, so we skip it to avoid a 404 in dev/preview/tests.
const isLocalhost = /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?)/.test(window.location.hostname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {!isLocalhost && <Analytics />}
  </StrictMode>,
);
