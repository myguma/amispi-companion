import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SettingsApp } from "./settings/SettingsApp";

// settings window は ?page=settings で識別する
const isSettings = new URLSearchParams(window.location.search).get("page") === "settings";

// 設定ウィンドウでは右クリックを許可 (コピーなどのため)
if (!isSettings) {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isSettings ? <SettingsApp /> : <App />}
  </React.StrictMode>
);
