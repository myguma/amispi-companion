// 設定ウィンドウのルートコンポーネント
// ?page=settings で開かれる独立したウィンドウ

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TransparencyPage } from "./pages/TransparencyPage";
import { BehaviorPage } from "./pages/BehaviorPage";
import { AIPage } from "./pages/AIPage";
import { VoicePage } from "./pages/VoicePage";
import { MemoryPage } from "./pages/MemoryPage";

type Tab = "transparency" | "behavior" | "ai" | "voice" | "memory";

const TABS: { id: Tab; label: string }[] = [
  { id: "transparency", label: "無明が見ているもの" },
  { id: "behavior",     label: "動作設定" },
  { id: "ai",           label: "AI エンジン" },
  { id: "voice",        label: "音声" },
  { id: "memory",       label: "記憶" },
];

export function SettingsApp() {
  const [tab, setTab] = useState<Tab>("transparency");
  const [version, setVersion] = useState<string>("…");

  useEffect(() => {
    invoke<string>("get_app_version").then(setVersion).catch(() => setVersion("?"));
  }, []);

  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, 'Hiragino Sans', 'Yu Gothic UI', sans-serif",
      color: "#2a2040",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#fafafa",
    }}>
      {/* ヘッダー */}
      <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #ebe6ff" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#3a2870" }}>
            AmitySpirit 設定
          </h1>
          <span style={{ fontSize: 11, color: "#aaa", fontVariantNumeric: "tabular-nums" }}>
            v{version}
          </span>
        </div>
        <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                border: "none",
                background: "none",
                cursor: "pointer",
                color: tab === t.id ? "#6a40d0" : "#888",
                borderBottom: `2px solid ${tab === t.id ? "#a890f0" : "transparent"}`,
                fontWeight: tab === t.id ? 600 : 400,
                transition: "color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {tab === "transparency" && <TransparencyPage />}
        {tab === "behavior"     && <BehaviorPage />}
        {tab === "ai"           && <AIPage />}
        {tab === "voice"        && <VoicePage />}
        {tab === "memory"       && <MemoryPage />}
      </div>

      {/* フッター */}
      <div style={{ padding: "10px 20px", borderTop: "1px solid #ebe6ff", fontSize: 11, color: "#bbb" }}>
        AmitySpirit Companion — いつでもタスクトレイから終了できます
      </div>
    </div>
  );
}
