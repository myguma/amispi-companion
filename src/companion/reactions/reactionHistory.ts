// クールダウンと時間当たり上限の追跡

const _log: { id: string; ts: number }[] = [];
const MAX = 500;

export function recordReaction(id: string): void {
  _log.push({ id, ts: Date.now() });
  if (_log.length > MAX) _log.splice(0, _log.length - MAX);
}

export function isOnCooldown(id: string, cooldownMs: number): boolean {
  const last = [..._log].reverse().find((e) => e.id === id);
  return last !== undefined && Date.now() - last.ts < cooldownMs;
}

export function countInLastHour(): number {
  const cutoff = Date.now() - 60 * 60 * 1000;
  return _log.filter((e) => e.ts >= cutoff).length;
}
