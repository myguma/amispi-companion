// クリックパターン検出 — 短時間内の連打を検出する純粋モジュール
// React に依存しない — テスト可能な純粋関数のみ

const WINDOW_MS  = 5000;
const THRESHOLD  = 5;

let _clicks: number[] = [];

/** クリックを記録し、古いエントリを刈り込む */
export function recordClick(): void {
  const now = Date.now();
  _clicks.push(now);
  _clicks = _clicks.filter((t) => now - t < WINDOW_MS);
}

/** 直近 WINDOW_MS 以内に THRESHOLD 回以上クリックされているか */
export function isOverClicked(): boolean {
  const now = Date.now();
  const recent = _clicks.filter((t) => now - t < WINDOW_MS);
  return recent.length >= THRESHOLD;
}

/** 連打カウンターをリセットする（発火後に呼ぶ） */
export function resetClicks(): void {
  _clicks = [];
}
