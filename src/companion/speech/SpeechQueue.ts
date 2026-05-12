// 発話キュー — 優先度管理・重複排除
// React に依存しない純粋クラス

export type SpeechPriority = 0 | 1 | 2 | 3;
// 0: idle/autonomous, 1: observation, 2: system, 3: manual/voice

export type QueuedSpeech = {
  text: string;
  priority: SpeechPriority;
  source: string;
  addedAt: number;
};

const DUPLICATE_WINDOW_MS = 30_000; // 30秒以内に同じテキストを出さない

export class SpeechQueue {
  private _queue: QueuedSpeech[] = [];
  private _recentTexts: { text: string; at: number }[] = [];

  /** キューに発話候補を追加する。重複・優先度違反なら捨てる */
  enqueue(text: string, priority: SpeechPriority, source: string): boolean {
    if (!text.trim()) return false;

    // 重複チェック
    const now = Date.now();
    this._recentTexts = this._recentTexts.filter((r) => now - r.at < DUPLICATE_WINDOW_MS);
    if (this._recentTexts.some((r) => r.text === text)) return false;

    // 低優先度が speaking 中 (キューに高優先がある) なら捨てる
    if (priority < 2 && this._queue.some((q) => q.priority >= 2)) return false;

    this._queue.push({ text, priority, source, addedAt: now });
    // 高優先度順ソート
    this._queue.sort((a, b) => b.priority - a.priority);
    return true;
  }

  /** 次の発話を取り出す */
  dequeue(): QueuedSpeech | null {
    const item = this._queue.shift() ?? null;
    if (item) {
      this._recentTexts.push({ text: item.text, at: Date.now() });
    }
    return item;
  }

  get length(): number { return this._queue.length; }

  clear(): void { this._queue = []; }
}
