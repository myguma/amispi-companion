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

  // ドラッグ開始で reaction を発火 / ドラッグ終了後に位置を保存
  const prevIsDragging = useRef(false);
  useEffect(() => {
    const wasDragging = prevIsDragging.current;
    prevIsDragging.current = isDragging;

    if (isDragging && !wasDragging) {
      triggerDragReaction();
    }

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

  // 吹き出し表示状態に応じてウィンドウをリサイズ
  // 非表示: 200×180 (キャラのみ) / 表示中: 200×310 (吹き出し+キャラ)
  // キャラ底辺を固定してリサイズするため、画面上の位置は変わらない
  const hasSpeech = !!(tinyText || speechText);
  const hasSpeechRef = useRef(hasSpeech);
  useEffect(() => { hasSpeechRef.current = hasSpeech; }, [hasSpeech]);

  useEffect(() => {
    if (!isTauri) return;
    void invoke("resize_companion", { speechVisible: hasSpeech });
  }, [hasSpeech]);

  const CHAR_H = 180;
  const BUBBLE_H = 130;
  const scale = settings.sizeScale ?? 1;
  const windowW = Math.round(200 * scale);
  const windowH = Math.round((hasSpeech ? CHAR_H + BUBBLE_H : CHAR_H) * scale);

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
        // 透明領域がバックグラウンドクリックを奪わないよう none に設定。
        // インタラクティブな要素 (キャラ/吹き出し) だけ auto で上書きする。
        pointerEvents: "none",
      }}
    >
      <DebugOverlay state={state} speechText={speechText} />

      {/* 吹き出し: コンテンツがある時だけ pointer-events: auto */}
      {(tinyText || speechText) && (
        <div style={{
          position: "absolute", top: 10, left: 0, right: 0,
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
        className="drag-handle"
        onMouseDown={(e) => { onDragStart(e); handlePttDown(); }}
        onMouseUp={handlePttUp}
        onMouseLeave={handlePttUp}
        onContextMenu={handleContextMenu}
        style={{ position: "relative", pointerEvents: "auto" }}
      >
        <Character
          state={state}
          config={DEFAULT_CHARACTER_CONFIG}
          onClick={handleCharacterClick}
          isDragging={isDragging}
          facingRight={facingRight}
          voiceUIState={voiceUIState}
        />
      </div>

      {updateAvailable && (
        <div style={{ pointerEvents: "auto" }}>
          <UpdateBadge version={updateAvailable.version} installing={installing} onInstall={installUpdate} />
        </div>
      )}

      {contextMenu && (
        <div style={{ pointerEvents: "auto" }}>
          <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
        </div>
      )}
    </div>
  );
}
