// 設定ストア — モジュールレベル状態 + React hook
// 新規 dep なしで複数コンポーネントが同じ状態を共有できる

import { useCallback, useEffect, useState } from "react";
import type { CompanionSettings } from "./types";
import { DEFAULT_SETTINGS } from "./defaults";

const STORAGE_KEY = "amispi_settings_v1";

function load(): CompanionSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, permissions: { ...DEFAULT_SETTINGS.permissions } };
    const parsed = JSON.parse(raw) as Partial<CompanionSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      permissions: { ...DEFAULT_SETTINGS.permissions, ...(parsed.permissions ?? {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, permissions: { ...DEFAULT_SETTINGS.permissions } };
  }
}

function persist(s: CompanionSettings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* サイレント失敗 */ }
}

let _current: CompanionSettings = load();
const _subs = new Set<() => void>();

// 設定ウィンドウ → 本体ウィンドウへのリアルタイム同期
// localStorage の storage イベントは別ウィンドウで発火する
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    _current = load();
    _subs.forEach((fn) => fn());
  }
});

export function getSettings(): CompanionSettings { return _current; }

export function updateSettings(patch: Partial<CompanionSettings>): void {
  _current = { ..._current, ...patch };
  persist(_current);
  _subs.forEach((fn) => fn());
}

export function useSettings(): [CompanionSettings, (patch: Partial<CompanionSettings>) => void] {
  const [s, setS] = useState<CompanionSettings>(_current);

  useEffect(() => {
    const fn = () => setS({ ..._current });
    _subs.add(fn);
    return () => { _subs.delete(fn); };
  }, []);

  const update = useCallback((patch: Partial<CompanionSettings>) => updateSettings(patch), []);
  return [s, update];
}
