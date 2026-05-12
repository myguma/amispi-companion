// STT (Speech-to-Text) アダプター抽象インターフェース
// すべての実装はローカル処理のみ。クラウド STT 禁止。
// 音声データは transcribe() 内で使い捨て — 永続保存禁止。

export type STTResult = {
  text: string;
  confidence?: number;  // 0.0 ~ 1.0
  durationMs?: number;
};

export type STTError =
  | "no_speech"       // 無音または短すぎる
  | "too_long"        // 録音が長すぎる
  | "unavailable"     // STT エンジンが利用不可
  | "timeout"         // 処理タイムアウト
  | "error";          // その他エラー

export type STTAdapterOutput =
  | { ok: true; result: STTResult }
  | { ok: false; error: STTError };

export interface STTAdapter {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  /** audioBlob は処理後に参照を手放すこと (永続保存禁止) */
  transcribe(audioBlob: Blob): Promise<STTAdapterOutput>;
}
