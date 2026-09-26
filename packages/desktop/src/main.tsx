import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n/config";
import App from "./App";
import { useProjectStore } from "./store/projectStore";
import { usePrintStore } from "./store/printStore";
import { useBureauStore } from "./store/bureauProfiel";
import { leesProjectBestand } from "./store/projectBestand";
import "./themes.css";
import "./App.css";

// Alleen tijdens ontwikkeling: de stores op `window`, voor scripts/rapport-pdf.mjs.
// Dat script stuurt een headless browser aan en moet dezelfde stores raken als
// de app. Zelf importeren via een URL gaat mis zodra Vite een module heeft
// vernieuwd: de app laadt dan `…/projectStore.ts?t=…`, een losse kopie met een
// eigen store. In een productiebouw valt dit blok weg.
if (import.meta.env.DEV) {
  window.__ocs = { useProjectStore, usePrintStore, useBureauStore, leesProjectBestand };
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
