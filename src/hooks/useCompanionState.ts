// コンパニオン状態マシン
// タイマー競合を防ぐため全タイマーをここで一元管理する
// 状態遷移は docs/ARCHITECTURE.md の State Transition Table を参照

import { useCallback, useEffect, useRef, useState } from "react";
import type { CompanionState, StateConfig } from "../types/companion";
import { DEFAULT_STATE_CONFIG } from "../types/companion";
import { logEvent } from "../systems/memory/memoryStore";
import { getAIResponse } from "../systems/ai/AIProvider";
import { getRecentEvents } from "../systems/memory/memoryStore";
import { pickDialogue } from "../systems/dialogue/dialogueData";

interface UseCompanionStateReturn {
  state: CompanionState;
  speechText: string | null;
  onCharacterClick: () => void;
  triggerSpeak: (text?: string) => void;
}

export function useCompanionState(
  config: StateConfig = DEFAULT_STATE_CONFIG
): UseCompanionStateReturn {
  const [state, setState] = useState<CompanionState>("idle");
  const [speechText, setSpeechText] = useState<string | null>(null);

  // 全タイマーをrefで管理し、アンマウント時に必ずクリアする
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    if (idleSpeechTimerRef.current) clearTimeout(idleSpeechTimerRef.current);
    sleepTimerRef.current = null;
    transitionTimerRef.current = null;
    speechTimerRef.current = null;
    idleSpeechTimerRef.current = null;
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
  // AI応答のリクエスト
  // ──────────────────────────────────────────
  const requestAIResponse = useCallback(async () => {
    setState("thinking");
    const events = getRecentEvents(10);
    const response = await getAIResponse(events);
    if (response) {
      triggerSpeak(response);
    } else {
      // AIが応答しない場合はダイアログデータから選ぶ
      triggerSpeak(pickDialogue("touch_reaction"));
    }
  }, [triggerSpeak]);

  // ──────────────────────────────────────────
  // クリック処理
  // ──────────────────────────────────────────
  const onCharacterClick = useCallback(() => {
    setState((prev) => {
      logEvent("character_clicked", { fromState: prev });

      if (prev === "sleep") {
        // sleep → waking → idle
        clearAllTimers();
        transitionTimerRef.current = setTimeout(() => {
          const line = pickDialogue("wake_reaction");
          triggerSpeak(line);
        }, config.wakingDurationMs);
        return "waking";
      }

      if (prev === "idle") {
        // idle → touched → (AI request) → thinking → speaking → idle
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = setTimeout(() => {
          void requestAIResponse();
        }, config.touchedDurationMs);

        resetSleepTimer();
        return "touched";
      }

      if (prev === "speaking") {
        // 吹き出し表示中のクリックはタッチ反応
        setSpeechText(pickDialogue("touch_reaction"));
        resetSleepTimer();
        return "speaking";
      }

      // thinking中は操作を受け付けない
      return prev;
    });
  }, [
    clearAllTimers,
    config.wakingDurationMs,
    config.touchedDurationMs,
    triggerSpeak,
    requestAIResponse,
    resetSleepTimer,
  ]);

  // ──────────────────────────────────────────
  // 初期化
  // ──────────────────────────────────────────
  useEffect(() => {
    logEvent("app_start");

    // 少し遅らせて起動挨拶を表示
    const greetTimer = setTimeout(() => {
      triggerSpeak(pickDialogue("idle_greeting"));
    }, 1500);

    resetSleepTimer();

    return () => {
      clearTimeout(greetTimer);
      clearAllTimers();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, speechText, onCharacterClick, triggerSpeak };
}
