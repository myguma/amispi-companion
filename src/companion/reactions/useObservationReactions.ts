// 観測スナップショット → 反応発火フック
// スナップショットが更新されるたびにデルタを計算し、
// 意味のある遷移があったときのみ反応を選択して発火する

import { useEffect, useRef, useState } from "react";
import { EMPTY_SNAPSHOT } from "../../observation/types";
import type { ObservationSnapshot } from "../../observation/types";
import type { InferredActivity } from "../activity/inferActivity";
import { computeDelta } from "./activityDelta";
import { selectReaction } from "./selectReaction";
import { recordReaction } from "./reactionHistory";
import { cryEngine } from "../audio/FileCryEngine";
import { getSettings } from "../../settings/store";
import type { ReactionTrigger } from "./types";
import { getRecentEvents } from "../../systems/memory/memoryStore";
import { buildCompanionContext } from "../../systems/ai/buildCompanionContext";
import { getAIResponse as getNewAIResponse } from "../ai/AIProviderManager";

// deepFocus / gaming / watchingVideo 中は自律発話を抑制する
const SILENT_KINDS: readonly InferredActivity[] = ["deepFocus", "gaming", "watchingVideo"];

// 直前の InferredActivity から遷移としてふさわしいかを判定するヘルパー
function isValidTransitionFrom(prev: InferredActivity): boolean {
  // 既に同じカテゴリにいた / away からの復帰は別トリガーで処理済みのためスキップ
  return prev !== "away" && prev !== "deepFocus";
}

export function useObservationReactions(
  snapshot: ObservationSnapshot,
  triggerSpeak: (text: string) => void
): { tinyText: string | null } {
  const prevSnapshotRef = useRef<ObservationSnapshot>(EMPTY_SNAPSHOT);
  const hasInitialized  = useRef(false);
  const [tinyText, setTinyText] = useState<string | null>(null);
  const tinyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTiny = (text: string, durationMs: number) => {
    if (tinyTimerRef.current) clearTimeout(tinyTimerRef.current);
    setTinyText(text);
    tinyTimerRef.current = setTimeout(() => setTinyText(null), durationMs);
  };

  useEffect(() => {
    // 最初のスナップショットは基準値として保存するだけ（誤発火防止）
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      prevSnapshotRef.current = snapshot;
      return;
    }

    const s = getSettings();
    // 自律発話 OFF 時は観測トリガーを一切発火しない
    if (!s.autonomousSpeechEnabled) {
      prevSnapshotRef.current = snapshot;
      return;
    }

    const prev  = prevSnapshotRef.current;
    const delta = computeDelta(prev, snapshot);
    prevSnapshotRef.current = snapshot;

    const currentKind = delta.nextInferredKind;

    // 固定テキストによる発火 (AI 失敗時の fallback)
    const fire = (trigger: ReactionTrigger, tags?: string[]): boolean => {
      const r = selectReaction({
        trigger,
        tags,
        isFullscreen: snapshot.fullscreenLikely,
        policy: {
          autonomousSpeech:              s.autonomousSpeechEnabled,
          cryEnabled:                    s.cryEnabled,
          maxAutonomousReactionsPerHour: s.maxAutonomousReactionsPerHour,
          suppressWhenFullscreen:        s.suppressWhenFullscreen,
          suppressWhenFocus:             s.focusMode,
          quietMode:                     s.quietMode,
          doNotDisturb:                  s.doNotDisturb,
        },
      });
      if (!r) return false;

      recordReaction(r.id);
      if (r.cry && s.cryEnabled) void cryEngine.play(r.cry);

      if (r.text) {
        if (r.displayMode === "tiny") {
          showTiny(r.text, r.durationMs);
        } else if (r.displayMode === "bubble") {
          triggerSpeak(r.text);
        }
      }
      return true;
    };

    // AI-first helper: AI を試み、失敗時は fire() にフォールバック
    const tryAIOrFire = async (trigger: ReactionTrigger, tags?: string[]): Promise<boolean> => {
      try {
        const events = getRecentEvents(20);
        const ctx    = buildCompanionContext("observation", snapshot, events, s);
        const output = await getNewAIResponse(ctx);
        if (output.shouldSpeak && output.text) {
          triggerSpeak(output.text);
          return true;
        }
      } catch { /* AI エラー → fire() へ */ }
      return fire(trigger, tags);
    };

    // ── 1. 全画面遷移 (最優先・固定テキスト) ────────────────────────
    if (delta.fullscreenChanged && snapshot.fullscreenLikely) {
      fire("fullscreenDetected");
      return;
    }

    // ── 2. メディア / ゲーム遷移 (AI-first) ─────────────────────────
    if (delta.activityChanged) {
      if (delta.nextActivity === "mediaWatching") {
        void tryAIOrFire("mediaDetected");
        return;
      }
      if (delta.nextActivity === "gamingLikely") {
        void tryAIOrFire("gamingDetected");
        return;
      }
    }

    // ── 3. 長時間 idle (AI-first) ───────────────────────────────────
    if (
      delta.idleBucketChanged &&
      (delta.nextIdleBucket === "long" || delta.nextIdleBucket === "veryLong") &&
      delta.prevIdleBucket !== "long" && delta.prevIdleBucket !== "veryLong"
    ) {
      void tryAIOrFire("longIdle");
      return;
    }

    // ── 4. Downloads / Desktop pile (固定テキスト) ───────────────────
    if (delta.downloadsPileChanged && (snapshot.folders.downloads?.fileCount ?? 0) > 20) {
      fire("downloadsPile");
      return;
    }

    if (delta.desktopPileChanged && (snapshot.folders.desktop?.fileCount ?? 0) > 15) {
      fire("desktopPile");
      return;
    }

    // ── 5. InferredActivity 遷移 (AI-first) ─────────────────────────
    // deepFocus / gaming / watchingVideo 中は以降の遷移通知を抑制
    if (SILENT_KINDS.includes(currentKind)) return;
    // DND / quiet 時も抑制
    if (s.doNotDisturb || s.quietMode) return;
    // 全画面中も抑制
    if (snapshot.fullscreenLikely && s.suppressWhenFullscreen) return;

    if (delta.inferredKindChanged) {
      const { prevInferredKind, nextInferredKind } = delta;

      // 音楽制作開始: * → composing (deepFocusからの遷移を除く)
      if (nextInferredKind === "composing" && prevInferredKind !== "composing") {
        void tryAIOrFire("activityTransition", ["composing_start"]);
        return;
      }

      // コーディング開始: 非coding/非deepFocus → coding (awayからの復帰を除く)
      if (
        (nextInferredKind === "coding") &&
        prevInferredKind !== "coding" &&
        prevInferredKind !== "deepFocus" &&
        isValidTransitionFrom(prevInferredKind)
      ) {
        void tryAIOrFire("activityTransition", ["coding_start"]);
        return;
      }

      // 音楽再生開始: * → listeningMusic (watchingVideoからの連続変化を除く)
      if (
        nextInferredKind === "listeningMusic" &&
        prevInferredKind !== "listeningMusic" &&
        prevInferredKind !== "watchingVideo"
      ) {
        void tryAIOrFire("activityTransition", ["music_start"]);
        return;
      }

      // 離席から復帰: away/idle(long) → active系 (coding/browsing/composing等)
      if (
        (prevInferredKind === "away" || delta.prevIdleBucket === "long" || delta.prevIdleBucket === "veryLong") &&
        nextInferredKind !== "away" && nextInferredKind !== "idle" && nextInferredKind !== "unknown"
      ) {
        void tryAIOrFire("activityTransition", ["return_from_away"]);
        return;
      }
    }
  }, [snapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (tinyTimerRef.current) clearTimeout(tinyTimerRef.current);
    };
  }, []);

  return { tinyText };
}
