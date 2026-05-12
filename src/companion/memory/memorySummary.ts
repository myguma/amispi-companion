// セッション間の休憩期間を分類する純粋ヘルパー
// React に依存しない — テスト可能な純粋関数のみ

import { getTimeSinceLastSession } from "../../systems/memory/memoryStore";

/** 前回セッション終了からの経過時間の種別 */
export type BreakKind = "none" | "short" | "hours" | "longDay";

const SHORT_BREAK_MS   = 30 * 60 * 1000;        // 30分
const HOURS_BREAK_MS   = 3 * 60 * 60 * 1000;    // 3時間
const LONG_DAY_BREAK_MS = 20 * 60 * 60 * 1000;  // 20時間

/**
 * 前回セッションからの経過時間に応じた休憩種別を返す。
 * 初回起動や短い再起動は "none" を返す。
 */
export function classifyBreak(): BreakKind {
  const elapsed = getTimeSinceLastSession();
  if (elapsed === null) return "none";
  if (elapsed >= LONG_DAY_BREAK_MS) return "longDay";
  if (elapsed >= HOURS_BREAK_MS)    return "hours";
  if (elapsed >= SHORT_BREAK_MS)    return "short";
  return "none";
}
