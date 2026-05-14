import type { Reaction, ReactionTrigger, ReactionPolicy } from "./types";
import { REACTIONS } from "./reactionData";
import { isOnCooldown, countInLastHour } from "./reactionHistory";

export type SelectCtx = {
  trigger: ReactionTrigger;
  tags?: string[];
  policy: ReactionPolicy;
  isFullscreen: boolean;
};

const MANUAL_TRIGGERS: ReactionTrigger[] = ["click", "manualCall", "dragStart", "wake"];

export function selectReaction(ctx: SelectCtx): Reaction | null {
  const { trigger, policy } = ctx;
  const isManual = MANUAL_TRIGGERS.includes(trigger);

  if (policy.doNotDisturb && !isManual) return null;
  if (policy.quietMode && !isManual) return null;
  if (ctx.isFullscreen && policy.suppressWhenFullscreen && !isManual) return null;

  if (!isManual && policy.autonomousSpeechSafetyCapEnabled) {
    const legacySafetyCap = Math.max(20, policy.maxAutonomousReactionsPerHour * 4);
    if (countInLastHour() >= legacySafetyCap) return null;
  }

  const candidates = REACTIONS.filter((r) => {
    if (r.trigger !== trigger) return false;
    if (policy.suppressWhenFocus && !isManual && r.interruptibility === "avoidDuringFocus") return false;
    if (isOnCooldown(r.id, r.cooldownMs)) return false;
    if (ctx.tags && ctx.tags.length > 0) {
      // trigger に tag がある場合は tag が一致するものだけ
      if (r.tags && r.tags.length > 0) {
        if (!ctx.tags.some((t) => r.tags!.includes(t))) return false;
      } else {
        return false; // tag 指定があるのに reaction に tag がない
      }
    } else {
      // tag 指定なし → tag のある reaction は除外
      if (r.tags && r.tags.length > 0) return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  const maxPri = Math.max(...candidates.map((r) => r.priority));
  const top = candidates.filter((r) => r.priority === maxPri);
  return top[Math.floor(Math.random() * top.length)];
}
