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
import {
  CHARACTER_BOTTOM_PAD,
  CHARACTER_SPRITE_H,
  CHARACTER_SPRITE_W,
  COMPANION_BUBBLE_H,
  COMPANION_COMPACT_H,
  COMPANION_WINDOW_W,
  CONTEXT_MENU_H,
  SPEECH_BUBBLE_GAP,
  UPDATE_BADGE_GAP,
  normalizeCompanionScale,
} from "./constants/companionLayout";
import { useSettings } from "./settings/store";
import { cryEngine } from "./companion/audio/FileCryEngine";
import { getLastAIResult, subscribeLastAIResult } from "./companion/ai/AIProviderManager";
import { useObservationReactions } from "./companion/reactions/useObservationReactions";
import type { ObservationSnapshot } from "./observation/types";
import { EMPTY_SNAPSHOT } from "./observation/types";
import { useVoiceRecorder } from "./systems/voice/useVoiceRecorder";
import "./styles/index.css";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const OBSERVE_INTERVAL_MS = 30_000;

export default function App() {
  const [settings] = useSettings();

  // 観測スナップショット — useCompanionState より先に宣言して fullscreen を渡す
  const [snapshot, setSnapshot] = useState<ObservationSnapshot>(EMPTY_SNAPSHOT);
  const isFullscreen = snapshot.fullscreenLikely;

  const {
    state, speechText, onCharacterClick, triggerSpeak, triggerDragReaction,
    requestVoiceFromBlob, voiceListeningStart, voiceRecordingError,
    voiceUIState,
  } = useCompanionState(
    undefined,
    settings.autonomousSpeechEnabled,
    isFullscreen,
    snapshot
  );
  const { onDragStart, isDragging, mouseDownRef } = useDrag();
  const { facingRight } = useWander(state, mouseDownRef);
  const { updateAvailable, installing, installUpdate } = useUpdater();
  const { tinyText } = useObservationReactions(snapshot, triggerSpeak);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [lastAIResult, setLastAIResult] = useState(getLastAIResult());
  const characterStageRef = useRef<HTMLDivElement | null>(null);
  const speechLayerRef = useRef<HTMLDivElement | null>(null);
  const updateBadgeRef = useRef<HTMLDivElement | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // push-to-talk 長押し (500ms 以上) — 実録音パイプライン
  // Phase 6b-real: 長押し 500ms で getUserMedia → 録音開始 → 離したら停止 → STT → 返答
  const pttTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pttActiveRef = useRef(false);

  const { startRecording, stopRecording } = useVoiceRecorder({
    maxDurationMs: settings.maxRecordingMs,
    onBlob: (blob) => void requestVoiceFromBlob(blob),
    onError: (err) => voiceRecordingError(err),
  });

  const handlePttDown = useCallback(() => {
    if (!settings.voiceInputEnabled || settings.voiceInputMode !== "pushToTalk") return;
    pttTimerRef.current = setTimeout(() => {
      pttActiveRef.current = true;
      voiceListeningStart();   // UI: voiceListening へ
      void startRecording();   // getUserMedia → 録音開始
    }, 500);
  }, [settings.voiceInputEnabled, settings.voiceInputMode, voiceListeningStart, startRecording]);

  const handlePttUp = useCallback(() => {
    if (pttTimerRef.current) {
      clearTimeout(pttTimerRef.current);
      pttTimerRef.current = null;
    }
    if (pttActiveRef.current) {
      pttActiveRef.current = false;
      stopRecording(); // 録音停止 → onstop → onBlob → requestVoiceFromBlob
    }
  }, [stopRecording]);

  // ドラッグ開始時に PTT タイマーをキャンセルし、誤発火を防ぐ
  useEffect(() => {
    if (isDragging && pttTimerRef.current) {
      clearTimeout(pttTimerRef.current);
      pttTimerRef.current = null;
      pttActiveRef.current = false;
    }
  }, [isDragging]);

  useEffect(() => {
    const unsub = subscribeLastAIResult(() => setLastAIResult({ ...getLastAIResult() }));
    return unsub;
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

  // ドラッグ終了後に位置を保存し、drag reaction を少し遅らせて発火する。
  // drag中に speech resize が走ると OS ネイティブドラッグと window resize が競合する。
  const prevIsDragging = useRef(false);
  useEffect(() => {
    const wasDragging = prevIsDragging.current;
    prevIsDragging.current = isDragging;

    // ドラッグ終了 → ウィンドウ位置を保存
    // resize_companion がキャラ底辺を固定して動的リサイズするため、
    // 保存する y はウィンドウ上端 (pos.y) をそのまま使う
    if (!isDragging && wasDragging && isTauri) {
      // startDragging() は OS ネイティブなので少し待ってから位置を取得する
      setTimeout(async () => {
        try {
          const pos = await getCurrentWindow().outerPosition();
          await invoke("save_window_position", { x: pos.x, y: pos.y });
        } catch { /* サイレント */ }
      }, 100);
    }

    if (!isDragging && wasDragging) {
      setTimeout(() => triggerDragReaction(), 160);
    }
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

  // 吹き出し表示状態に応じてウィンドウをリサイズ。
  // React の sizeScale と Rust 側 window bounds を必ず同じ値に揃える。
  const hasSpeech = !!(tinyText || speechText);
  const scale = normalizeCompanionScale(settings.sizeScale);

  useEffect(() => {
    if (!isTauri) return;
    void invoke("resize_companion", { speechVisible: hasSpeech, sizeScale: scale });
  }, [hasSpeech, scale]);

  const characterW = Math.round(CHARACTER_SPRITE_W * scale);
  const characterH = Math.round(CHARACTER_SPRITE_H * scale);
  const windowW = Math.round(COMPANION_WINDOW_W * scale);
  const windowH = Math.round((hasSpeech ? COMPANION_COMPACT_H + COMPANION_BUBBLE_H : COMPANION_COMPACT_H) * scale);
  const bottomPad = Math.round(CHARACTER_BOTTOM_PAD * scale);
  const speechBubbleGap = Math.round(SPEECH_BUBBLE_GAP * scale);
  const updateBadgeGap = Math.round(UPDATE_BADGE_GAP * scale);
  const menuSafeH = Math.round(CONTEXT_MENU_H * scale);
  const updateBadgeVisible = updateAvailable !== null || installing;

  const contextMenuVisible = contextMenu !== null;

  useEffect(() => {
    if (!isTauri) return;
    void invoke("set_context_menu_visible", { visible: contextMenuVisible });
    return () => {
      void invoke("set_context_menu_visible", { visible: false });
    };
  }, [contextMenuVisible]);

  useEffect(() => {
    if (!isTauri) return;
    void invoke("set_update_badge_visible", { visible: updateBadgeVisible });
    return () => {
      void invoke("set_update_badge_visible", { visible: false });
    };
  }, [updateBadgeVisible]);

  useEffect(() => {
    if (!(import.meta.env.DEV || settings.debugModeEnabled)) return;

    const logLayout = (phase: string) => {
      const stageRect = characterStageRef.current?.getBoundingClientRect();
      const speechLayerRect = speechLayerRef.current?.getBoundingClientRect();
      const updateBadgeRect = updateBadgeRef.current?.getBoundingClientRect();
      const wrapperRect = document.querySelector(".character-wrapper")?.getBoundingClientRect();
      const viewport = window.visualViewport;
      console.log("[companion-layout-debug]", {
        phase,
        hasSpeech,
        isDragging,
        scale,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        visualViewport: viewport ? { width: viewport.width, height: viewport.height } : null,
        computed: { windowW, windowH, characterW, characterH, bottomPad, speechBubbleGap },
        speechLayerRect,
        updateBadgeRect,
        stageRect,
        wrapperRect,
        lastAIResult,
      });
    };

    const raf = requestAnimationFrame(() => logLayout("raf"));
    const timer = setTimeout(() => logLayout("timeout-120ms"), 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [hasSpeech, isDragging, scale, windowW, windowH, characterW, characterH, bottomPad, speechBubbleGap, settings.debugModeEnabled, lastAIResult]);

  return (
    <div
      className="companion-root"
      style={{
        width: "100vw",
        height: "100vh",
        background: "transparent",
        position: "relative",
        overflow: "hidden",
        // 透明領域がバックグラウンドクリックを奪わないよう none に設定。
        // インタラクティブな要素 (キャラ/吹き出し) だけ auto で上書きする。
        pointerEvents: "none",
      }}
    >
      <DebugOverlay
        enabled={settings.debugModeEnabled}
        state={state}
        speechText={speechText}
        hasSpeech={hasSpeech}
        isDragging={isDragging}
        scale={scale}
        windowW={windowW}
        windowH={windowH}
        characterW={characterW}
        characterH={characterH}
        bottomPad={bottomPad}
        speechBubbleGap={speechBubbleGap}
        updateAvailableVersion={updateAvailable?.version ?? null}
        installing={installing}
        lastAIResult={lastAIResult}
        characterStageRef={characterStageRef}
        speechLayerRef={speechLayerRef}
        updateBadgeRef={updateBadgeRef}
      />

      {/* 吹き出し: コンテンツがある時だけ pointer-events: auto */}
      {(tinyText || speechText) && (
        <div ref={speechLayerRef} style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: bottomPad + characterH + speechBubbleGap,
          display: "flex", justifyContent: "center", padding: "0 8px",
          pointerEvents: "auto",
        }}>
          {tinyText ? (
            <TinyWhisper text={tinyText} />
          ) : (
            <SpeechBubble text={speechText} />
          )}
        </div>
      )}

      <div
        ref={characterStageRef}
        className="character-stage"
        style={{
          width: characterW,
          height: characterH,
          position: "absolute",
          left: "50%",
          bottom: bottomPad,
          transform: "translateX(-50%)",
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <Character
          state={state}
          config={DEFAULT_CHARACTER_CONFIG}
          width={characterW}
          height={characterH}
          onClick={handleCharacterClick}
          isDragging={isDragging}
          facingRight={facingRight}
          voiceUIState={voiceUIState}
        />
        <div
          className="character-hit-target drag-handle"
          onMouseDown={(e) => { onDragStart(e); handlePttDown(); }}
          onMouseUp={handlePttUp}
          onMouseLeave={handlePttUp}
          onClick={handleCharacterClick}
          onContextMenu={handleContextMenu}
          aria-label="character"
        />
      </div>

      {updateAvailable && (
        <div ref={updateBadgeRef} style={{
          position: "absolute",
          left: "50%",
          bottom: bottomPad + characterH + updateBadgeGap,
          transform: "translateX(-50%)",
          pointerEvents: "auto",
        }}>
          <UpdateBadge version={updateAvailable.version} installing={installing} onInstall={installUpdate} />
        </div>
      )}

      {contextMenu && (
        <div style={{ pointerEvents: "auto" }}>
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            windowWidth={windowW}
            windowHeight={Math.max(windowH, menuSafeH)}
            onClose={() => setContextMenu(null)}
          />
        </div>
      )}
    </div>
  );
}
