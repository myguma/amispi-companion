// AmitySpirit Companion — ルートコンポーネント
// ウィンドウレイアウト・状態管理・ドラッグ制御の統合点

import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useCompanionState } from "./hooks/useCompanionState";
import { useDrag } from "./hooks/useDrag";
import { Character } from "./components/Character";
import { SpeechBubble } from "./components/SpeechBubble";
import { DebugOverlay } from "./components/DebugOverlay";
import { DEFAULT_CHARACTER_CONFIG } from "./types/companion";
import "./styles/index.css";

// Tauri環境かブラウザ環境かを判定
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export default function App() {
  const { state, speechText, onCharacterClick } = useCompanionState();
  const { onDragStart } = useDrag();
  const containerRef = useRef<HTMLDivElement>(null);

  // ──────────────────────────────────────────
  // クリックスルー制御
  // マウスがキャラクターエリアにある場合のみイベントを受け取る
  // ──────────────────────────────────────────
  useEffect(() => {
    if (!isTauri) return;

    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = () => {
      void invoke("set_ignore_cursor_events", { ignore: false });
    };
    const handleMouseLeave = () => {
      void invoke("set_ignore_cursor_events", { ignore: true });
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    // 初期状態: 透明エリアはクリックスルー
    void invoke("set_ignore_cursor_events", { ignore: true });

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // ──────────────────────────────────────────
  // ウィンドウフォーカス制御
  // 起動時にフォーカスを奪わない
  // ──────────────────────────────────────────
  useEffect(() => {
    if (!isTauri) return;
    const win = getCurrentWindow();
    void win.setAlwaysOnTop(true);
  }, []);

  return (
    // 外側コンテナ: ウィンドウ全体 (200x300)
    <div
      style={{
        width: 200,
        height: 300,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 16,
        position: "relative",
      }}
    >
      {/* デバッグオーバーレイ (開発時のみ) */}
      <DebugOverlay state={state} speechText={speechText} />

      {/* 吹き出しエリア */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          padding: "0 8px",
        }}
      >
        <SpeechBubble text={speechText} />
      </div>

      {/* キャラクター本体 — ドラッグハンドルを兼ねる */}
      <div
        ref={containerRef}
        className="drag-handle"
        onMouseDown={onDragStart}
        style={{ position: "relative" }}
      >
        <Character
          state={state}
          config={DEFAULT_CHARACTER_CONFIG}
          onClick={onCharacterClick}
        />
      </div>
    </div>
  );
}
