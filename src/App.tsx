// AmitySpirit Companion — ルートコンポーネント
// ウィンドウレイアウト・状態管理・ドラッグ制御・アップデーターの統合点

import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCompanionState } from "./hooks/useCompanionState";
import { useDrag } from "./hooks/useDrag";
import { useWander } from "./hooks/useWander";
import { useUpdater } from "./systems/updater/useUpdater";
import { Character } from "./components/Character";
import { SpeechBubble } from "./components/SpeechBubble";
import { UpdateBadge } from "./components/UpdateBadge";
import { ContextMenu } from "./components/ContextMenu";
import { DebugOverlay } from "./components/DebugOverlay";
import { DEFAULT_CHARACTER_CONFIG } from "./types/companion";
import "./styles/index.css";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export default function App() {
  const { state, speechText, onCharacterClick, triggerSpeak } = useCompanionState();
  const { onDragStart, isDragging } = useDrag();
  useWander(state);
  const { updateAvailable, installing, installUpdate } = useUpdater();
  const containerRef = useRef<HTMLDivElement>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
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
      triggerSpeak(`v${updateAvailable.version} 来てるよ`);
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
      onContextMenu={handleContextMenu}
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
          isDragging={isDragging}
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

      {/* 右クリックメニュー */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
