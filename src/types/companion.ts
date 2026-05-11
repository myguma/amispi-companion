// コンパニオンの全型定義
// キャラクター名・ロア・個性はここに書かない（データ層で管理する）

// ============================================================
// 状態型
// ============================================================

export type CompanionState =
  | "idle"       // デフォルト: 静かなアニメーション
  | "touched"    // クリック後の短い反応
  | "sleep"      // 無操作タイムアウト後
  | "waking"     // sleepからidleへの遷移
  | "thinking"   // AI応答を待機中
  | "speaking"   // 吹き出し表示中
  | "focused"    // 将来: 深作業中 (未実装)
  | "low_energy"; // 将来: 低エネルギー状態 (未実装)

// ============================================================
// 状態設定
// ============================================================

export interface StateConfig {
  /** 無操作でsleepに移行するまでのミリ秒 */
  sleepTimeoutMs: number;
  /** touched状態の継続時間 */
  touchedDurationMs: number;
  /** waking状態の継続時間 */
  wakingDurationMs: number;
  /** 吹き出し表示時間 */
  speechBubbleDurationMs: number;
}

export const DEFAULT_STATE_CONFIG: StateConfig = {
  sleepTimeoutMs: 5 * 60 * 1000,
  touchedDurationMs: 2000,
  wakingDurationMs: 1500,
  speechBubbleDurationMs: 6000,
};

// ============================================================
// キャラクター設定
// ============================================================

export interface CharacterConfig {
  /** public/characters/ 以下のディレクトリ名 */
  id: string;
  /** 表示名（UI表示用。ロアに依存しない） */
  displayName: string;
  /** スプライト幅 (px) */
  width: number;
  /** スプライト高さ (px) */
  height: number;
}

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  id: "default",
  displayName: "Spirit",
  width: 160,
  height: 160,
};

// ============================================================
// ダイアログ型
// ============================================================

export type DialogueTrigger =
  | "idle_greeting"
  | "touch_reaction"
  | "wake_reaction"
  | "speaking_response"
  | "random_idle"
  | "morning_greeting"
  | "afternoon_greeting"
  | "evening_greeting"
  | "night_greeting"
  | "drag_reaction";

export interface DialogueEntry {
  id: string;
  trigger: DialogueTrigger;
  lines: string[];
  /** 抽選重み（省略時は1） */
  weight?: number;
}

// ============================================================
// メモリ型
// ============================================================

export type MemoryEventType =
  | "app_start"
  | "character_clicked"
  | "state_changed"
  | "speech_shown"
  | "note_saved";

export interface MemoryEvent {
  id: string;
  type: MemoryEventType;
  timestamp: number;
  data?: Record<string, unknown>;
}

// ============================================================
// AIプロバイダー型
// ============================================================

export interface AIProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  respond(recentEvents: MemoryEvent[], userInput?: string): Promise<string>;
}
