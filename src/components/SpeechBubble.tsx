// 吹き出しコンポーネント
// テキストを短く表示してフェードアウトする
// キャラクター上部に配置

interface SpeechBubbleProps {
  text: string | null;
}

export function SpeechBubble({ text }: SpeechBubbleProps) {
  if (!text) return null;

  return (
    <div className="speech-bubble" role="status" aria-live="polite">
      <span>{text}</span>
      {/* 吹き出しの三角形 */}
      <div className="speech-bubble-tail" aria-hidden="true" />
    </div>
  );
}
