// キャラクターコンポーネント
// スプライト画像があれば使用し、なければSVGフォールバックを表示する
// どのキャラクター名・ロアにも依存しない

import { useState } from "react";
import type { CompanionState, CharacterConfig } from "../types/companion";
import { DEFAULT_CHARACTER_CONFIG } from "../types/companion";
import type { CompanionEmotion } from "../companion/reactions/types";

/**
 * CompanionEmotion → スプライト選択に使う CompanionState へのマッピング。
 * shy / concerned は専用スプライトがないため近いものにフォールバック。
 */
export function emotionToSpriteState(emotion: CompanionEmotion): CompanionState {
  switch (emotion) {
    case "idle":      return "idle";
    case "aware":     return "touched";
    case "touched":   return "touched";
    case "thinking":  return "thinking";
    case "speaking":  return "speaking";
    case "sleep":     return "sleep";
    case "waking":    return "waking";
    case "shy":       return "idle";      // 専用スプライトなし → idle
    case "concerned": return "touched";   // 専用スプライトなし → touched
    default:          return "idle";
  }
}

interface CharacterProps {
  state: CompanionState;
  config?: CharacterConfig;
  onClick: () => void;
  isDragging?: boolean;
  facingRight?: boolean;
}

/** 状態に対応するスプライトURLを返す（なければフォールバック順で試みる） */
function getSpriteUrl(
  characterId: string,
  state: CompanionState
): string[] {
  const base = `/characters/${characterId}`;
  return [
    `${base}/${state}.png`,
    `${base}/idle.png`,
  ];
}

/** スプライト画像を試みる。失敗したらSVGフォールバックを使う */
function SpriteImage({
  urls,
  width,
  height,
  onFallback,
}: {
  urls: string[];
  width: number;
  height: number;
  onFallback: () => void;
}) {
  const [urlIndex, setUrlIndex] = useState(0);

  if (urlIndex >= urls.length) return null;

  return (
    <img
      src={urls[urlIndex]}
      width={width}
      height={height}
      style={{ imageRendering: "pixelated" }}
      onError={() => {
        if (urlIndex + 1 >= urls.length) {
          onFallback();
        } else {
          setUrlIndex((i) => i + 1);
        }
      }}
      alt=""
      draggable={false}
    />
  );
}

/** SVGフォールバック — 抽象的な「精霊orb」プレースホルダー */
function SpiritOrbFallback({
  state,
  width,
  height,
}: {
  state: CompanionState;
  width: number;
  height: number;
}) {
  return (
    <div
      className="spirit-orb"
      data-state={state}
      style={{ width, height }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%" }}
      >
        {/* 外側のグロー */}
        <defs>
          <radialGradient id="orbGrad" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#e0d7ff" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#a890f0" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6a40d0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="innerGrad" cx="40%" cy="35%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#c4a8ff" stopOpacity="0.3" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* グロー背景 */}
        <circle cx="50" cy="50" r="42" fill="url(#orbGrad)" filter="url(#glow)" />

        {/* 本体 */}
        <ellipse cx="50" cy="52" rx="28" ry="32" fill="url(#innerGrad)" />

        {/* 目 — 状態によって変化 */}
        {state === "sleep" ? (
          <>
            {/* 閉じた目 */}
            <path d="M38 52 Q41 49 44 52" stroke="#5530a0" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M56 52 Q59 49 62 52" stroke="#5530a0" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        ) : state === "thinking" ? (
          <>
            {/* 考え中の目 */}
            <circle cx="41" cy="51" r="3.5" fill="#5530a0" />
            <circle cx="59" cy="51" r="3.5" fill="#5530a0" />
            <circle cx="42" cy="50" r="1.2" fill="white" />
            <circle cx="60" cy="50" r="1.2" fill="white" />
            {/* 思考ドット */}
            <circle cx="50" cy="30" r="2" fill="#a890f0" opacity="0.7" />
            <circle cx="56" cy="26" r="1.5" fill="#a890f0" opacity="0.5" />
            <circle cx="62" cy="22" r="1" fill="#a890f0" opacity="0.3" />
          </>
        ) : state === "touched" ? (
          <>
            {/* びっくりした目 */}
            <ellipse cx="41" cy="50" rx="4" ry="5" fill="#5530a0" />
            <ellipse cx="59" cy="50" rx="4" ry="5" fill="#5530a0" />
            <circle cx="42" cy="49" r="1.5" fill="white" />
            <circle cx="60" cy="49" r="1.5" fill="white" />
          </>
        ) : (
          <>
            {/* 通常の目 */}
            <circle cx="41" cy="51" r="3.5" fill="#5530a0" />
            <circle cx="59" cy="51" r="3.5" fill="#5530a0" />
            <circle cx="42" cy="50" r="1.2" fill="white" />
            <circle cx="60" cy="50" r="1.2" fill="white" />
          </>
        )}

        {/* sleepのZzzパーティクル */}
        {state === "sleep" && (
          <>
            <text x="66" y="38" fontSize="10" fill="#a890f0" opacity="0.8" className="zzz-1">z</text>
            <text x="72" y="28" fontSize="8" fill="#a890f0" opacity="0.5" className="zzz-2">z</text>
            <text x="76" y="20" fontSize="6" fill="#a890f0" opacity="0.3" className="zzz-3">z</text>
          </>
        )}
      </svg>
    </div>
  );
}

export function Character({
  state,
  config = DEFAULT_CHARACTER_CONFIG,
  onClick,
  isDragging = false,
  facingRight = false,
}: CharacterProps) {
  const [useFallback, setUseFallback] = useState(false);

  const effectiveState: CompanionState = isDragging ? "touched" : state;
  const spriteUrls = getSpriteUrl(config.id, effectiveState);

  return (
    <div
      className="character-wrapper"
      onClick={onClick}
      style={{
        width: config.width,
        height: config.height,
        cursor: "pointer",
        position: "relative",
        transform: facingRight ? "scaleX(-1)" : undefined,
        transition: "transform 0.1s ease",
      }}
    >
      {!useFallback ? (
        <SpriteImage
          urls={spriteUrls}
          width={config.width}
          height={config.height}
          onFallback={() => setUseFallback(true)}
        />
      ) : (
        <SpiritOrbFallback
          state={effectiveState}
          width={config.width}
          height={config.height}
        />
      )}
    </div>
  );
}
