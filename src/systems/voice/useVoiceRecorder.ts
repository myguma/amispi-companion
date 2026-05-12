// useVoiceRecorder — Push-to-talk 録音フック
//
// 安全原則:
//   - 常時マイク監視禁止 — startRecording() 呼び出し時のみ getUserMedia
//   - 録音終了 (stop / maxDuration) 後に必ず stream.getTracks().stop() でマイク解放
//   - Blob は onBlob コールバックに渡して参照を手放す — 永続保存禁止
//   - クラウド送信なし

import { useRef, useCallback } from "react";

export type RecorderError =
  | "not_supported"     // MediaRecorder / getUserMedia が WebView で使えない
  | "permission_denied" // マイク許可拒否
  | "no_microphone"     // マイクが見つからない
  | "recorder_error"    // MediaRecorder 内部エラー
  | "unknown";

interface UseVoiceRecorderOptions {
  /** 最大録音時間 (ms)。超えると自動停止。デフォルト 15000 */
  maxDurationMs?: number;
  /** 録音完了時に Blob を受け取るコールバック */
  onBlob: (blob: Blob) => void;
  /** エラー時コールバック */
  onError: (err: RecorderError) => void;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions) {
  const streamRef    = useRef<MediaStream | null>(null);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<BlobPart[]>([]);
  const maxTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // コールバックを ref に保持してクロージャーの stale 化を防ぐ
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // stream tracks を確実に停止 (マイク解放)
  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // 最大時間タイマーをクリア
  const clearMaxTimer = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    // MediaRecorder / getUserMedia 対応チェック
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      callbacksRef.current.onError("not_supported");
      return;
    }
    // 二重起動防止
    if (recorderRef.current?.state === "recording") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      chunksRef.current = [];

      // WebView で使える mimeType を優先順に選択
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stopTracks();
        clearMaxTimer();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        recorderRef.current = null;
        // Blob を渡す — 呼び出し側は STT 後に参照を手放すこと
        callbacksRef.current.onBlob(blob);
      };

      recorder.onerror = () => {
        stopTracks();
        clearMaxTimer();
        recorderRef.current = null;
        callbacksRef.current.onError("recorder_error");
      };

      // 500ms ごとにチャンクを受け取る (ondataavailable を確実に発火させる)
      recorder.start(500);

      // 最大録音時間で自動停止
      const maxMs = callbacksRef.current.maxDurationMs ?? 15_000;
      maxTimerRef.current = setTimeout(() => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      }, maxMs);

    } catch (err) {
      stopTracks();
      recorderRef.current = null;
      const msg = err instanceof Error ? err.message : "";
      if (/NotAllowed|Permission/.test(msg)) {
        callbacksRef.current.onError("permission_denied");
      } else if (/NotFound|DevicesNotFound/.test(msg)) {
        callbacksRef.current.onError("no_microphone");
      } else {
        callbacksRef.current.onError("unknown");
      }
    }
  }, [stopTracks, clearMaxTimer]);

  const stopRecording = useCallback(() => {
    clearMaxTimer();
    if (recorderRef.current?.state === "recording") {
      // stop() → onstop → onBlob の順で発火
      recorderRef.current.stop();
    } else {
      // 録音が始まっていない場合はトラックだけ解放
      stopTracks();
      recorderRef.current = null;
    }
  }, [stopTracks, clearMaxTimer]);

  return { startRecording, stopRecording };
}
