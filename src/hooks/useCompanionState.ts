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
// buildMemorySummary: scheduleIdleSpeechのtodaySpeechCount廃止により不要になったため削除
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
import { buildLocalConversationResponse, classifyVoiceIntent } from "../systems/voice/voiceIntent";
import { addInteractionTrace, previewTraceText } from "../systems/debug/interactionTraceStore";
import { updateAutonomousSpeechDebug } from "../systems/debug/autonomousSpeechDebugStore";

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
  requestTextMessage: (text: string) => Promise<void>;
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
  | "sleep_autonomous"
  | "system"
  | "update";

type SpeechOptions = {
  emotion?: CompanionEmotion | null;
  source?: SpeechSource;
  priority?: number;
  lockMs?: number;
  // AI metadata (speech_shown の data に保存される; API key / raw prompt は含まない)
  aiProvider?: string;
  aiModel?: string;
  aiStatus?: string;
  fallbackReason?: string;
  qualityRejectedReason?: string;
};

const SPEECH_PRIORITY: Record<SpeechSource, number> = {
  voice_error: 100,
  voice: 90,
  update: 80,
  system: 80,
  manual_click: 60,
  drag: 50,
  autonomous: 20,
  sleep_autonomous: 15,
};

const POST_VOICE_CLICK_SUPPRESS_MS = 1_500;

const SLEEP_SPEECH_LINES = [
  "……",
  "少し寝てた",
  "まだ、ここにいる",
  "小さく起きた",
  "静かだね",
  "夢を見てた",
];

function pickSleepSpeech(): string {
  return SLEEP_SPEECH_LINES[Math.floor(Math.random() * SLEEP_SPEECH_LINES.length)];
}

function speechDelayRangeMs(settings: ReturnType<typeof getSettings>): [number, number] {
  const preset = settings.autonomousSpeechIntervalPreset ?? (
    settings.speechFrequency === "normal" ? "normal" :
    settings.speechFrequency === "low" ? "calm" : "rare"
  );
  switch (preset) {
    case "lively": return [60_000, 120_000];
    case "normal": return [120_000, 240_000];
    case "calm": return [180_000, 300_000];
    case "rare":
    default: return [300_000, 480_000];
  }
}

function sleepSpeechDelayRangeMs(preset: string): [number, number] | null {
  switch (preset) {
    case "rare":     return [8 * 60_000, 15 * 60_000];
    case "veryRare": return [15 * 60_000, 30 * 60_000];
    case "off":
    default:         return null;
  }
}

function isSpeechOptions(value: CompanionEmotion | null | SpeechOptions | undefined): value is SpeechOptions {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function aiSpeechMetaFromLastResult(): SpeechOptions {
  const aiResult = getLastAIResult();
  return {
    aiProvider: aiResult.source,
    aiModel: aiResult.model,
    aiStatus: aiResult.status,
    fallbackReason: aiResult.fallbackReason,
    qualityRejectedReason: aiResult.qualityRejectedReason,
  };
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
  const sleepSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const voiceSessionCounterRef = useRef(0);
  const activeVoiceSessionIdRef = useRef(0);
  const staleVoiceDroppedCountRef = useRef(0);

  const stateRef = useRef<CompanionState>("idle");
  useEffect(() => { stateRef.current = state; }, [state]);

  const setVoiceState = useCallback((next: VoiceUIState) => {
    voiceUIStateRef.current = next;
    setVoiceUIState(next);
  }, []);

  const suppressVoiceReleaseClick = useCallback((ms = POST_VOICE_CLICK_SUPPRESS_MS) => {
    suppressClickUntilRef.current = Math.max(suppressClickUntilRef.current, Date.now() + ms);
  }, []);

  const beginVoiceSession = useCallback(() => {
    const id = voiceSessionCounterRef.current + 1;
    voiceSessionCounterRef.current = id;
    activeVoiceSessionIdRef.current = id;
    return id;
  }, []);

  const isCurrentVoiceSession = useCallback((id: number) => {
    const current = id === activeVoiceSessionIdRef.current;
    if (!current) {
      staleVoiceDroppedCountRef.current += 1;
      patchLastVoiceDebug({
        staleDroppedCount: staleVoiceDroppedCountRef.current,
        aiFallbackReason: "stale_voice_session_dropped",
      });
      addInteractionTrace({
        trigger: "voice",
        voiceSessionId: id,
        dropped: true,
        fallbackReason: "stale_voice_session",
        note: `active=${activeVoiceSessionIdRef.current}`,
      });
    }
    return current;
  }, []);

  const settingsSnapshot = useCallback(() => {
    const s = getSettings();
    return {
      autonomousSpeechEnabled: s.autonomousSpeechEnabled,
      autonomousMovementEnabled: s.autonomousMovementEnabled,
      quietMode: s.quietMode,
      focusMode: s.focusMode,
      doNotDisturb: s.doNotDisturb,
      speechFrequency: s.speechFrequency,
      autonomousSpeechIntervalPreset: s.autonomousSpeechIntervalPreset,
      autonomousSpeechSafetyCapEnabled: s.autonomousSpeechSafetyCapEnabled,
    };
  }, []);

  const clearAllTimers = useCallback(() => {
    [sleepTimerRef, transitionTimerRef, speechTimerRef, idleSpeechTimerRef, sleepSpeechTimerRef].forEach((r) => {
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
        autonomousSpeechSafetyCapEnabled: s.autonomousSpeechSafetyCapEnabled,
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
        addInteractionTrace({
          trigger: source === "voice" || source === "voice_error" ? "voice" : source === "manual_click" ? "click" : source === "sleep_autonomous" ? "autonomous" : source,
          source,
          selectedResponse: previewTraceText(line),
          speechPriority: priority,
          dropped: true,
          fallbackReason: "lower_priority_speech_locked",
          settingsSnapshot: settingsSnapshot(),
        });
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
      logEvent("speech_shown", {
        text: line,
        source,
        priority,
        ...(resolvedOptions.aiProvider !== undefined && { aiProvider: resolvedOptions.aiProvider }),
        ...(resolvedOptions.aiModel !== undefined && { aiModel: resolvedOptions.aiModel }),
        ...(resolvedOptions.aiStatus !== undefined && { aiStatus: resolvedOptions.aiStatus }),
        ...(resolvedOptions.fallbackReason !== undefined && { fallbackReason: resolvedOptions.fallbackReason }),
        ...(resolvedOptions.qualityRejectedReason !== undefined && { qualityRejectedReason: resolvedOptions.qualityRejectedReason }),
      });

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
    [config.speechBubbleDurationMs, resetSleepTimer, settingsSnapshot]
  );

  // ──────────────────────────────────────────
  // ランダム独り言 (AI-first → reaction system → fallback)
  // deepFocus / gaming / watchingVideo 中は抑制
  // ──────────────────────────────────────────
  const scheduleIdleSpeech = useCallback(() => {
    if (idleSpeechTimerRef.current) clearTimeout(idleSpeechTimerRef.current);
    if (!autonomousSpeechRef.current) {
      idleSpeechTimerRef.current = null;
      updateAutonomousSpeechDebug({ autonomousSpeechEnabled: false, suppressionReason: "disabled", nextAutonomousSpeechAt: null });
      return;
    }
    const s0 = getSettings();
    const [minDelay, maxDelay] = speechDelayRangeMs(s0);
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    const nextAt = Date.now() + delay;
    updateAutonomousSpeechDebug({
      autonomousSpeechEnabled: true,
      autonomousSpeechIntervalPreset: s0.autonomousSpeechIntervalPreset,
      safetyCapEnabled: s0.autonomousSpeechSafetyCapEnabled,
      legacyMaxPerHour: s0.maxAutonomousReactionsPerHour,
      nextAutonomousSpeechAt: nextAt,
      autonomousSpeechDelayMs: delay,
      reactionCountInLastHour: countInLastHour(),
      suppressionReason: null,
    });
    idleSpeechTimerRef.current = setTimeout(async () => {
      if (stateRef.current === "idle" && autonomousSpeechRef.current) {
        const { kind } = inferActivity(snapshotRef.current);
        const isSilent = kind === "deepFocus" || kind === "gaming" || kind === "watchingVideo";
        if (!isSilent) {
          let text: string | null = null;
          let emotion: CompanionEmotion | null = null;
          const s      = getSettings();
          const events = getAllEvents();
          const ctx    = buildCompanionContext("idle", snapshotRef.current, events, s);
          const policy = canSpeak("idle", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

          if (!policy.allowed) {
            const policyReason = policy.reason === "rateLimit" ? "safetyCap" : (policy.reason ?? "no_text");
            updateAutonomousSpeechDebug({ suppressionReason: policyReason });
            addInteractionTrace({ trigger: "autonomous", dropped: true, fallbackReason: policy.reason ?? "policy_blocked", settingsSnapshot: settingsSnapshot() });
            scheduleIdleSpeech();
            return;
          }

          let aiMeta: SpeechOptions = {};
          try {
            const output = await getNewAIResponse(ctx);
            aiMeta = aiSpeechMetaFromLastResult();
            if (output.shouldSpeak && output.text) {
              text = output.text;
              emotion = output.emotion ?? null;
            }
          } catch { /* AI エラー → reaction fallback */ }

          if (!text) {
            text = fireReaction("randomIdle");
            if (text) aiMeta = { ...aiMeta, aiProvider: "rule", aiStatus: "fallback", fallbackReason: aiMeta.fallbackReason ?? "ai_no_speech_or_error" };
          }
          if (text) {
            const shown = triggerSpeak(text, { emotion, source: "autonomous", priority: 20, ...aiMeta });
            if (shown) {
              updateAutonomousSpeechDebug({ lastAutonomousSpeechAt: Date.now(), suppressionReason: "allowed" });
              if (s.cryEnabled && s.playCryOnAutonomousSpeech && !s.quietMode && !s.doNotDisturb) {
                void cryEngine.play({ id: "autonomous_speech", synth: { kind: "murmur", durationMs: 180 } });
              }
            }
          } else {
            updateAutonomousSpeechDebug({ suppressionReason: "no_text" });
          }
        } else {
          updateAutonomousSpeechDebug({ suppressionReason: "silent_activity" });
        }
      } else {
        updateAutonomousSpeechDebug({ suppressionReason: stateRef.current !== "idle" ? "not_idle" : "disabled" });
      }
      scheduleIdleSpeech();
    }, delay);
  }, [triggerSpeak, fireReaction, settingsSnapshot]);

  useEffect(() => {
    if (!autonomousSpeechEnabled) {
      if (idleSpeechTimerRef.current) {
        clearTimeout(idleSpeechTimerRef.current);
        idleSpeechTimerRef.current = null;
      }
      return;
    }
    scheduleIdleSpeech();
    return () => {
      if (idleSpeechTimerRef.current) {
        clearTimeout(idleSpeechTimerRef.current);
        idleSpeechTimerRef.current = null;
      }
    };
  }, [autonomousSpeechEnabled, scheduleIdleSpeech]);

  // sleep 状態中の低頻度発話スケジューラ
  const scheduleSleepSpeech = useCallback(() => {
    if (sleepSpeechTimerRef.current) clearTimeout(sleepSpeechTimerRef.current);
    const s0 = getSettings();
    // sleep発話は sleepSpeechEnabled のみで制御。自律発話全体の ON/OFF とは独立。
    if (!s0.sleepSpeechEnabled) {
      updateAutonomousSpeechDebug({
        sleepSpeechEnabled: false,
        sleepSpeechIntervalPreset: s0.sleepSpeechIntervalPreset,
        sleepSpeechSuppressionReason: "disabled",
      });
      return;
    }
    const range = sleepSpeechDelayRangeMs(s0.sleepSpeechIntervalPreset);
    if (!range) {
      updateAutonomousSpeechDebug({
        sleepSpeechEnabled: false,
        sleepSpeechIntervalPreset: s0.sleepSpeechIntervalPreset,
        sleepSpeechSuppressionReason: "off",
        nextSleepSpeechAt: null,
      });
      return;
    }
    const [min, max] = range;
    const delay = min + Math.random() * (max - min);
    const nextAt = Date.now() + delay;
    updateAutonomousSpeechDebug({
      sleepSpeechEnabled: true,
      sleepSpeechIntervalPreset: s0.sleepSpeechIntervalPreset,
      nextSleepSpeechAt: nextAt,
      sleepSpeechSuppressionReason: null,
    });
    sleepSpeechTimerRef.current = setTimeout(() => {
      if (stateRef.current !== "sleep") {
        scheduleSleepSpeech();
        return;
      }
      const s = getSettings();
      if (!s.sleepSpeechEnabled || s.quietMode || s.doNotDisturb) {
        const reason = !s.sleepSpeechEnabled ? "disabled"
          : s.quietMode ? "quiet"
          : "dnd";
        updateAutonomousSpeechDebug({ sleepSpeechSuppressionReason: reason, nextSleepSpeechAt: null });
        scheduleSleepSpeech();
        return;
      }
      const text = pickSleepSpeech();
      const shown = triggerSpeak(text, { source: "sleep_autonomous", priority: 15 });
      if (shown) {
        updateAutonomousSpeechDebug({ lastSleepSpeechAt: Date.now(), sleepSpeechSuppressionReason: null });
        if (s.cryEnabled && !s.quietMode && !s.doNotDisturb) {
          void cryEngine.play({ id: "sleep_speech", synth: { kind: "murmur", durationMs: 120 } });
        }
      }
      scheduleSleepSpeech();
    }, delay);
  }, [triggerSpeak]);

  // sleep 状態中の低頻度発話
  useEffect(() => {
    if (state === "sleep") {
      scheduleSleepSpeech();
    } else {
      if (sleepSpeechTimerRef.current) {
        clearTimeout(sleepSpeechTimerRef.current);
        sleepSpeechTimerRef.current = null;
      }
      updateAutonomousSpeechDebug({ nextSleepSpeechAt: null, sleepSpeechSuppressionReason: null });
    }
  }, [state, scheduleSleepSpeech]);

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
    let aiMeta: SpeechOptions = {};
    if (policy.allowed && !s.doNotDisturb) {
      try {
        const output = await getNewAIResponse(ctx);
        aiMeta = aiSpeechMetaFromLastResult();
        if (output.shouldSpeak && output.text) {
          text = output.text;
          emotion = output.emotion ?? null;
        }
      } catch {
        // AI エラー → reaction fallback へ
      }
    }

    if (!text) {
      text = fireReaction("click") ?? pickDialogue("touch_reaction");
      aiMeta = { ...aiMeta, aiProvider: "rule", aiStatus: "fallback", fallbackReason: aiMeta.fallbackReason ?? "click_reaction_fallback" };
    }
    triggerSpeak(text, { emotion, source: "manual_click", priority: 60, ...aiMeta });
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
    const sessionId = beginVoiceSession();
    suppressVoiceReleaseClick();
    const validated = validateVoiceTranscript(transcript);
    if (!validated.ok) {
      patchLastVoiceDebug({
        voiceSessionId: sessionId,
        status: "no_speech",
        transcriptPreview: transcript.trim().slice(0, 80),
        transcriptLength: transcript.trim().length,
        normalizedTranscriptPreview: "",
        staleDroppedCount: staleVoiceDroppedCountRef.current,
      });
      setVoiceState("voiceReady");
      return;
    }

    setVoiceState("voiceTranscribing");
    setState("thinking");

    const s      = getSettings();
    const events = getAllEvents();
    const ctx    = buildCompanionContext("voice", snapshotRef.current, events, s, validated.text);
    const intent = classifyVoiceIntent(validated.text);
    patchLastVoiceDebug({
      voiceSessionId: sessionId,
      normalizedTranscriptPreview: validated.text.slice(0, 80),
      intent,
      staleDroppedCount: staleVoiceDroppedCountRef.current,
    });
    addInteractionTrace({
      trigger: "voice",
      voiceSessionId: sessionId,
      rawTranscriptPreview: previewTraceText(transcript),
      normalizedTranscriptPreview: previewTraceText(validated.text),
      intent,
      observationSummary: ctx.activityInsight.summary,
      activeAppCategory: ctx.observation.activeApp?.category,
      activeProcessName: ctx.observation.activeApp?.processName,
      settingsSnapshot: settingsSnapshot(),
    });

    const policy = canSpeak("manual", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

    let text: string | null = null;
    let emotion: CompanionEmotion | null = null;
    setVoiceState("voiceResponding");

    try {
      const routed = buildLocalConversationResponse(intent, ctx, validated.text);
      if (routed) {
        text = sanitizeVoiceResponse(routed);
      } else if (policy.allowed && !s.doNotDisturb) {
        try {
          const output = await getNewAIResponse(ctx);
          if (!isCurrentVoiceSession(sessionId)) return;
          if (output.shouldSpeak && output.text) {
            text = output.text;
            emotion = output.emotion ?? null;
          }
        } catch {
          // AI エラー → reaction fallback
        }
      }

      const aiDebug = getLastAIResult();
      const speechAiMeta: SpeechOptions = routed
        ? { aiProvider: "rule", aiStatus: "success", fallbackReason: "local_router" }
        : {
            aiProvider: aiDebug.source,
            aiModel: aiDebug.model,
            aiStatus: aiDebug.status,
            fallbackReason: aiDebug.fallbackReason,
            qualityRejectedReason: aiDebug.qualityRejectedReason,
          };
      if (!text) {
        text = buildVoiceFallback(validated.text, ctx);
        speechAiMeta.aiProvider = aiDebug.source;
        speechAiMeta.aiStatus = "fallback";
        speechAiMeta.fallbackReason = aiDebug.fallbackReason ?? "voice_fallback";
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
      if (!isCurrentVoiceSession(sessionId)) return;
      const shown = triggerSpeak(text, { emotion, source: "voice", priority: 90, lockMs: 2_200, ...speechAiMeta });
      addInteractionTrace({
        trigger: "voice",
        source: aiDebug.source,
        voiceSessionId: sessionId,
        normalizedTranscriptPreview: previewTraceText(validated.text),
        intent,
        observationSummary: ctx.activityInsight.summary,
        activeAppCategory: ctx.observation.activeApp?.category,
        activeProcessName: ctx.observation.activeApp?.processName,
        selectedResponse: previewTraceText(text),
        responseSource: routed ? "local_router" : aiDebug.source,
        fallbackReason: routed ? "observation_question_router" : aiDebug.fallbackReason,
        speechPriority: 90,
        dropped: !shown,
        settingsSnapshot: settingsSnapshot(),
      });
    } finally {
      suppressVoiceReleaseClick();
      setVoiceState("voiceReady");
    }
  }, [beginVoiceSession, isCurrentVoiceSession, setVoiceState, settingsSnapshot, suppressVoiceReleaseClick, triggerSpeak]);

  // ──────────────────────────────────────────
  // 録音中フラグ (voiceListening)
  // ──────────────────────────────────────────
  const voiceListeningStart = useCallback(() => {
    const sessionId = beginVoiceSession();
    suppressVoiceReleaseClick(60_000);
    setLastVoiceDebug({
      status: "recording",
      voiceSessionId: sessionId,
      transcriptPreview: "",
      transcriptLength: 0,
      normalizedTranscriptPreview: "",
      intent: "unknown",
      staleDroppedCount: staleVoiceDroppedCountRef.current,
    });
    addInteractionTrace({
      trigger: "voice",
      voiceSessionId: sessionId,
      note: "voice_session_start",
      settingsSnapshot: settingsSnapshot(),
    });
    setVoiceState("voiceListening");
  }, [beginVoiceSession, setVoiceState, settingsSnapshot, suppressVoiceReleaseClick]);

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
    const sessionId = activeVoiceSessionIdRef.current || beginVoiceSession();
    suppressVoiceReleaseClick(60_000);
    setVoiceState("voiceTranscribing");
    setState("thinking");
    setLastVoiceDebug({
      status: "transcribing",
      voiceSessionId: sessionId,
      inputMimeType: blob.type || "application/octet-stream",
      transcriptPreview: "",
      transcriptLength: 0,
      normalizedTranscriptPreview: "",
      intent: "unknown",
      staleDroppedCount: staleVoiceDroppedCountRef.current,
    });

    const s      = getSettings();
    const events = getAllEvents();
    let transcript = "";
    let sttError: STTError | null = null;

    try {
      const adapter = getSTTAdapter();
      if (await adapter.isAvailable()) {
        const result = await adapter.transcribe(blob);
        if (!isCurrentVoiceSession(sessionId)) return;
        if (result.ok) {
          // 200文字で安全に切り詰め
          const validated = validateVoiceTranscript(result.result.text);
          if (validated.ok) {
            transcript = validated.text;
            patchLastVoiceDebug({
              voiceSessionId: sessionId,
              normalizedTranscriptPreview: transcript.slice(0, 80),
              intent: classifyVoiceIntent(transcript),
              staleDroppedCount: staleVoiceDroppedCountRef.current,
            });
          } else {
            sttError = "no_speech";
            patchLastVoiceDebug({
              status: "no_speech",
              voiceSessionId: sessionId,
              transcriptPreview: result.result.text.trim().slice(0, 80),
              transcriptLength: result.result.text.trim().length,
              normalizedTranscriptPreview: "",
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
        voiceSessionId: sessionId,
      });
      const errorLine = voiceErrorLine(sttError ?? "no_speech");
      triggerSpeak(errorLine, { emotion: "concerned", source: "voice_error", priority: 100, lockMs: 1_800 });
      addInteractionTrace({
        trigger: "voice",
        voiceSessionId: sessionId,
        fallbackReason: sttError ?? "no_speech",
        selectedResponse: errorLine,
        responseSource: "voice_error",
        speechPriority: 100,
        settingsSnapshot: settingsSnapshot(),
      });
      setTimeout(() => {
        const latest = getSettings();
        setVoiceState(latest.voiceInputEnabled ? "voiceReady" : "voiceOff");
      }, 3_000);
      suppressVoiceReleaseClick();
      return;
    }

    const ctx    = buildCompanionContext("voice", snapshotRef.current, events, s, transcript);
    const intent = classifyVoiceIntent(transcript);
    patchLastVoiceDebug({ voiceSessionId: sessionId, intent, normalizedTranscriptPreview: transcript.slice(0, 80) });
    addInteractionTrace({
      trigger: "voice",
      voiceSessionId: sessionId,
      rawTranscriptPreview: previewTraceText(transcript),
      normalizedTranscriptPreview: previewTraceText(transcript),
      intent,
      observationSummary: ctx.activityInsight.summary,
      activeAppCategory: ctx.observation.activeApp?.category,
      activeProcessName: ctx.observation.activeApp?.processName,
      settingsSnapshot: settingsSnapshot(),
    });
    const policy = canSpeak("manual", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

    let text: string | null = null;
    let emotion: CompanionEmotion | null = null;
    setVoiceState("voiceResponding");

    try {
      const routed = buildLocalConversationResponse(intent, ctx, transcript);
      if (routed) {
        text = sanitizeVoiceResponse(routed);
      } else if (policy.allowed && !s.doNotDisturb) {
        try {
          const output = await getNewAIResponse(ctx);
          if (!isCurrentVoiceSession(sessionId)) return;
          if (output.shouldSpeak && output.text) {
            text = output.text;
            emotion = output.emotion ?? null;
          }
        } catch { /* AI エラー → reaction fallback */ }
      }
      const aiDebug = getLastAIResult();
      const speechAiMeta: SpeechOptions = routed
        ? { aiProvider: "rule", aiStatus: "success", fallbackReason: "local_router" }
        : {
            aiProvider: aiDebug.source,
            aiModel: aiDebug.model,
            aiStatus: aiDebug.status,
            fallbackReason: aiDebug.fallbackReason,
            qualityRejectedReason: aiDebug.qualityRejectedReason,
          };
      if (!text) {
        text = buildVoiceFallback(transcript, ctx);
        speechAiMeta.aiProvider = aiDebug.source;
        speechAiMeta.aiStatus = "fallback";
        speechAiMeta.fallbackReason = aiDebug.fallbackReason ?? "voice_fallback";
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
      if (!isCurrentVoiceSession(sessionId)) return;
      const shown = triggerSpeak(text, { emotion, source: "voice", priority: 90, lockMs: 2_200, ...speechAiMeta });
      addInteractionTrace({
        trigger: "voice",
        source: aiDebug.source,
        voiceSessionId: sessionId,
        normalizedTranscriptPreview: previewTraceText(transcript),
        intent,
        observationSummary: ctx.activityInsight.summary,
        activeAppCategory: ctx.observation.activeApp?.category,
        activeProcessName: ctx.observation.activeApp?.processName,
        selectedResponse: previewTraceText(text),
        responseSource: routed ? "local_router" : aiDebug.source,
        fallbackReason: routed ? "observation_question_router" : aiDebug.fallbackReason,
        speechPriority: 90,
        dropped: !shown,
        settingsSnapshot: settingsSnapshot(),
      });
    } finally {
      suppressVoiceReleaseClick();
      setVoiceState("voiceReady");
    }
  }, [beginVoiceSession, isCurrentVoiceSession, setVoiceState, settingsSnapshot, suppressVoiceReleaseClick, triggerSpeak]);

  const requestTextMessage = useCallback(async (input: string) => {
    const textInput = input.trim().slice(0, 200);
    if (!textInput) return;

    setState("thinking");
    const s = getSettings();
    const events = getAllEvents();
    const ctx = buildCompanionContext("text", snapshotRef.current, events, s, textInput);
    const intent = classifyVoiceIntent(textInput);
    const policy = canSpeak("manual", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

    addInteractionTrace({
      trigger: "text",
      textInputPreview: previewTraceText(textInput),
      intent,
      observationSummary: ctx.activityInsight.summary,
      activeAppCategory: ctx.observation.activeApp?.category,
      activeProcessName: ctx.observation.activeApp?.processName,
      settingsSnapshot: settingsSnapshot(),
    });

    let response: string | null = null;
    let emotion: CompanionEmotion | null = null;
    const routed = buildLocalConversationResponse(intent, ctx, textInput);
    if (routed) {
      response = sanitizeVoiceResponse(routed);
    } else if (policy.allowed && !s.doNotDisturb) {
      try {
        const output = await getNewAIResponse(ctx);
        if (output.shouldSpeak && output.text) {
          response = sanitizeVoiceResponse(output.text);
          emotion = output.emotion ?? null;
        }
      } catch { /* AI error -> local fallback */ }
    }

    const aiDebug = getLastAIResult();
    const speechAiMeta: SpeechOptions = routed
      ? { aiProvider: "rule", aiStatus: "success", fallbackReason: "local_router" }
      : {
          aiProvider: aiDebug.source,
          aiModel: aiDebug.model,
          aiStatus: aiDebug.status,
          fallbackReason: aiDebug.fallbackReason,
          qualityRejectedReason: aiDebug.qualityRejectedReason,
        };
    if (!response) {
      response = buildVoiceFallback(textInput, ctx);
      speechAiMeta.aiProvider = aiDebug.source;
      speechAiMeta.aiStatus = "fallback";
      speechAiMeta.fallbackReason = aiDebug.fallbackReason ?? "text_fallback";
    }
    const shown = triggerSpeak(response, { emotion, source: "voice", priority: 90, lockMs: 1_800, ...speechAiMeta });
    addInteractionTrace({
      trigger: "text",
      source: aiDebug.source,
      textInputPreview: previewTraceText(textInput),
      intent,
      observationSummary: ctx.activityInsight.summary,
      activeAppCategory: ctx.observation.activeApp?.category,
      activeProcessName: ctx.observation.activeApp?.processName,
      selectedResponse: previewTraceText(response),
      responseSource: routed ? "local_router" : aiDebug.source,
      fallbackReason: routed ? "observation_question_router" : aiDebug.fallbackReason,
      speechPriority: 90,
      dropped: !shown,
      settingsSnapshot: settingsSnapshot(),
    });
  }, [settingsSnapshot, triggerSpeak]);

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
      addInteractionTrace({
        trigger: "click",
        suppressed: true,
        fallbackReason: "click_suppressed_after_voice",
        settingsSnapshot: settingsSnapshot(),
      });
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
      let aiMeta: SpeechOptions = {};

      // AI-first: 起動挨拶も Ollama/AI を先に試みる
      const s      = getSettings();
      if (s.doNotDisturb || s.quietMode) return;

      const events = getAllEvents();
      const ctx    = buildCompanionContext("return", snapshotRef.current, events, s);
      const policy = canSpeak("manual", s, snapshotRef.current, lastSpeechAtRef.current, countInLastHour());

      if (policy.allowed) {
        try {
          const output = await getNewAIResponse(ctx);
          aiMeta = aiSpeechMetaFromLastResult();
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
        aiMeta = { ...aiMeta, aiProvider: "rule", aiStatus: "fallback", fallbackReason: aiMeta.fallbackReason ?? "return_greeting_fallback" };
      }

      triggerSpeak(text, { emotion, source: "system", priority: 80, ...aiMeta });
    }, 1500);

    resetSleepTimer();

    return () => {
      clearTimeout(greetTimer);
      clearAllTimers();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state, speechText, spriteEmotion, onCharacterClick, triggerSpeak, triggerDragReaction,
    requestVoiceResponse, requestVoiceFromBlob,
    requestTextMessage,
    voiceListeningStart, voiceRecordingError,
    voiceUIState,
  };
}
