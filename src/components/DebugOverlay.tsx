// デバッグオーバーレイ (開発モードのみ表示)
// 本番ビルドではこのコンポーネント自体をレンダリングしない

import { useEffect, useState } from "react";
import type { CompanionState } from "../types/companion";
import { getRecentEvents, getEventCount } from "../systems/memory/memoryStore";

interface DebugOverlayProps {
  state: CompanionState;
  speechText: string | null;
}

const isDev = import.meta.env.DEV;

export function DebugOverlay({ state, speechText }: DebugOverlayProps) {
  const [eventCount, setEventCount] = useState(0);
  const [lastEventType, setLastEventType] = useState<string>("-");

  useEffect(() => {
    if (!isDev) return;

    const interval = setInterval(() => {
      setEventCount(getEventCount());
      const recent = getRecentEvents(1);
      if (recent.length > 0) {
        setLastEventType(recent[0].type);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isDev) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        background: "rgba(0,0,0,0.7)",
        color: "#0f0",
        fontSize: 9,
        fontFamily: "monospace",
        padding: "2px 4px",
        pointerEvents: "none",
        zIndex: 100,
        lineHeight: 1.4,
      }}
    >
      <div>state: {state}</div>
      <div>events: {eventCount}</div>
      <div>last: {lastEventType}</div>
      {speechText && <div>text: {speechText.slice(0, 20)}</div>}
    </div>
  );
}
