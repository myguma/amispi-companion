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
import { TinyWhisper } from "./components/TinyWhisper";
import { DEFAULT_CHARACTER_CONFIG } from "./types/companion";
import { useSettings } from "./settings/store";
import { cryEngine } from "./companion/audio/FileCryEngine";
import { useObservationReactions } from "./companion/reactions/useObservationReactions";
import type { ObservationSnapshot } from "./observation/types";
import { EMPTY_SNAPSHOT } from "./observation/types";
import "./styles/index.css";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const OBSERVE_INTERVAL_MS = 30_000;

export default function App() {
  const [settings] = useSettings();

  // 観測スナップショット — useCompanionState より先に宣言して fullscreen を渡す
  const [snapshot, setSnapshot] = useState<ObservationSnapshot>(EMPTY_SNAPSHOT);
  const isFullscreen = snapshot.fullscreenLikely;
  const shouldSuppress = (settings.suppressWhenFullscreen && isFullscreen) || settings.doNotDisturb;

  const { state, speechText, onCharacterClick, triggerSpeak, triggerDragReaction } = useCompanionState(
    undefined,
    settings.autonomousSpeechEnabled,
    isFullscreen
  );
  const { onDragStart, isDragging, mouseDownRef } = useDrag();
  const { facingRight } = useWander(state, mouseDownRef);
  const { updateAvailable, installing, installUpdate } = useUpdater();
  const { tinyText } = useObservationReactions(snapshot, triggerSpeak);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

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

  // sleep 遷移のみ App 側で鳴らす (reaction trigger がない状態遷移)
  // waking / speaking の cry は reaction.cry で対応済み
  const prevStateRef = useRef<typeof state>("idle");
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (!settings.cryEnabled) return;
    if (state === "sleep" && prev !== "sleep") {
      void cryEngine.play({ id: "sleep", synth: { kind: "sleepy", durationMs: 400 } });
    }
  }, [state, settings.cryEnabled]);

  // クリック音: ユーザーgesture 文脈で即座に再生
  const handleCharacterClick = useCallback(() => {
    if (settings.cryEnabled) {
      void cryEngine.play({ id: "touch", synth: { kind: "surprised", durationMs: 150 } });
    }
    onCharacterClick();
  }, [onCharacterClick, settings.cryEnabled]);

  // ドラッグ開始で reaction を発火
  const prevIsDragging = useRef(false);
  useEffect(() => {
    if (isDragging && !prevIsDragging.current) {
      triggerDragReaction();
    }
    prevIsDragging.current = isDragging;
  }, [isDragging, triggerDragReaction]);

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
      } catch {
        // 権限エラー等 — サイレント失敗
      }
    };

    void poll();
    const timer = setInterval(poll, OBSERVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [settings.permissions]);

  // 更新通知
  useEffect(() => {
    if (updateAvailable) triggerSpeak(`v${updateAvailable.version} 来てるよ`);
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

      <div style={{ position: "absolute", top: 10, left: 0, right: 0, display: "flex", justifyContent: "center", padding: "0 8px" }}>
        <SpeechBubble text={speechText} />
      </div>

      <div className="drag-handle" onMouseDown={onDragStart} style={{ position: "relative" }}>
        <Character
          state={state}
          config={DEFAULT_CHARACTER_CONFIG}
          onClick={handleCharacterClick}
          isDragging={isDragging}
          facingRight={facingRight}
        />
      </div>

      {updateAvailable && (
        <UpdateBadge version={updateAvailable.version} installing={installing} onInstall={installUpdate} />
      )}

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
