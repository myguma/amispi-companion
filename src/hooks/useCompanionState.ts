// コンパニオン状態マシン
// タイマー競合を防ぐため全タイマーをここで一元管理する

import { useCallback, useEffect, useRef, useState } from "react";
import type { CompanionState, StateConfig, VoiceUIState } from "../types/companion";
import { DEFAULT_STATE_CONFIG } from "../types/companion";
import { logEvent, getAllEvents, pruneExpiredEvents } from "../systems/memory/memoryStore";
import { pickDialogue, pickTimedGreeting } from "../systems/dialogue/dialogueData";
import { selectReaction } from "../companion/reactions/selectReaction";
import { recordReaction } from "../companion/reactions/reactionHistory";
import { getTimeTag } from "../companion/reactions/reactionData";
import { getSettings } from "../settings/store";
import { cryEngine } from "../companion/audio/FileCryEngine";
import type { ReactionTrigger } from "../companion/reactions/types";
import { recordClick, isOverClicked, resetClicks } from "../companion/reactions/clickPattern";
import { classifyBreak } from "../companion/memory/memorySummary";
import { buildMemorySummary } from "../companion/memory/buildMemorySummary";
import { getAIResponse as getNewAIResponse } from "../companion/ai/AIProviderManager";
import { buildCompanionContext } from "../systems/ai/buildCompanionContext";
import { canSpeak } from "../companion/speech/SpeechPolicy";
import { countInLastHour } from "../companion/reactions/reactionHistory";
import type { ObservationSnapshot } from "../observation/types";
import { EMPTY_SNAPSHOT } from "../observation/types";
import { inferActivity } from "../companion/activity/inferActivity";
import { getSTTAdapter } from "../systems/voice/STTAdapterManager";

export type { VoiceUIState };  // 後方互換のため再エクスポート

interface UseCompanionStateReturn {
  state: CompanionState;
  speechText: string | null;
  onCharacterClick: () => void;
  triggerSpeak: (text?: string) => void;
  triggerDragReaction: () => void;
  requestVoiceResponse: (transcript: string) => Promise<void>;
  requestVoiceFromBlob: (blob: Blob) => Promise<void>;
  voiceListeningStart: () => void;
  voiceRecordingError: (err: string) => void;
  voiceUIState: VoiceUIState;
}

export function useCompanionState(
  config: StateConfig = DEFAULT_STATE_CONFIG,
  autonomousSpeechEnabled = false,
  isFullscreen = false,
  snapshot: ObservationSnapshot = EMPTY_SNAPSHOT
): UseCompanionStateReturn {
  const [state, setState] = useState<CompanionState>("idle");
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [voiceUIState, setVoiceUIState] = useState<VoiceUIState>("voiceOff");

  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autonomousSpeechRef = useRef(autonomousSpeechEnabled);
  useEffect(() => { autonomousSpeechRef.current = autonomousSpeechEnabled; }, [autonomousSpeechEnabled]);

  const isFullscreenRef = useRef(isFullscreen);
  useEffect(() => { isFullscreenRef.current = isFullscreen; }, [isFullscreen]);

  const snapshotRef = useRef<ObservationSnapshot>(snapshot);
  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);

  const lastSpeechAtRef = useRef<number | null>(null);

  const stateRef = useRef<CompanionState>("idle");
  useEffect(() => { stateRef.current = state; }, [state]);

  const clearAllTimers = useCallback(() => {
    [sleepTimerRef, transitionTimerRef, speechTimerRef, idleSpeechTimerRef].forEach((r) => {
      if (r.current) { clearTimeout(r.current); r.current = null; }
    });
  }, []);

  const resetSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(() => {
      setState((prev) => {
        if (prev === "idle" || prev === "touched") {
          logEvent("state_changed", { from: prev, to: "sleep" });
          return "sleep";
        }
        return prev;
      });
    }, config.sleepTimeoutMs);
  }, [config.sleepTimeoutMs]);

  // ──────────────────────────────────────────
  // Reaction System ヘルパー
  // テキストを返す。reaction に cry があれば自動再生。
  // ──────────────────────────────────────────
  const fireReaction = useCallback((trigger: ReactionTrigger, tags?: string[]): string | null => {
    const s = getSettings();
    const r = selectReaction({
      trigger,
      tags,
      isFullscreen: isFullscreenRef.current,
      policy: {
        autonomousSpeech: autonomousSpeechRef.current,
        cryEnabled: s.cryEnabled,
        maxAutonomousReactionsPerHour: s.maxAutonomousReactionsPerHour,
        suppressWhenFullscreen: s.suppressWhenFullscreen,
        suppressWhenFocus: s.focusMode,
        quietMode: s.quietMode,
        doNotDisturb: s.doNotDisturb,
      },
    });
    if (!r) return null;
    recordReaction(r.id);
    if (r.cry && s.cryEnabled) void cryEngine.play(r.cry);
    return r.text ?? null;
  }, []);

  // ──────────────────────────────────────────
  // 吹き出し表示
  // ──────────────────────────────────────────
  const triggerSpeak = useCallback(
    (text?: string) => {
      const line = text ?? pickDialogue("speaking_response");
      setSpeechText(line);
      setState("speaking");
      lastSpeechAtRef.current = Date.now();
      logEvent("speech_shown", { text: line });

      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(() => {
        setSpeechText(null);
        setState("idle");
        resetSleepTimer();
      }, config.speechBubbleDurationMs);
    },
    [config.speechBubbleDurationMs, resetSleepTimer]
  );

  // ──────────────────────────────────────────
  // ランダム独り言 (AI-first → reaction system → fallback)
  // deepFocus / gaming / watchingVideo 中は抑制
  // ──────────────────────────────────────────
  const scheduleIdleSpeech = useCallback(() => {
    if (idleSpeechTimerRef.current) clearTimeout(idleSpeechTimerRef.current);
    const delay = 120_000 + Math.random() * 120_000;
    idleSpeechTimerRef.current = setTimeout(async () => {
      if (stateRef.current === "idle" && autonomousSpeechRef.current) {
        const { kind } = inferActivity(snapshotRef.current);
        const isSilent = kind === "deepFocus" || kind === "gaming" || kind === "watchingVideo";
        if (!isSilent) {
          let text: string | null = null;
          const s      = getSettings();
          const events = getAllEvents();
          const memory = buildMemorySummary(events);
          if (memory.todaySpeechCount >= Math.max(6, s.maxAutonomousReactionsPerHour * 3)) {
            scheduleIdleSpeech();
            return;
          }
          const ctx    = buildCompanionContext("idle", snapshotRef.current, events, s);
          const policy = canSpeak("idle", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

          if (!policy.allowed) {
            scheduleIdleSpeech();
            return;
          }

          try {
            const output = await getNewAIResponse(ctx);
            if (output.shouldSpeak && output.text) text = output.text;
          } catch { /* AI エラー → reaction fallback */ }

          text ??= fireReaction("randomIdle");
          if (text) {
            triggerSpeak(text);
          }
        }
      }
      scheduleIdleSpeech();
    }, delay);
  }, [triggerSpeak, fireReaction]);

  // ──────────────────────────────────────────
  // クリック → AI応答 (新フロー: CompanionContext 経由)
  // ──────────────────────────────────────────
  const requestAIResponse = useCallback(async () => {
    setState("thinking");

    const s      = getSettings();
    const events = getAllEvents();
    const ctx    = buildCompanionContext("click", snapshotRef.current, events, s);

    // SpeechPolicy で発話可否チェック
    const policy = canSpeak(
      "manual",
      s,
      snapshotRef.current,
      lastSpeechAtRef.current,
      countInLastHour()
    );

    let text: string | null = null;
    if (policy.allowed && !s.doNotDisturb) {
      try {
        const output = await getNewAIResponse(ctx);
        if (output.shouldSpeak && output.text) text = output.text;
      } catch {
        // AI エラー → reaction fallback へ
      }
    }

    text ??= fireReaction("click") ?? pickDialogue("touch_reaction");
    triggerSpeak(text);
  }, [triggerSpeak, fireReaction]);

  // ──────────────────────────────────────────
  // ドラッグ反応
  // ──────────────────────────────────────────
  const triggerDragReaction = useCallback(() => {
    const text = fireReaction("dragStart");
    if (text) triggerSpeak(text);
  }, [fireReaction, triggerSpeak]);

  // ──────────────────────────────────────────
  // Voice Input: transcript → AI → 返答
  // 常時マイク監視なし。呼び出し元が録音・STT を担当し
  // transcript テキストのみをここに渡す。
  // ──────────────────────────────────────────
  const requestVoiceResponse = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setVoiceUIState("voiceReady");
      return;
    }

    setVoiceUIState("voiceTranscribing");
    setState("thinking");

    const s      = getSettings();
    const events = getAllEvents();
    const ctx    = buildCompanionContext("voice", snapshotRef.current, events, s, transcript);

    const policy = canSpeak("manual", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

    let text: string | null = null;
    setVoiceUIState("voiceResponding");

    try {
      if (policy.allowed && !s.doNotDisturb) {
        try {
          const output = await getNewAIResponse(ctx);
          if (output.shouldSpeak && output.text) text = output.text;
        } catch {
          // AI エラー → reaction fallback
        }
      }

      text ??= fireReaction("click") ?? pickDialogue("touch_reaction");
      triggerSpeak(text);
    } finally {
      setVoiceUIState("voiceReady");
    }
  }, [triggerSpeak, fireReaction]);

  // ──────────────────────────────────────────
  // 録音中フラグ (voiceListening)
  // ──────────────────────────────────────────
  const voiceListeningStart = useCallback(() => {
    setVoiceUIState("voiceListening");
  }, []);

  // ──────────────────────────────────────────
  // 録音エラー → voiceError → voiceReady/Off
  // ──────────────────────────────────────────
  const voiceRecordingError = useCallback((err: string) => {
    console.warn("[Voice] recording error:", err);
    setVoiceUIState("voiceError");
    const s = getSettings();
    setTimeout(() => {
      setVoiceUIState(s.voiceInputEnabled ? "voiceReady" : "voiceOff");
    }, 3_000);
  }, []);

  // ──────────────────────────────────────────
  // Voice: Blob → STT → AI → 返答
  // 録音 Blob を STTAdapter に渡し transcript を得て requestVoiceResponse に繋ぐ
  // 生音声データは transcribe() 内で使い捨て
  // ──────────────────────────────────────────
  const requestVoiceFromBlob = useCallback(async (blob: Blob) => {
    setVoiceUIState("voiceTranscribing");
    setState("thinking");

    const s      = getSettings();
    const events = getAllEvents();
    let transcript = "";

    try {
      const adapter = getSTTAdapter();
      if (await adapter.isAvailable()) {
        const result = await adapter.transcribe(blob);
        if (result.ok) {
          // 200文字で安全に切り詰め
          transcript = result.result.text.trim().slice(0, 200);
        }
      }
    } catch {
      // STT エラー → empty → fallback
    }

    if (!transcript) {
      setVoiceUIState("voiceReady");
      setState("idle");
      return;
    }

    const ctx    = buildCompanionContext("voice", snapshotRef.current, events, s, transcript);
    const policy = canSpeak("manual", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

    let text: string | null = null;
    setVoiceUIState("voiceResponding");

    try {
      if (policy.allowed && !s.doNotDisturb) {
        try {
          const output = await getNewAIResponse(ctx);
          if (output.shouldSpeak && output.text) text = output.text;
        } catch { /* AI エラー → reaction fallback */ }
      }
      text ??= fireReaction("click") ?? pickDialogue("touch_reaction");
      triggerSpeak(text);
    } finally {
      setVoiceUIState("voiceReady");
    }
  }, [triggerSpeak, fireReaction]);

  // ──────────────────────────────────────────
  // クリック処理
  // ──────────────────────────────────────────
  const onCharacterClick = useCallback(() => {
    // 連打検出: 発火条件を満たしたら overClicked を優先処理
    recordClick();
    if (isOverClicked()) {
      resetClicks();
      const text = fireReaction("overClicked") ?? pickDialogue("touch_reaction");
      triggerSpeak(text);
      return;
    }

    setState((prev) => {
      logEvent("character_clicked", { fromState: prev });

      if (prev === "sleep") {
        clearAllTimers();
        transitionTimerRef.current = setTimeout(() => {
          const text = fireReaction("wake") ?? pickDialogue("wake_reaction");
          triggerSpeak(text);
        }, config.wakingDurationMs);
        return "waking";
      }

      if (prev === "idle") {
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = setTimeout(() => {
          void requestAIResponse();
        }, config.touchedDurationMs);
        resetSleepTimer();
        return "touched";
      }

      if (prev === "speaking") {
        const text = fireReaction("click") ?? pickDialogue("touch_reaction");
        setSpeechText(text);
        resetSleepTimer();
        return "speaking";
      }

      return prev;
    });
  }, [
    clearAllTimers,
    config.wakingDurationMs,
    config.touchedDurationMs,
    triggerSpeak,
    requestAIResponse,
    resetSleepTimer,
    fireReaction,
  ]);

  // ──────────────────────────────────────────
  // 初期化
  // ──────────────────────────────────────────
  useEffect(() => {
    const initialSettings = getSettings();
    const retentionResult = pruneExpiredEvents(initialSettings.memoryRetentionDays);
    if ((import.meta.env.DEV || initialSettings.debugModeEnabled) && retentionResult.deletedCount > 0) {
      console.log("[memory-retention]", retentionResult);
    }

    logEvent("app_start");

    // 前回セッションからの休憩期間に応じて挨拶トリガーを選択
    const breakKind = classifyBreak();
    const greetTimer = setTimeout(async () => {
      let text: string | null = null;

      // AI-first: 起動挨拶も Ollama/AI を先に試みる
      const s      = getSettings();
      if (s.doNotDisturb || s.quietMode) return;

      const events = getAllEvents();
      const ctx    = buildCompanionContext("return", snapshotRef.current, events, s);
      const policy = canSpeak("manual", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

      if (policy.allowed) {
        try {
          const output = await getNewAIResponse(ctx);
          if (output.shouldSpeak && output.text) text = output.text;
        } catch { /* AI エラー → reaction fallback */ }
      }

      // AI 失敗 → 休憩種別別の固定 reaction にフォールバック
      if (!text) {
        if (breakKind === "longDay") {
          text = fireReaction("returnAfterLongBreak");
        } else if (breakKind === "hours" || breakKind === "short") {
          text = fireReaction("returnAfterBreak");
        }
        // 休憩なし or 反応が抑制されていれば通常の時刻挨拶にフォールバック
        text ??= fireReaction("timedGreeting", [getTimeTag()]) ?? pickTimedGreeting();
      }

      triggerSpeak(text);
    }, 1500);

    resetSleepTimer();
    scheduleIdleSpeech();

    return () => {
      clearTimeout(greetTimer);
      clearAllTimers();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state, speechText, onCharacterClick, triggerSpeak, triggerDragReaction,
    requestVoiceResponse, requestVoiceFromBlob,
    voiceListeningStart, voiceRecordingError,
    voiceUIState,
  };
}
