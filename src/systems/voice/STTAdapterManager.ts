// STTAdapterManager — 設定に応じて STT アダプターを選択する
// Phase 6a: mock のみ。Phase 6b で whisper アダプターを追加する。

import type { STTAdapter } from "./STTAdapter";
import { MockSTTAdapter } from "./MockSTTAdapter";

let _adapter: STTAdapter | null = null;

export function getSTTAdapter(): STTAdapter {
  if (!_adapter) {
    // Phase 6a: 常に mock を返す
    // Phase 6b: 設定の sttEngine に応じて whisper 等を返す
    _adapter = new MockSTTAdapter();
  }
  return _adapter;
}

/** 設定変更時にアダプターをリセットする (Phase 6b 以降で使用) */
export function resetSTTAdapter(): void {
  _adapter = null;
}
