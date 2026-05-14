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
  COMPANION_COMPACT_H,
  COMPANION_WINDOW_W,
  CONTEXT_MENU_H,
  SPEECH_BUBBLE_GAP,
  UPDATE_BADGE_BOTTOM,
  UPDATE_BADGE_HIT_H,
  UPDATE_BADGE_HIT_W,
  UPDATE_BADGE_RIGHT,
  normalizeCompanionScale,
} from "./constants/companionLayout";
import { useSettings } from "./settings/store";
import { cryEngine } from "./companion/audio/FileCryEngine";
import { getLastAIResult, subscribeLastAIResult } from "./companion/ai/AIProviderManager";
import { useObservationReactions } from "./companion/reactions/useObservationReactions";
import type { ObservationSnapshot } from "./observation/types";
import { EMPTY_SNAPSHOT } from "./observation/types";
import { addObservationEvent, pruneObservationTimeline } from "./systems/observation/observationTimelineStore";
import { useVoiceRecorder } from "./systems/voice/useVoiceRecorder";
import { subscribeTextMessages } from "./systems/conversation/textMessageBus";
import "./styles/index.css";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const OBSERVE_INTERVAL_MS = 30_000;

export default function App() {
  const [settings] = useSettings();

  // 観測スナップショット — useCompanionState より先に宣言して fullscreen を渡す
  const [snapshot, setSnapshot] = useState<ObservationSnapshot>(EMPTY_SNAPSHOT);
  const isFullscreen = snapshot.fullscreenLikely;

  const {
    state, speechText, spriteEmotion, onCharacterClick, triggerSpeak, triggerDragReaction,
    requestVoiceFromBlob, requestTextMessage, voiceListeningStart, voiceRecordingError,
    voiceUIState,
  } = useCompanionState(
    undefined,
    settings.autonomousSpeechEnabled,
    isFullscreen,
    snapshot
  );
  const { onDragStart, isDragging, mouseDownRef } = useDrag();
  const { facingRight } = useWander(
    state,
    mouseDownRef,
    settings.autonomousMovementEnabled,
    settings.movementFrequency
  );
  const { updateAvailable, installing, installUpdate } = useUpdater();
  const { tinyText } = useObservationReactions(snapshot, triggerSpeak);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [lastAIResult, setLastAIResult] = useState(getLastAIResult());
  const onboardingOpenRequestedRef = useRef(false);
  const prevSnapshotRef = useRef<ObservationSnapshot | null>(null);
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

  useEffect(() => {
    return subscribeTextMessages((payload) => {
      void requestTextMessage(payload.text);
    });
  }, [requestTextMessage]);

  useEffect(() => {
    if (!isTauri || settings.onboardingCompleted || onboardingOpenRequestedRef.current) return;
    onboardingOpenRequestedRef.current = true;
    void invoke("open_settings_window");
  }, [settings.onboardingCompleted]);

  // 起動時にObservation Timelineの古いイベントを削除
  useEffect(() => {
    pruneObservationTimeline(settings.memoryRetentionDays);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    const handled = onCharacterClick();
    if (handled && settings.cryEnabled) {
      void cryEngine.play({ id: "touch", synth: { kind: "surprised", durationMs: 150 } });
    }
  }, [onCharacterClick, settings.cryEnabled]);

  // ドラッグ終了後に位置を保存し、drag reaction を少し遅らせて発火する。
  // drag中に発話状態が切り替わっても window height は変えないが、反応は掴み終えてから出す。
  const prevIsDragging = useRef(false);
  useEffect(() => {
    const wasDragging = prevIsDragging.current;
    prevIsDragging.current = isDragging;

    // ドラッグ終了 → ウィンドウ位置を保存
    // 保存する y はウィンドウ上端 (pos.y) をそのまま使う。
    // v0.1.48 以降は companion window を常時 compact height で扱う。
    if (!isDragging && wasDragging && isTauri) {
      // startDragging() は OS ネイティブなので少し待ってから位置を取得する
      setTimeout(async () => {
        try {
          const pos = await getCurrentWindow().outerPosition();
          await invoke("save_window_position", { x: pos.x, y: pos.y });
        } catch { /* サイレント */ }
      }, 100);
    }

    if (!isDragging && wasDragging && voiceUIState !== "voiceListening" && voiceUIState !== "voiceTranscribing" && voiceUIState !== "voiceResponding") {
      setTimeout(() => triggerDragReaction(), 160);
    }
  }, [isDragging, triggerDragReaction, voiceUIState]);

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

        // スナップショット変化からObservationイベントを生成
        const prev = prevSnapshotRef.current;
        prevSnapshotRef.current = snap;

        if (prev) {
          // アプリ変化
          const prevCat = prev.activeApp?.category;
          const newCat = snap.activeApp?.category;
          if (prevCat !== newCat && newCat && newCat !== "self") {
            addObservationEvent("active_app_changed", `${newCat}に切り替え`, { signalKind: "app_category" });
          }

          // アイドル開始 (5分閾値)
          const prevIdleMs = prev.idle.idleMs;
          const newIdleMs = snap.idle.idleMs;
          if (prevIdleMs < 5 * 60 * 1000 && newIdleMs >= 5 * 60 * 1000) {
            addObservationEvent("idle_started", "5分以上操作なし", { signalKind: "idle" });
          }

          // 操作再開
          if (prevIdleMs >= 5 * 60 * 1000 && newIdleMs < 30 * 1000) {
            addObservationEvent("user_returned", "操作再開", { signalKind: "idle" });
          }

          // メディア開始/停止
          const prevMedia = prev.media?.audioLikelyActive;
          const newMedia = snap.media?.audioLikelyActive;
          if (!prevMedia && newMedia) {
            addObservationEvent("media_started", snap.media?.mediaKind === "music" ? "音楽が始まった" : "メディア再生中", { signalKind: "media" });
          } else if (prevMedia && !newMedia) {
            addObservationEvent("media_stopped", "メディア停止", { signalKind: "media" });
          }

          // folder signals change (downloads)
          const prevDlSignals = prev.folders.downloads?.filenameSignals ?? [];
          const newDlSignals = snap.folders.downloads?.filenameSignals ?? [];
          const addedSignals = newDlSignals.filter((s: string) => !prevDlSignals.includes(s));
          if (addedSignals.length > 0) {
            addObservationEvent("folder_signal_changed", `Downloadsに新しい気配: ${addedSignals.join(", ")}`, { signalKind: "folder_signals" });
          }
        }
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
    if (updateAvailable) triggerSpeak(`v${updateAvailable.version} 来てるよ`, { source: "update", priority: 80 });
  }, [updateAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  // companion window は常時 compact height で維持する。
  // hasSpeech は Rust 側 hit test の bubble 領域ON/OFFへ渡すだけにする。
  const hasSpeech = !!(tinyText || speechText);
  const scale = normalizeCompanionScale(settings.sizeScale);

  useEffect(() => {
    if (!isTauri) return;
    void invoke("resize_companion", { speechVisible: hasSpeech, sizeScale: scale });
  }, [hasSpeech, scale]);

  const characterW = Math.round(CHARACTER_SPRITE_W * scale);
  const characterH = Math.round(CHARACTER_SPRITE_H * scale);
  const windowW = Math.round(COMPANION_WINDOW_W * scale);
  const windowH = Math.round(COMPANION_COMPACT_H * scale);
  const bottomPad = Math.round(CHARACTER_BOTTOM_PAD * scale);
  const speechBubbleGap = Math.round(SPEECH_BUBBLE_GAP * scale);
  const updateBadgeRight = Math.round(UPDATE_BADGE_RIGHT * scale);
  const updateBadgeBottom = Math.round(UPDATE_BADGE_BOTTOM * scale);
  const updateBadgeW = Math.round(UPDATE_BADGE_HIT_W * scale);
  const updateBadgeH = Math.round(UPDATE_BADGE_HIT_H * scale);
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
        suspended={contextMenuVisible}
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
          emotion={spriteEmotion}
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
          right: updateBadgeRight,
          bottom: updateBadgeBottom,
          width: updateBadgeW,
          height: updateBadgeH,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
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
