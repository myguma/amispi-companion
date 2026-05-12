// 右クリックコンテキストメニュー
// 終了 / オートスタート切替

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

const MENU_W = 150;
const MENU_H = 96;

export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const [autostart, setAutostart] = useState<boolean | null>(null);

  useEffect(() => {
    invoke<boolean>("is_autostart_enabled")
      .then(setAutostart)
      .catch(() => setAutostart(false));
  }, []);

  // ウィンドウ境界内に収める
  const left = Math.min(x, 200 - MENU_W - 4);
  const top = Math.min(y, 300 - MENU_H - 4);

  const handleSettings = () => {
    invoke("open_settings_window").catch(() => {});
    onClose();
  };

  const handleAutostart = () => {
    const next = !autostart;
    invoke("set_autostart", { enabled: next })
      .then(() => setAutostart(next))
      .catch(() => {});
    onClose();
  };

  const handleQuit = () => {
    invoke("quit_app").catch(() => {});
    onClose();
  };

  return (
    <>
      {/* 透明オーバーレイ: 外クリックで閉じる */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99,
        }}
        onMouseDown={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <div
        style={{
          position: "fixed",
          left,
          top,
          zIndex: 100,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(168,144,240,0.4)",
          borderRadius: 10,
          boxShadow: "0 4px 16px rgba(100,60,200,0.18)",
          padding: "4px 0",
          width: MENU_W,
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 12,
          color: "#3a2870",
          userSelect: "none",
        }}
      >
        <button
          onClick={handleSettings}
          style={menuItemStyle}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(168,144,240,0.15)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          設定...
        </button>
        <div style={{ height: 1, background: "rgba(168,144,240,0.2)", margin: "3px 8px" }} />
        <button
          onClick={handleAutostart}
          style={menuItemStyle}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(168,144,240,0.15)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          {autostart === null ? "..." : autostart ? "✓ 自動起動 ON" : "　自動起動 OFF"}
        </button>
        <div style={{ height: 1, background: "rgba(168,144,240,0.2)", margin: "3px 8px" }} />
        <button
          onClick={handleQuit}
          style={menuItemStyle}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(220,60,60,0.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          終了
        </button>
      </div>
    </>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "6px 14px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "inherit",
  fontSize: "inherit",
  fontFamily: "inherit",
  transition: "background 0.12s",
};
