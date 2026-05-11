// ダイアログデータ
// 注意: このファイルはキャラクター個性を決める唯一のテキスト層
// Amispi本来のキャラクター声に差し替える場合はこのファイルを置き換える
// コード側はここのデータを参照するだけで、個性に依存しない

import type { DialogueEntry, DialogueTrigger } from "../../types/companion";

const DIALOGUE_DATA: DialogueEntry[] = [
  // ──── idle_greeting ────────────────────────────────────────
  {
    id: "ig_01",
    trigger: "idle_greeting",
    lines: [
      "...",
      "Here.",
      "Still here.",
      "Watching the light.",
    ],
  },

  // ──── touch_reaction ───────────────────────────────────────
  {
    id: "tr_01",
    trigger: "touch_reaction",
    lines: [
      "Ah—",
      "Oh.",
      "Yes?",
      "Mm.",
      "You found me.",
    ],
  },
  {
    id: "tr_02",
    trigger: "touch_reaction",
    lines: [
      "What is it?",
      "I'm here.",
      "...",
    ],
    weight: 0.5,
  },

  // ──── wake_reaction ────────────────────────────────────────
  {
    id: "wr_01",
    trigger: "wake_reaction",
    lines: [
      "Mm... still here.",
      "Back.",
      "Oh — you returned.",
      "Was I gone long?",
    ],
  },

  // ──── speaking_response ────────────────────────────────────
  {
    id: "sr_01",
    trigger: "speaking_response",
    lines: [
      "Something is moving.",
      "I notice things.",
      "Time passes strangely here.",
      "You work in interesting ways.",
    ],
  },

  // ──── random_idle ──────────────────────────────────────────
  {
    id: "ri_01",
    trigger: "random_idle",
    lines: [
      "...",
      "Quiet today.",
      "Still working?",
      "I'm nearby.",
    ],
    weight: 2,
  },
  {
    id: "ri_02",
    trigger: "random_idle",
    lines: [
      "Something's on my mind.",
      "Strange feeling.",
    ],
    weight: 0.5,
  },
];

/**
 * トリガーに対応するセリフをランダムに1行選ぶ
 * 重み付き抽選を行う
 */
export function pickDialogue(trigger: DialogueTrigger): string {
  const entries = DIALOGUE_DATA.filter((e) => e.trigger === trigger);
  if (entries.length === 0) return "...";

  const totalWeight = entries.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  let rand = Math.random() * totalWeight;

  let chosen = entries[0];
  for (const entry of entries) {
    rand -= entry.weight ?? 1;
    if (rand <= 0) {
      chosen = entry;
      break;
    }
  }

  const lines = chosen.lines;
  return lines[Math.floor(Math.random() * lines.length)];
}
