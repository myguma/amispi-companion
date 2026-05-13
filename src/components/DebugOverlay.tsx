// デバッグオーバーレイ
// 開発時、または設定画面のデバッグモードON時のみ表示する

import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { CompanionState } from "../types/companion";
import { getRecentEvents, getEventCount } from "../systems/memory/memoryStore";
import type { LastAIResultDebug } from "../companion/ai/types";

type RectSnapshot = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type ViewportSnapshot = {
  innerWidth: number;
  innerHeight: number;
  clientWidth: number;
  clientHeight: number;
  visualWidth: number | null;
  visualHeight: number | null;
};

interface DebugOverlayProps {
  enabled: boolean;
  state: CompanionState;
  speechText: string | null;
  hasSpeech: boolean;
  isDragging: boolean;
  scale: number;
  windowW: number;
  windowH: number;
  characterW: number;
  characterH: number;
  bottomPad: number;
  speechBubbleGap: number;
  updateAvailableVersion: string | null;
  installing: boolean;
  lastAIResult: LastAIResultDebug;
  characterStageRef: RefObject<HTMLElement | null>;
  speechLayerRef: RefObject<HTMLElement | null>;
  updateBadgeRef: RefObject<HTMLElement | null>;
}

const isDev = import.meta.env.DEV;

function snapshotRect(el: Element | null | undefined): RectSnapshot | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    left: Math.round(r.left),
    top: Math.round(r.top),
    right: Math.round(r.right),
    bottom: Math.round(r.bottom),
    width: Math.round(r.width),
    height: Math.round(r.height),
  };
}

function RectBox({ rect, color, label }: { rect: RectSnapshot | null; color: string; label: string }) {
  if (!rect) return null;
  return (
    <div style={{
      position: "absolute",
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      border: `1px solid ${color}`,
      boxSizing: "border-box",
      pointerEvents: "none",
      zIndex: 998,
    }}>
      <span style={{
        position: "absolute",
        left: 2,
        top: 1,
        color,
        background: "rgba(0,0,0,0.68)",
        fontSize: 9,
        fontFamily: "monospace",
        padding: "0 2px",
      }}>
        {label}
      </span>
    </div>
  );
}

function fmtRect(rect: RectSnapshot | null): string {
  if (!rect) return "n/a";
  return `${rect.left},${rect.top} ${rect.width}x${rect.height} b=${rect.bottom}`;
}

export function DebugOverlay({
  enabled,
  state,
  speechText,
  hasSpeech,
  isDragging,
  scale,
  windowW,
  windowH,
  characterW,
  characterH,
  bottomPad,
  speechBubbleGap,
  updateAvailableVersion,
  installing,
  lastAIResult,
  characterStageRef,
  speechLayerRef,
  updateBadgeRef,
}: DebugOverlayProps) {
  const active = enabled || isDev;
  const [eventCount, setEventCount] = useState(0);
  const [lastEventType, setLastEventType] = useState<string>("-");
  const [viewport, setViewport] = useState<ViewportSnapshot>({
    innerWidth: 0,
    innerHeight: 0,
    clientWidth: 0,
    clientHeight: 0,
    visualWidth: null,
    visualHeight: null,
  });
  const [stageRect, setStageRect] = useState<RectSnapshot | null>(null);
  const [wrapperRect, setWrapperRect] = useState<RectSnapshot | null>(null);
  const [speechRect, setSpeechRect] = useState<RectSnapshot | null>(null);
  const [updateRect, setUpdateRect] = useState<RectSnapshot | null>(null);
  const [hitRect, setHitRect] = useState<RectSnapshot | null>(null);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setEventCount(getEventCount());
      const recent = getRecentEvents(1);
      if (recent.length > 0) {
        setLastEventType(recent[0].type);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const sample = () => {
      const vv = window.visualViewport;
      setViewport({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        visualWidth: vv ? Math.round(vv.width) : null,
        visualHeight: vv ? Math.round(vv.height) : null,
      });
      setStageRect(snapshotRect(characterStageRef.current));
      setWrapperRect(snapshotRect(document.querySelector(".character-wrapper")));
      setSpeechRect(snapshotRect(speechLayerRef.current));
      setUpdateRect(snapshotRect(updateBadgeRef.current));
      setHitRect(snapshotRect(document.querySelector(".character-hit-target")));
    };

    sample();
    const interval = setInterval(sample, 250);
    window.addEventListener("resize", sample);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", sample);
    };
  }, [active, characterStageRef, speechLayerRef, updateBadgeRef]);

  if (!active) return null;

  const viewportH = viewport.innerHeight || viewport.clientHeight || viewport.visualHeight || 0;
  const wrapperOverflow = !!wrapperRect && viewportH > 0 && wrapperRect.bottom > viewportH;
  const stageOverflow = !!stageRect && viewportH > 0 && stageRect.bottom > viewportH;
  const aiAgeSec = lastAIResult.updatedAt ? Math.round((Date.now() - lastAIResult.updatedAt) / 1000) : null;

  return (
    <>
      <div style={{
        position: "absolute",
        inset: 0,
        border: "1px solid rgba(255,255,255,0.75)",
        boxSizing: "border-box",
        pointerEvents: "none",
        zIndex: 997,
      }} />
      <RectBox rect={stageRect} color="#53d769" label="stage" />
      <RectBox rect={wrapperRect} color="#ffcc00" label="wrapper" />
      <RectBox rect={speechRect} color="#5ac8fa" label="speech" />
      <RectBox rect={updateRect} color="#ff6b9a" label="update" />
      <RectBox rect={hitRect} color="#c77dff" label="hit" />
      <div
        style={{
          position: "absolute",
          left: 4,
          top: 4,
          maxWidth: 192,
          background: "rgba(0,0,0,0.78)",
          color: "#b8ffb8",
          fontSize: 9,
          fontFamily: "monospace",
          padding: "4px 5px",
          pointerEvents: "none",
          zIndex: 999,
          lineHeight: 1.35,
          borderRadius: 4,
        }}
      >
        <div>state: {state} speech={String(hasSpeech)} drag={String(isDragging)}</div>
        <div>scale={scale.toFixed(2)} expected={windowW}x{windowH}</div>
        <div>vh inner={viewport.innerWidth}x{viewport.innerHeight} client={viewport.clientWidth}x{viewport.clientHeight}</div>
        <div>visual={viewport.visualWidth ?? "n/a"}x{viewport.visualHeight ?? "n/a"}</div>
        <div>char={characterW}x{characterH} bottomPad={bottomPad} gap={speechBubbleGap}</div>
        <div>stage: {fmtRect(stageRect)} {stageOverflow ? "OVER" : ""}</div>
        <div>wrap: {fmtRect(wrapperRect)} {wrapperOverflow ? "OVER" : ""}</div>
        <div>speech: {fmtRect(speechRect)}</div>
        <div>update: {fmtRect(updateRect)} v={updateAvailableVersion ?? "-"} installing={String(installing)}</div>
        <div>ai: {lastAIResult.source}{lastAIResult.model ? `/${lastAIResult.model}` : ""}{aiAgeSec !== null ? ` ${aiAgeSec}s` : ""}</div>
        <div>events={eventCount} last={lastEventType}</div>
        {speechText && <div>text: {speechText.slice(0, 24)}</div>}
      </div>
    </>
  );
}
