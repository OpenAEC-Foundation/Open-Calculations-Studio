import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n/config";
import App from "./App";
import "./themes.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
