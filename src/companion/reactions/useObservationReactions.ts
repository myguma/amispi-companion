// 観測スナップショット → 反応発火フック
// スナップショットが更新されるたびにデルタを計算し、
// 意味のある遷移があったときのみ反応を選択して発火する

import { useEffect, useRef, useState } from "react";
import { EMPTY_SNAPSHOT } from "../../observation/types";
import type { ObservationSnapshot } from "../../observation/types";
import { computeDelta } from "./activityDelta";
import { selectReaction } from "./selectReaction";
import { recordReaction } from "./reactionHistory";
import { cryEngine } from "../audio/FileCryEngine";
import { getSettings } from "../../settings/store";
import type { ReactionTrigger } from "./types";

export function useObservationReactions(
  snapshot: ObservationSnapshot,
  triggerSpeak: (text: string) => void
): { tinyText: string | null } {
  const prevSnapshotRef  = useRef<ObservationSnapshot>(EMPTY_SNAPSHOT);
  const hasInitialized   = useRef(false);
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
    // 自立発話OFF時は観測トリガーを一切発火しない
    if (!s.autonomousSpeechEnabled) {
      prevSnapshotRef.current = snapshot;
      return;
    }

    const prev  = prevSnapshotRef.current;
    const delta = computeDelta(prev, snapshot);
    prevSnapshotRef.current = snapshot;

    const fire = (trigger: ReactionTrigger): boolean => {
      const r = selectReaction({
        trigger,
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
        // displayMode: "none" はサウンドのみで表示なし
      }
      return true;
    };

    // 優先度の高い遷移イベントから順に判定し、最初にマッチしたもので終了
    // （同一ポーリングで複数の反応が重複しないよう1トリガーのみ発火）

    if (delta.fullscreenChanged && snapshot.fullscreenLikely) {
      fire("fullscreenDetected");
      return;
    }

    if (delta.activityChanged) {
      if (delta.nextActivity === "mediaWatching") { fire("mediaDetected"); return; }
      if (delta.nextActivity === "gamingLikely")  { fire("gamingDetected"); return; }
    }

    if (
      delta.idleBucketChanged &&
      (delta.nextIdleBucket === "long" || delta.nextIdleBucket === "veryLong") &&
      delta.prevIdleBucket !== "long" && delta.prevIdleBucket !== "veryLong"
    ) {
      fire("longIdle");
      return;
    }

    if (delta.downloadsPileChanged && (snapshot.folders.downloads?.fileCount ?? 0) > 20) {
      fire("downloadsPile");
      return;
    }

    if (delta.desktopPileChanged && (snapshot.folders.desktop?.fileCount ?? 0) > 15) {
      fire("desktopPile");
    }
  }, [snapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (tinyTimerRef.current) clearTimeout(tinyTimerRef.current);
    };
  }, []);

  return { tinyText };
}
