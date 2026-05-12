// tiny displayMode 用コンポーネント
// 全画面・メディア・ゲーム中に使う控えめな一言表示

interface TinyWhisperProps {
  text: string | null;
}

export function TinyWhisper({ text }: TinyWhisperProps) {
  if (!text) return null;

  return (
    <div className="tiny-whisper" role="status" aria-live="polite">
      {text}
    </div>
  );
}
