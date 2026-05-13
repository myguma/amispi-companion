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

type AlphaBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  coverage: number;
};

type ImageSnapshot = {
  rect: RectSnapshot | null;
  surfaceRect: RectSnapshot | null;
  alphaRect: RectSnapshot | null;
  naturalWidth: number;
  naturalHeight: number;
  currentSrc: string;
  dataUrl: string | null;
  complete: boolean;
  objectFit: string;
  objectPosition: string;
  transform: string;
  transformOrigin: string;
  animationName: string;
  animationDuration: string;
  overflow: string;
  effectiveState: string;
  renderMode: string;
  alphaBox: AlphaBox | null;
  alphaError: string | null;
};

interface DebugOverlayProps {
  enabled: boolean;
  suspended?: boolean;
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

function shortSrc(src: string): string {
  if (!src) return "-";
  try {
    const url = new URL(src, window.location.href);
    return url.pathname;
  } catch {
    return src;
  }
}

function measureAlphaBox(img: HTMLImageElement): { box: AlphaBox | null; error: string | null } {
  if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
    return { box: null, error: "not-ready" };
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { box: null, error: "no-canvas" };

  try {
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;
    let count = 0;

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 8) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          count += 1;
        }
      }
    }

    if (maxX < minX || maxY < minY) return { box: null, error: null };
    return {
      box: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        coverage: count / (canvas.width * canvas.height),
      },
      error: null,
    };
  } catch (e) {
    return { box: null, error: e instanceof Error ? e.message : String(e) };
  }
}

function mapAlphaRect(rect: RectSnapshot | null, img: HTMLImageElement, box: AlphaBox | null): RectSnapshot | null {
  if (!rect || !box || img.naturalWidth <= 0 || img.naturalHeight <= 0) return null;
  const left = rect.left + (box.x / img.naturalWidth) * rect.width;
  const top = rect.top + (box.y / img.naturalHeight) * rect.height;
  const width = (box.width / img.naturalWidth) * rect.width;
  const height = (box.height / img.naturalHeight) * rect.height;
  return {
    left: Math.round(left),
    top: Math.round(top),
    right: Math.round(left + width),
    bottom: Math.round(top + height),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function snapshotImage(): ImageSnapshot {
  const img = document.querySelector(".character-sprite-img") as HTMLImageElement | null;
  if (!img) {
    return {
      rect: null,
      surfaceRect: snapshotRect(document.querySelector(".character-sprite-surface")),
      alphaRect: null,
      naturalWidth: 0,
      naturalHeight: 0,
      currentSrc: "",
      dataUrl: null,
      complete: false,
      objectFit: "",
      objectPosition: "",
      transform: "",
      transformOrigin: "",
      animationName: "",
      animationDuration: "",
      overflow: "",
      effectiveState: "",
      renderMode: "",
      alphaBox: null,
      alphaError: "no-img",
    };
  }

  const surface = document.querySelector(".character-sprite-surface") as HTMLElement | null;
  const rect = snapshotRect(img);
  const style = window.getComputedStyle(img);
  const surfaceStyle = surface ? window.getComputedStyle(surface) : null;
  const parentStyle = img.parentElement ? window.getComputedStyle(img.parentElement) : null;
  const animEl = img.closest(".character-anim") as HTMLElement | null;
  const { box, error } = measureAlphaBox(img);

  return {
    rect,
    surfaceRect: snapshotRect(surface),
    alphaRect: mapAlphaRect(rect, img, box),
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    currentSrc: img.currentSrc || img.src,
    dataUrl: img.dataset.spriteUrl ?? null,
    complete: img.complete,
    objectFit: surfaceStyle?.backgroundSize ?? style.objectFit,
    objectPosition: surfaceStyle?.backgroundPosition ?? style.objectPosition,
    transform: surfaceStyle?.transform ?? parentStyle?.transform ?? style.transform,
    transformOrigin: surfaceStyle?.transformOrigin ?? parentStyle?.transformOrigin ?? style.transformOrigin,
    animationName: parentStyle?.animationName ?? style.animationName,
    animationDuration: parentStyle?.animationDuration ?? style.animationDuration,
    overflow: surfaceStyle?.overflow ?? parentStyle?.overflow ?? style.overflow,
    effectiveState: animEl?.dataset.state ?? "",
    renderMode: surface?.dataset.renderMode ?? img.dataset.renderMode ?? "img",
    alphaBox: box,
    alphaError: error,
  };
}

export function DebugOverlay({
  enabled,
  suspended = false,
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
  const active = !suspended && (enabled || isDev);
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
  const [imgInfo, setImgInfo] = useState<ImageSnapshot>(() => snapshotImage());

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
      setImgInfo(snapshotImage());
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
  const imgOverflow = !!imgInfo.rect && viewportH > 0 && imgInfo.rect.bottom > viewportH;
  const surfaceOverflow = !!imgInfo.surfaceRect && viewportH > 0 && imgInfo.surfaceRect.bottom > viewportH;
  const alphaOverflow = !!imgInfo.alphaRect && viewportH > 0 && imgInfo.alphaRect.bottom > viewportH;
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
      <RectBox rect={imgInfo.surfaceRect} color="#ff4fd8" label="surface" />
      <RectBox rect={imgInfo.rect} color="#ff8c3a" label="img" />
      <RectBox rect={imgInfo.alphaRect} color="#00ffd5" label="alpha" />
      <div
        style={{
          position: "absolute",
          left: 4,
          top: 4,
          maxWidth: 196,
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
        <div>state: {state} eff={imgInfo.effectiveState || "-"} speech={String(hasSpeech)} drag={String(isDragging)}</div>
        <div>scale={scale.toFixed(2)} expected={windowW}x{windowH}</div>
        <div>vh inner={viewport.innerWidth}x{viewport.innerHeight} client={viewport.clientWidth}x{viewport.clientHeight}</div>
        <div>visual={viewport.visualWidth ?? "n/a"}x{viewport.visualHeight ?? "n/a"}</div>
        <div>char={characterW}x{characterH} bottomPad={bottomPad} gap={speechBubbleGap}</div>
        <div>stage: {fmtRect(stageRect)} {stageOverflow ? "OVER" : ""}</div>
        <div>wrap: {fmtRect(wrapperRect)} {wrapperOverflow ? "OVER" : ""}</div>
        <div>renderMode={imgInfo.renderMode || "-"}</div>
        <div>surface: {fmtRect(imgInfo.surfaceRect)} {surfaceOverflow ? "OVER" : ""}</div>
        <div>img: {fmtRect(imgInfo.rect)} {imgOverflow ? "OVER" : ""}</div>
        <div>nat={imgInfo.naturalWidth}x{imgInfo.naturalHeight} ok={String(imgInfo.complete)}</div>
        <div>alpha: {imgInfo.alphaBox ? `${imgInfo.alphaBox.x},${imgInfo.alphaBox.y} ${imgInfo.alphaBox.width}x${imgInfo.alphaBox.height} ${(imgInfo.alphaBox.coverage * 100).toFixed(1)}%` : imgInfo.alphaError ?? "n/a"} {alphaOverflow ? "OVER" : ""}</div>
        <div>alphaRect: {fmtRect(imgInfo.alphaRect)}</div>
        <div>sprite: {shortSrc(imgInfo.currentSrc || imgInfo.dataUrl || "")}</div>
        <div>anim={imgInfo.animationName}/{imgInfo.animationDuration} ov={imgInfo.overflow}</div>
        <div>fit={imgInfo.objectFit} pos={imgInfo.objectPosition}</div>
        <div>tf={imgInfo.transform === "none" ? "none" : "yes"} origin={imgInfo.transformOrigin}</div>
        <div>speech: {fmtRect(speechRect)}</div>
        <div>update: {fmtRect(updateRect)} v={updateAvailableVersion ?? "-"} installing={String(installing)}</div>
        <div>ai: {lastAIResult.source}{lastAIResult.model ? `/${lastAIResult.model}` : ""}{aiAgeSec !== null ? ` ${aiAgeSec}s` : ""}</div>
        <div>events={eventCount} last={lastEventType}</div>
        {speechText && <div>text: {speechText.slice(0, 24)}</div>}
      </div>
    </>
  );
}
