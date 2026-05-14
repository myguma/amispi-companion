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
import type { CompanionEmotion } from "../companion/reactions/types";
import { recordClick, isOverClicked, resetClicks } from "../companion/reactions/clickPattern";
import { classifyBreak } from "../companion/memory/memorySummary";
import { buildMemorySummary } from "../companion/memory/buildMemorySummary";
import { getAIResponse as getNewAIResponse, getLastAIResult } from "../companion/ai/AIProviderManager";
import { buildCompanionContext } from "../systems/ai/buildCompanionContext";
import { canSpeak } from "../companion/speech/SpeechPolicy";
import { countInLastHour } from "../companion/reactions/reactionHistory";
import type { ObservationSnapshot } from "../observation/types";
import { EMPTY_SNAPSHOT } from "../observation/types";
import { inferActivity } from "../companion/activity/inferActivity";
import { getSTTAdapter } from "../systems/voice/STTAdapterManager";
import type { STTError } from "../systems/voice/STTAdapter";
import { buildVoiceFallback, sanitizeVoiceResponse } from "../systems/voice/voiceFallback";
import { patchLastVoiceDebug, setLastVoiceDebug } from "../systems/voice/voiceDebugStore";
import { validateVoiceTranscript } from "../systems/voice/normalizeTranscript";

export type { VoiceUIState };  // 後方互換のため再エクスポート

interface UseCompanionStateReturn {
  state: CompanionState;
  speechText: string | null;
  spriteEmotion: CompanionEmotion | null;
  onCharacterClick: () => boolean;
  triggerSpeak: (text?: string, emotionOrOptions?: CompanionEmotion | null | SpeechOptions, options?: SpeechOptions) => boolean;
  triggerDragReaction: () => void;
  requestVoiceResponse: (transcript: string) => Promise<void>;
  requestVoiceFromBlob: (blob: Blob) => Promise<void>;
  voiceListeningStart: () => void;
  voiceRecordingError: (err: string) => void;
  voiceUIState: VoiceUIState;
}

type SpeechSource =
  | "voice"
  | "voice_error"
  | "manual_click"
  | "drag"
  | "autonomous"
  | "system"
  | "update";

type SpeechOptions = {
  emotion?: CompanionEmotion | null;
  source?: SpeechSource;
  priority?: number;
  lockMs?: number;
};

const SPEECH_PRIORITY: Record<SpeechSource, number> = {
  voice_error: 100,
  voice: 90,
  update: 80,
  system: 80,
  manual_click: 60,
  drag: 50,
  autonomous: 20,
};

const POST_VOICE_CLICK_SUPPRESS_MS = 1_500;

function isSpeechOptions(value: CompanionEmotion | null | SpeechOptions | undefined): value is SpeechOptions {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function voiceErrorLine(error: STTError | string): string {
  const normalized = String(error).toLowerCase();
  if (normalized.includes("permission") || normalized.includes("denied") || normalized.includes("notallowed")) {
    return "マイク、使えなかった。";
  }
  if (normalized.includes("notfound") || normalized.includes("device") || normalized.includes("microphone")) {
    return "マイク、見つからなかった。";
  }
  if (normalized.includes("too_long")) return "少し長かったみたい。";
  if (normalized.includes("timeout")) return "声の解析、時間がかかった。";
  if (normalized.includes("ffmpeg_unavailable")) return "FFmpegの設定、まだみたい。";
  if (normalized.includes("conversion_failed")) return "音声の変換、うまくいかなかった。";
  if (normalized.includes("unavailable")) return "Whisperの設定、まだみたい。";
  if (normalized.includes("no_speech") || normalized.includes("empty")) return "うまく聞き取れなかった。";
  return "声、うまく拾えなかった。";
}

function voiceDebugStatusFromError(error: STTError | null): "no_speech" | "ffmpeg_unavailable" | "conversion_failed" | "timeout" | "error" {
  if (error === "no_speech") return "no_speech";
  if (error === "ffmpeg_unavailable") return "ffmpeg_unavailable";
  if (error === "conversion_failed") return "conversion_failed";
  if (error === "timeout") return "timeout";
  return "error";
}

export function useCompanionState(
  config: StateConfig = DEFAULT_STATE_CONFIG,
  autonomousSpeechEnabled = false,
  isFullscreen = false,
  snapshot: ObservationSnapshot = EMPTY_SNAPSHOT
): UseCompanionStateReturn {
  const [state, setState] = useState<CompanionState>("idle");
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [spriteEmotion, setSpriteEmotion] = useState<CompanionEmotion | null>(null);
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
  const speechPriorityRef = useRef(0);
  const speechLockUntilRef = useRef(0);
  const speechSerialRef = useRef(0);
  const suppressClickUntilRef = useRef(0);
  const voiceUIStateRef = useRef<VoiceUIState>("voiceOff");

  const stateRef = useRef<CompanionState>("idle");
  useEffect(() => { stateRef.current = state; }, [state]);

  const setVoiceState = useCallback((next: VoiceUIState) => {
    voiceUIStateRef.current = next;
    setVoiceUIState(next);
  }, []);

  const suppressVoiceReleaseClick = useCallback((ms = POST_VOICE_CLICK_SUPPRESS_MS) => {
    suppressClickUntilRef.current = Math.max(suppressClickUntilRef.current, Date.now() + ms);
  }, []);

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
    (text?: string, emotionOrOptions?: CompanionEmotion | null | SpeechOptions, options?: SpeechOptions) => {
      const line = text ?? pickDialogue("speaking_response");
      const resolvedOptions: SpeechOptions = isSpeechOptions(emotionOrOptions)
        ? emotionOrOptions
        : { ...(options ?? {}), emotion: emotionOrOptions ?? options?.emotion ?? null };
      const source = resolvedOptions.source ?? "manual_click";
      const priority = resolvedOptions.priority ?? SPEECH_PRIORITY[source];
      const now = Date.now();
      if (now < speechLockUntilRef.current && priority <= speechPriorityRef.current) {
        return false;
      }

      const speechSerial = ++speechSerialRef.current;
      speechPriorityRef.current = priority;
      speechLockUntilRef.current = Math.max(
        speechLockUntilRef.current,
        now + (resolvedOptions.lockMs ?? 0)
      );

      setSpeechText(line);
      setSpriteEmotion(resolvedOptions.emotion ?? null);
      setState("speaking");
      lastSpeechAtRef.current = Date.now();
      logEvent("speech_shown", { text: line });

      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(() => {
        if (speechSerialRef.current !== speechSerial) return;
        setSpeechText(null);
        setSpriteEmotion(null);
        speechPriorityRef.current = 0;
        speechLockUntilRef.current = 0;
        setState("idle");
        resetSleepTimer();
      }, config.speechBubbleDurationMs);
      return true;
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
          let emotion: CompanionEmotion | null = null;
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
            if (output.shouldSpeak && output.text) {
              text = output.text;
              emotion = output.emotion ?? null;
            }
          } catch { /* AI エラー → reaction fallback */ }

          text ??= fireReaction("randomIdle");
          if (text) {
            triggerSpeak(text, { emotion, source: "autonomous", priority: 20 });
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
    let emotion: CompanionEmotion | null = null;
    if (policy.allowed && !s.doNotDisturb) {
      try {
        const output = await getNewAIResponse(ctx);
        if (output.shouldSpeak && output.text) {
          text = output.text;
          emotion = output.emotion ?? null;
        }
      } catch {
        // AI エラー → reaction fallback へ
      }
    }

    text ??= fireReaction("click") ?? pickDialogue("touch_reaction");
    triggerSpeak(text, { emotion, source: "manual_click", priority: 60 });
  }, [triggerSpeak, fireReaction]);

  // ──────────────────────────────────────────
  // ドラッグ反応
  // ──────────────────────────────────────────
  const triggerDragReaction = useCallback(() => {
    const text = fireReaction("dragStart");
    if (text) triggerSpeak(text, { source: "drag", priority: 50 });
  }, [fireReaction, triggerSpeak]);

  // ──────────────────────────────────────────
  // Voice Input: transcript → AI → 返答
  // 常時マイク監視なし。呼び出し元が録音・STT を担当し
  // transcript テキストのみをここに渡す。
  // ──────────────────────────────────────────
  const requestVoiceResponse = useCallback(async (transcript: string) => {
    suppressVoiceReleaseClick();
    const validated = validateVoiceTranscript(transcript);
    if (!validated.ok) {
      setVoiceState("voiceReady");
      return;
    }

    setVoiceState("voiceTranscribing");
    setState("thinking");

    const s      = getSettings();
    const events = getAllEvents();
    const ctx    = buildCompanionContext("voice", snapshotRef.current, events, s, validated.text);

    const policy = canSpeak("manual", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

    let text: string | null = null;
    let emotion: CompanionEmotion | null = null;
    setVoiceState("voiceResponding");

    try {
      if (policy.allowed && !s.doNotDisturb) {
        try {
          const output = await getNewAIResponse(ctx);
          if (output.shouldSpeak && output.text) {
            text = output.text;
            emotion = output.emotion ?? null;
          }
        } catch {
          // AI エラー → reaction fallback
        }
      }

      const aiDebug = getLastAIResult();
      if (!text) {
        text = buildVoiceFallback(validated.text, ctx);
        patchLastVoiceDebug({
          aiSource: aiDebug.source,
          aiFallbackReason: aiDebug.fallbackReason ?? "voice_fallback",
          responsePreview: text.slice(0, 80),
        });
      } else {
        text = sanitizeVoiceResponse(text);
        patchLastVoiceDebug({
          aiSource: aiDebug.source,
          aiFallbackReason: aiDebug.fallbackReason,
          responsePreview: text.slice(0, 80),
        });
      }
      triggerSpeak(text, { emotion, source: "voice", priority: 90, lockMs: 2_200 });
    } finally {
      suppressVoiceReleaseClick();
      setVoiceState("voiceReady");
    }
  }, [setVoiceState, suppressVoiceReleaseClick, triggerSpeak]);

  // ──────────────────────────────────────────
  // 録音中フラグ (voiceListening)
  // ──────────────────────────────────────────
  const voiceListeningStart = useCallback(() => {
    suppressVoiceReleaseClick(60_000);
    setLastVoiceDebug({ status: "recording" });
    setVoiceState("voiceListening");
  }, [setVoiceState, suppressVoiceReleaseClick]);

  // ──────────────────────────────────────────
  // 録音エラー → voiceError → voiceReady/Off
  // ──────────────────────────────────────────
  const voiceRecordingError = useCallback((err: string) => {
    console.warn("[Voice] recording error:", err);
    suppressVoiceReleaseClick();
    setVoiceState("voiceError");
    triggerSpeak(voiceErrorLine(err), { emotion: "concerned", source: "voice_error", priority: 100, lockMs: 1_800 });
    const s = getSettings();
    setTimeout(() => {
      setVoiceState(s.voiceInputEnabled ? "voiceReady" : "voiceOff");
    }, 3_000);
    patchLastVoiceDebug({ status: "error", stderrPreview: String(err).slice(0, 200) });
  }, [setVoiceState, suppressVoiceReleaseClick, triggerSpeak]);

  // ──────────────────────────────────────────
  // Voice: Blob → STT → AI → 返答
  // 録音 Blob を STTAdapter に渡し transcript を得て requestVoiceResponse に繋ぐ
  // 生音声データは transcribe() 内で使い捨て
  // ──────────────────────────────────────────
  const requestVoiceFromBlob = useCallback(async (blob: Blob) => {
    suppressVoiceReleaseClick(60_000);
    setVoiceState("voiceTranscribing");
    setState("thinking");
    setLastVoiceDebug({
      status: "transcribing",
      inputMimeType: blob.type || "application/octet-stream",
      transcriptPreview: "",
      transcriptLength: 0,
    });

    const s      = getSettings();
    const events = getAllEvents();
    let transcript = "";
    let sttError: STTError | null = null;

    try {
      const adapter = getSTTAdapter();
      if (await adapter.isAvailable()) {
        const result = await adapter.transcribe(blob);
        if (result.ok) {
          // 200文字で安全に切り詰め
          const validated = validateVoiceTranscript(result.result.text);
          if (validated.ok) {
            transcript = validated.text;
          } else {
            sttError = "no_speech";
            patchLastVoiceDebug({
              status: "no_speech",
              transcriptPreview: result.result.text.trim().slice(0, 80),
              transcriptLength: result.result.text.trim().length,
              stderrPreview: validated.reason,
            });
          }
        } else {
          sttError = result.error;
        }
      } else {
        sttError = "unavailable";
      }
    } catch (err) {
      console.warn("[Voice] STT error:", err);
      sttError = "error";
    }

    if (!transcript) {
      setVoiceState("voiceError");
      patchLastVoiceDebug({
        status: voiceDebugStatusFromError(sttError),
      });
      triggerSpeak(voiceErrorLine(sttError ?? "no_speech"), { emotion: "concerned", source: "voice_error", priority: 100, lockMs: 1_800 });
      setTimeout(() => {
        const latest = getSettings();
        setVoiceState(latest.voiceInputEnabled ? "voiceReady" : "voiceOff");
      }, 3_000);
      suppressVoiceReleaseClick();
      return;
    }

    const ctx    = buildCompanionContext("voice", snapshotRef.current, events, s, transcript);
    const policy = canSpeak("manual", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

    let text: string | null = null;
    let emotion: CompanionEmotion | null = null;
    setVoiceState("voiceResponding");

    try {
      if (policy.allowed && !s.doNotDisturb) {
        try {
          const output = await getNewAIResponse(ctx);
          if (output.shouldSpeak && output.text) {
            text = output.text;
            emotion = output.emotion ?? null;
          }
        } catch { /* AI エラー → reaction fallback */ }
      }
      const aiDebug = getLastAIResult();
      if (!text) {
        text = buildVoiceFallback(transcript, ctx);
        patchLastVoiceDebug({
          aiSource: aiDebug.source,
          aiFallbackReason: aiDebug.fallbackReason ?? "voice_fallback",
          responsePreview: text.slice(0, 80),
        });
      } else {
        text = sanitizeVoiceResponse(text);
        patchLastVoiceDebug({
          aiSource: aiDebug.source,
          aiFallbackReason: aiDebug.fallbackReason,
          responsePreview: text.slice(0, 80),
        });
      }
      triggerSpeak(text, { emotion, source: "voice", priority: 90, lockMs: 2_200 });
    } finally {
      suppressVoiceReleaseClick();
      setVoiceState("voiceReady");
    }
  }, [setVoiceState, suppressVoiceReleaseClick, triggerSpeak]);

  // ──────────────────────────────────────────
  // クリック処理
  // ──────────────────────────────────────────
  const onCharacterClick = useCallback(() => {
    const now = Date.now();
    const voiceBusy =
      voiceUIStateRef.current === "voiceListening" ||
      voiceUIStateRef.current === "voiceTranscribing" ||
      voiceUIStateRef.current === "voiceResponding";
    if (voiceBusy || now < suppressClickUntilRef.current) {
      patchLastVoiceDebug({ aiFallbackReason: "click_suppressed_after_voice" });
      return false;
    }

    // 連打検出: 発火条件を満たしたら overClicked を優先処理
    recordClick();
    if (isOverClicked()) {
      resetClicks();
      const text = fireReaction("overClicked") ?? pickDialogue("touch_reaction");
      triggerSpeak(text, { source: "manual_click", priority: 60 });
      return true;
    }

    setState((prev) => {
      logEvent("character_clicked", { fromState: prev });

      if (prev === "sleep") {
        clearAllTimers();
        transitionTimerRef.current = setTimeout(() => {
          const text = fireReaction("wake") ?? pickDialogue("wake_reaction");
          triggerSpeak(text, { source: "system", priority: 80 });
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
        triggerSpeak(text, { source: "manual_click", priority: 60 });
        resetSleepTimer();
        return "speaking";
      }

      return prev;
    });
    return true;
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
      let emotion: CompanionEmotion | null = null;

      // AI-first: 起動挨拶も Ollama/AI を先に試みる
      const s      = getSettings();
      if (s.doNotDisturb || s.quietMode) return;

      const events = getAllEvents();
      const ctx    = buildCompanionContext("return", snapshotRef.current, events, s);
      const policy = canSpeak("manual", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

      if (policy.allowed) {
        try {
          const output = await getNewAIResponse(ctx);
          if (output.shouldSpeak && output.text) {
            text = output.text;
            emotion = output.emotion ?? null;
          }
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

      triggerSpeak(text, { emotion, source: "system", priority: 80 });
    }, 1500);

    resetSleepTimer();
    scheduleIdleSpeech();

    return () => {
      clearTimeout(greetTimer);
      clearAllTimers();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state, speechText, spriteEmotion, onCharacterClick, triggerSpeak, triggerDragReaction,
    requestVoiceResponse, requestVoiceFromBlob,
    voiceListeningStart, voiceRecordingError,
    voiceUIState,
  };
}
