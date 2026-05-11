// ダイアログデータ
// 注意: このファイルはキャラクター個性を決める唯一のテキスト層
// Amispi本来のキャラクター声に差し替える場合はこのファイルを置き換える
// コード側はここのデータを参照するだけで、個性に依存しない

import type { DialogueEntry, DialogueTrigger } from "../../types/companion";

const DIALOGUE_DATA: DialogueEntry[] = [
  // ──── idle_greeting (フォールバック用) ───────────────────────
  {
    id: "ig_00",
    trigger: "idle_greeting",
    lines: ["...いるよ", "ここにいる"],
  },

  // ──── morning_greeting (5〜11時) ──────────────────────────
  {
    id: "mg_01",
    trigger: "morning_greeting",
    lines: [
      "おはよう",
      "...おはよう。早いね",
      "朝か。今日もよろしく",
      "...起きてる？",
    ],
  },

  // ──── afternoon_greeting (11〜17時) ──────────────────────
  {
    id: "ag_01",
    trigger: "afternoon_greeting",
    lines: [
      "...いるよ",
      "ここにいる",
      "何か用？",
      "お昼だね",
    ],
  },

  // ──── evening_greeting (17〜22時) ────────────────────────
  {
    id: "eg_01",
    trigger: "evening_greeting",
    lines: [
      "お疲れ様",
      "...夕方になったね",
      "今日どうだった",
      "そろそろ休む？",
    ],
  },

  // ──── night_greeting (22〜5時) ────────────────────────────
  {
    id: "ng_01",
    trigger: "night_greeting",
    lines: [
      "まだ起きてるの",
      "...深夜だよ",
      "夜更かしかな",
      "...一緒にいるよ",
    ],
  },

  // ──── touch_reaction ──────────────────────────────────────
  {
    id: "tr_01",
    trigger: "touch_reaction",
    lines: ["ん", "...なに？", "呼んだ？", "ここにいるよ"],
  },
  {
    id: "tr_02",
    trigger: "touch_reaction",
    lines: ["どうしたの", "...うん", "何かあった？"],
    weight: 0.5,
  },

  // ──── wake_reaction ───────────────────────────────────────
  {
    id: "wr_01",
    trigger: "wake_reaction",
    lines: [
      "...ん、戻った",
      "うとうとしてた",
      "...起こした？",
      "また来たんだ",
    ],
  },

  // ──── speaking_response ───────────────────────────────────
  {
    id: "sr_01",
    trigger: "speaking_response",
    lines: [
      "何か動いた",
      "...気になる",
      "時間が経つのって不思議",
      "面白い動き方するね",
    ],
  },

  // ──── random_idle ─────────────────────────────────────────
  {
    id: "ri_01",
    trigger: "random_idle",
    lines: ["...", "静かだね", "作業中？", "そこにいるよ"],
    weight: 2,
  },
  {
    id: "ri_02",
    trigger: "random_idle",
    lines: ["なんか考えてる", "...ぼーっとしてた"],
    weight: 0.8,
  },
  {
    id: "ri_03",
    trigger: "random_idle",
    lines: ["休んでる？", "...疲れてない？"],
    weight: 0.5,
  },

  // ──── drag_reaction ───────────────────────────────────────
  {
    id: "dr_01",
    trigger: "drag_reaction",
    lines: ["わっ", "...どこ行くの", "ちょっと"],
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
