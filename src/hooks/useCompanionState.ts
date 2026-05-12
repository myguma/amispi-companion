// コンパニオン状態マシン
// タイマー競合を防ぐため全タイマーをここで一元管理する

import { useCallback, useEffect, useRef, useState } from "react";
import type { CompanionState, StateConfig } from "../types/companion";
import { DEFAULT_STATE_CONFIG } from "../types/companion";
import { logEvent } from "../systems/memory/memoryStore";
import { getAIResponse } from "../systems/ai/AIProvider";
import { getRecentEvents } from "../systems/memory/memoryStore";
import { pickDialogue, pickTimedGreeting } from "../systems/dialogue/dialogueData";
import { selectReaction } from "../companion/reactions/selectReaction";
import { recordReaction } from "../companion/reactions/reactionHistory";
import { getTimeTag } from "../companion/reactions/reactionData";
import { getSettings } from "../settings/store";
import { cryEngine } from "../companion/audio/FileCryEngine";
import type { ReactionTrigger } from "../companion/reactions/types";
import { recordClick, isOverClicked, resetClicks } from "../companion/reactions/clickPattern";
import { classifyBreak } from "../companion/memory/memorySummary";

interface UseCompanionStateReturn {
  state: CompanionState;
  speechText: string | null;
  onCharacterClick: () => void;
  triggerSpeak: (text?: string) => void;
  triggerDragReaction: () => void;
}

export function useCompanionState(
  config: StateConfig = DEFAULT_STATE_CONFIG,
  autonomousSpeechEnabled = false,
  isFullscreen = false
): UseCompanionStateReturn {
  const [state, setState] = useState<CompanionState>("idle");
  const [speechText, setSpeechText] = useState<string | null>(null);

  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autonomousSpeechRef = useRef(autonomousSpeechEnabled);
  useEffect(() => { autonomousSpeechRef.current = autonomousSpeechEnabled; }, [autonomousSpeechEnabled]);

  const isFullscreenRef = useRef(isFullscreen);
  useEffect(() => { isFullscreenRef.current = isFullscreen; }, [isFullscreen]);

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
  // ランダム独り言 (reaction system → fallback)
  // ──────────────────────────────────────────
  const scheduleIdleSpeech = useCallback(() => {
    if (idleSpeechTimerRef.current) clearTimeout(idleSpeechTimerRef.current);
    const delay = 120_000 + Math.random() * 120_000;
    idleSpeechTimerRef.current = setTimeout(() => {
      if (stateRef.current === "idle" && autonomousSpeechRef.current) {
        const text = fireReaction("randomIdle") ?? pickDialogue("random_idle");
        triggerSpeak(text);
      }
      scheduleIdleSpeech();
    }, delay);
  }, [triggerSpeak, fireReaction]);

  // ──────────────────────────────────────────
  // クリック → AI応答
  // ──────────────────────────────────────────
  const requestAIResponse = useCallback(async () => {
    setState("thinking");
    const events = getRecentEvents(10);
    const response = await getAIResponse(events);
    if (response) {
      triggerSpeak(response);
    } else {
      const text = fireReaction("click") ?? pickDialogue("touch_reaction");
      triggerSpeak(text);
    }
  }, [triggerSpeak, fireReaction]);

  // ──────────────────────────────────────────
  // ドラッグ反応
  // ──────────────────────────────────────────
  const triggerDragReaction = useCallback(() => {
    const text = fireReaction("dragStart");
    if (text) triggerSpeak(text);
  }, [fireReaction, triggerSpeak]);

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
    logEvent("app_start");

    const greetTimer = setTimeout(() => {
      const text = fireReaction("timedGreeting", [getTimeTag()]) ?? pickTimedGreeting();
      triggerSpeak(text);
    }, 1500);

    resetSleepTimer();
    scheduleIdleSpeech();

    return () => {
      clearTimeout(greetTimer);
      clearAllTimers();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, speechText, onCharacterClick, triggerSpeak, triggerDragReaction };
}
