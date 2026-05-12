// AmitySpirit Companion — ルートコンポーネント

import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
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
import { useSettings } from "./settings/store";
import { cryEngine } from "./companion/audio/FileCryEngine";
import type { ObservationSnapshot } from "./observation/types";
import { EMPTY_SNAPSHOT } from "./observation/types";
import "./styles/index.css";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// 観測ポーリング間隔 (ms)
const OBSERVE_INTERVAL_MS = 30_000;

export default function App() {
  const [settings] = useSettings();
  const { state, speechText, onCharacterClick, triggerSpeak } = useCompanionState(
    undefined,
    settings.autonomousSpeechEnabled
  );
  const { onDragStart, isDragging, mouseDownRef } = useDrag();
  const { facingRight } = useWander(state, mouseDownRef);
  const { updateAvailable, installing, installUpdate } = useUpdater();
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [snapshot, setSnapshot] = useState<ObservationSnapshot>(EMPTY_SNAPSHOT);
  const snapshotRef = useRef<ObservationSnapshot>(EMPTY_SNAPSHOT);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // 常時最前面
  useEffect(() => {
    if (!isTauri) return;
    void getCurrentWindow().setAlwaysOnTop(settings.alwaysOnTop);
  }, [settings.alwaysOnTop]);

  // 音量を CryEngine に反映
  useEffect(() => {
    cryEngine.setVolume(settings.cryEnabled ? settings.volume : 0);
  }, [settings.cryEnabled, settings.volume]);

  // 状態変化に応じて鳴き声を再生
  const prevStateRef = useRef<typeof state>("idle");
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (!settings.cryEnabled) return;
    if (state === "touched" && prev !== "touched") {
      void cryEngine.play({ id: "touch", synth: { kind: "surprised", durationMs: 120 } });
    } else if (state === "speaking" && prev !== "speaking") {
      void cryEngine.play({ id: "speak", synth: { kind: "soft_beep", durationMs: 200, pitch: 1.1 } });
    } else if (state === "waking" && prev !== "waking") {
      void cryEngine.play({ id: "wake", synth: { kind: "murmur", durationMs: 300 } });
    } else if (state === "sleep" && prev !== "sleep") {
      void cryEngine.play({ id: "sleep", synth: { kind: "sleepy", durationMs: 400 } });
    }
  }, [state, settings.cryEnabled]);

  // 観測ポーリング
  useEffect(() => {
    if (!isTauri) return;

    const poll = async () => {
      try {
        const snap = await invoke<ObservationSnapshot>("get_observation_snapshot", {
          perms: {
            level: settings.permissions.level,
            window_title_enabled: settings.permissions.windowTitleEnabled,
            folder_metadata_enabled: settings.permissions.folderMetadataEnabled,
            filenames_enabled: settings.permissions.filenamesEnabled,
            cloud_allowed: settings.permissions.cloudAllowed,
          },
        });
        setSnapshot(snap);
        snapshotRef.current = snap;
      } catch {
        // ネットワーク/権限エラー — サイレント失敗
      }
    };

    void poll();
    const timer = setInterval(poll, OBSERVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [settings.permissions]);

  // 全画面中は Wander も発話も止める
  const isFullscreen = snapshot.fullscreenLikely;
  const shouldSuppress =
    (settings.suppressWhenFullscreen && isFullscreen) ||
    settings.doNotDisturb;

  // 観測から提案トリガーを評価
  useEffect(() => {
    if (!isTauri || shouldSuppress || !settings.autonomousSpeechEnabled) return;
    const dl = snapshot.folders.downloads?.fileCount ?? 0;
    const dt = snapshot.folders.desktop?.fileCount ?? 0;
    if (dl > 20) triggerSpeak("Downloads、あとで見るものが増えてるかも");
    else if (dt > 15) triggerSpeak("Desktopに色々たまってきてる");
  }, [snapshot, shouldSuppress, settings.autonomousSpeechEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // 更新通知
  useEffect(() => {
    if (updateAvailable) {
      triggerSpeak(`v${updateAvailable.version} 来てるよ`);
    }
  }, [updateAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  const windowW = Math.round(200 * (settings.sizeScale ?? 1));
  const windowH = Math.round(300 * (settings.sizeScale ?? 1));

  return (
    <div
      style={{
        width: windowW,
        height: windowH,
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
      <div style={{ position: "absolute", top: 10, left: 0, right: 0, display: "flex", justifyContent: "center", padding: "0 8px" }}>
        <SpeechBubble text={speechText} />
      </div>

      {/* キャラクター本体 */}
      <div ref={containerRef} className="drag-handle" onMouseDown={onDragStart} style={{ position: "relative" }}>
        <Character
          state={state}
          config={DEFAULT_CHARACTER_CONFIG}
          onClick={onCharacterClick}
          isDragging={isDragging}
        />
      </div>

      {/* 更新バッジ */}
      {updateAvailable && (
        <UpdateBadge version={updateAvailable.version} installing={installing} onInstall={installUpdate} />
      )}

      {/* 右クリックメニュー */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
