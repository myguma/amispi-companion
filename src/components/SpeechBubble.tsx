// 吹き出しコンポーネント
// テキストを短く表示してフェードアウトする
// キャラクター上部に配置

import { useEffect, useMemo, useState } from "react";
import type { LastAIResultDebug } from "../companion/ai/types";

interface SpeechBubbleProps {
  text: string | null;
  debugMode?: boolean;
  aiResult?: LastAIResultDebug;
}

const PREVIEW_MAX_CHARS = 88;
const PREVIEW_MAX_LINES = 4;

function isLongSpeech(text: string): boolean {
  return text.length > PREVIEW_MAX_CHARS || text.split(/\r?\n/).length > PREVIEW_MAX_LINES;
}

function buildPreview(text: string): string {
  const normalized = text.trim();
  if (!isLongSpeech(normalized)) return normalized;

  const lineLimited = normalized.split(/\r?\n/).slice(0, PREVIEW_MAX_LINES).join("\n");
  const raw = lineLimited.length > PREVIEW_MAX_CHARS
    ? lineLimited.slice(0, PREVIEW_MAX_CHARS)
    : lineLimited;
  const boundary = Math.max(
    raw.lastIndexOf("。"),
    raw.lastIndexOf("！"),
    raw.lastIndexOf("？"),
    raw.lastIndexOf("、"),
    raw.lastIndexOf("."),
    raw.lastIndexOf("!"),
    raw.lastIndexOf("?")
  );
  const cut = boundary >= 36 ? raw.slice(0, boundary + 1) : raw.trimEnd();
  return `${cut}…`;
}

export function SpeechBubble({ text, debugMode = false, aiResult }: SpeechBubbleProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = useMemo(() => text ? buildPreview(text) : "", [text]);
  const longSpeech = !!text && isLongSpeech(text);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  if (!text) return null;

  return (
    <>
      <div className="speech-bubble" role="status" aria-live="polite">
        {debugMode && aiResult && aiResult.source !== "none" && (
          <span className="speech-bubble-ai-badge">
            {aiResult.source}{aiResult.model ? ` / ${aiResult.model}` : ""}{aiResult.status ? ` / ${aiResult.status}` : ""}
          </span>
        )}
        <span>{longSpeech ? preview : text}</span>
        {longSpeech && (
          <button className="speech-bubble-more" type="button" onClick={() => setExpanded(true)}>
            全文を見る
          </button>
        )}
        {/* 吹き出しの三角形 */}
        <div className="speech-bubble-tail" aria-hidden="true" />
      </div>
      {expanded && (
        <div className="speech-full-panel" role="dialog" aria-label="発話全文">
          <div className="speech-full-panel-header">
            {debugMode && aiResult && aiResult.source !== "none" && (
              <span className="speech-bubble-ai-badge">
                {aiResult.source}{aiResult.model ? ` / ${aiResult.model}` : ""}{aiResult.status ? ` / ${aiResult.status}` : ""}
              </span>
            )}
            <button className="speech-full-panel-close" type="button" onClick={() => setExpanded(false)} aria-label="閉じる">
              閉じる
            </button>
          </div>
          <div className="speech-full-panel-text">{text}</div>
        </div>
      )}
    </>
  );
}
