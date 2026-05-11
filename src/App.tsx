// AmitySpirit Companion — ルートコンポーネント
// ウィンドウレイアウト・状態管理・ドラッグ制御・アップデーターの統合点

import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useCompanionState } from "./hooks/useCompanionState";
import { useDrag } from "./hooks/useDrag";
import { useWander } from "./hooks/useWander";
import { useUpdater } from "./systems/updater/useUpdater";
import { Character } from "./components/Character";
import { SpeechBubble } from "./components/SpeechBubble";
import { UpdateBadge } from "./components/UpdateBadge";
import { DebugOverlay } from "./components/DebugOverlay";
import { DEFAULT_CHARACTER_CONFIG } from "./types/companion";
import "./styles/index.css";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export default function App() {
  const { state, speechText, onCharacterClick, triggerSpeak } = useCompanionState();
  const { onDragStart } = useDrag();
  useWander(state);
  const { updateAvailable, installing, installUpdate } = useUpdater();
  const containerRef = useRef<HTMLDivElement>(null);

  // ──────────────────────────────────────────
  // クリックスルー制御
  // ──────────────────────────────────────────
  useEffect(() => {
    if (!isTauri) return;
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = () => void invoke("set_ignore_cursor_events", { ignore: false });
    const handleMouseLeave = () => void invoke("set_ignore_cursor_events", { ignore: true });

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);
    void invoke("set_ignore_cursor_events", { ignore: true });

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // ──────────────────────────────────────────
  // 常時最前面
  // ──────────────────────────────────────────
  useEffect(() => {
    if (!isTauri) return;
    void getCurrentWindow().setAlwaysOnTop(true);
  }, []);

  // ──────────────────────────────────────────
  // アップデートが見つかったらキャラクターに一言言わせる
  // ──────────────────────────────────────────
  useEffect(() => {
    if (updateAvailable) {
      triggerSpeak(`v${updateAvailable.version} arrived.`);
    }
  }, [updateAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        width: 200,
        height: 300,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 12,
        position: "relative",
      }}
    >
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

      {/* キャラクター本体 */}
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

      {/* アップデートバッジ (利用可能なときのみ表示) */}
      {updateAvailable && (
        <UpdateBadge
          version={updateAvailable.version}
          installing={installing}
          onInstall={installUpdate}
        />
      )}
    </div>
  );
}
