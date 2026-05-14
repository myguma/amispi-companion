// 音声入力設定ページ (Phase 6b-real)
// Push-to-talk の設定 / STT エンジン選択 / プライバシー説明

import { useEffect, useState } from "react";
import { useSettings } from "../store";
import type { VoiceInputMode, STTEngine } from "../types";
import { getLastVoiceDebug, subscribeLastVoiceDebug } from "../../systems/voice/voiceDebugStore";
import type { LastVoiceDebug } from "../../systems/voice/voiceDebugStore";
import { sendTextMessage } from "../../systems/conversation/textMessageBus";
import { getInteractionTraces, subscribeInteractionTrace } from "../../systems/debug/interactionTraceStore";
import type { InteractionTraceEntry } from "../../systems/debug/interactionTraceStore";

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16, marginBottom: 4 }}>
      {title}
    </div>
  );
}

function Toggle({ label, note, checked, onChange }: {
  label: string; note?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: "#999" }}>{note}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
          background: checked ? "#a890f0" : "#ddd", flexShrink: 0, marginLeft: 12, marginTop: 2,
          position: "relative", transition: "background 0.2s",
        }}
        aria-pressed={checked}
      >
        <span style={{
          position: "absolute", top: 3, left: checked ? 22 : 3, width: 18, height: 18,
          borderRadius: "50%", background: "white", transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

function TextInput({ label, note, value, placeholder, onChange }: {
  label: string; note?: string; value: string; placeholder?: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div style={{ fontSize: 13, marginBottom: 4 }}>{label}</div>
      {note && <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>{note}</div>}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "4px 8px", fontSize: 12,
          border: "1px solid #ddd", borderRadius: 4, boxSizing: "border-box",
          fontFamily: "monospace",
        }}
      />
    </div>
  );
}

const MODE_OPTIONS: { v: VoiceInputMode; label: string; note: string }[] = [
  { v: "off",        label: "OFF",           note: "音声入力を使用しない" },
  { v: "pushToTalk", label: "Push-to-Talk",  note: "キャラクター長押し中のみ聞く (推奨)" },
];

const STT_OPTIONS: { v: STTEngine; label: string; note: string }[] = [
  { v: "mock",       label: "Mock (開発用)",   note: "実際の録音はするが STT は固定テキストを返す" },
  { v: "whisperCli", label: "Whisper CLI",    note: "ローカル whisper.cpp executable を使用 (要path/model設定)" },
];

function boolLabel(value: boolean | undefined): string {
  if (value === undefined) return "-";
  return value ? "yes" : "no";
}

function statusLabel(status: LastVoiceDebug["status"]): string {
  const labels: Record<LastVoiceDebug["status"], string> = {
    idle: "idle",
    recording: "recording",
    transcribing: "transcribing",
    success: "success",
    no_speech: "no speech",
    ffmpeg_unavailable: "FFmpeg未設定",
    conversion_failed: "変換失敗",
    whisper_failed: "Whisper失敗",
    timeout: "timeout",
    error: "error",
  };
  return labels[status] ?? status;
}

function timeLabel(value: number): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function VoicePage() {
  const [s, update] = useSettings();
  const [voiceDebug, setVoiceDebug] = useState<LastVoiceDebug>(getLastVoiceDebug());
  const [textMessage, setTextMessage] = useState("");
  const [traces, setTraces] = useState<InteractionTraceEntry[]>(getInteractionTraces());

  useEffect(() => subscribeLastVoiceDebug(() => setVoiceDebug(getLastVoiceDebug())), []);
  useEffect(() => subscribeInteractionTrace(() => setTraces([...getInteractionTraces()])), []);

  const submitTextMessage = () => {
    const text = textMessage.trim();
    if (!text) return;
    sendTextMessage(text);
    setTextMessage("");
  };

  return (
    <div>
      <SectionHead title="音声入力" />

      <Toggle
        label="音声入力を有効にする"
        note="デフォルト OFF — 有効にするとキャラクターに話しかけられる"
        checked={s.voiceInputEnabled}
        onChange={(v) => {
          // 音声入力をONにしたとき、modeがoffのままだと録音されないため pushToTalk に自動設定
          if (v && s.voiceInputMode === "off") {
            update({ voiceInputEnabled: true, voiceInputMode: "pushToTalk" });
          } else {
            update({ voiceInputEnabled: v });
          }
        }}
      />
      {s.voiceInputEnabled && s.voiceInputMode === "off" && (
        <div style={{ fontSize: 11, color: "#e08030", padding: "4px 8px", background: "#fff8e8", borderRadius: 6, marginTop: 4, lineHeight: 1.6 }}>
          ⚠ モードが OFF のため録音しません。下の「モード」でモードを選択してください。
        </div>
      )}

      {s.voiceInputEnabled && (
        <>
          <SectionHead title="モード" />
          {MODE_OPTIONS.map((opt) => (
            <div
              key={opt.v}
              onClick={() => update({ voiceInputMode: opt.v })}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "8px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer",
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: "50%", border: "2px solid #a890f0",
                background: s.voiceInputMode === opt.v ? "#a890f0" : "transparent",
                flexShrink: 0, marginTop: 1,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: s.voiceInputMode === opt.v ? 600 : 400 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "#999" }}>{opt.note}</div>
              </div>
            </div>
          ))}

          <SectionHead title="操作方法" />
          <div style={{ fontSize: 12, color: "#666", lineHeight: 1.8, padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
            {s.voiceInputMode === "pushToTalk" ? (
              <>
                <strong>キャラクターを長押し (0.5秒以上)</strong> で録音開始します。<br />
                離すと STT 処理して返答します。最大 {Math.round(s.maxRecordingMs / 1000)} 秒で自動停止。
              </>
            ) : (
              "モードを選択してください。"
            )}
          </div>

          <SectionHead title="STT エンジン" />
          {STT_OPTIONS.map((opt) => (
            <div
              key={opt.v}
              onClick={() => update({ sttEngine: opt.v })}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "8px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer",
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: "50%", border: "2px solid #a890f0",
                background: s.sttEngine === opt.v ? "#a890f0" : "transparent",
                flexShrink: 0, marginTop: 1,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: s.sttEngine === opt.v ? 600 : 400 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "#999" }}>{opt.note}</div>
              </div>
            </div>
          ))}

          {s.sttEngine === "whisperCli" && (
            <>
              <SectionHead title="Whisper CLI 設定" />
              <div style={{ fontSize: 11, color: "#6a40d0", padding: "4px 0 8px", borderBottom: "1px solid #f0f0f0" }}>
                ローカル whisper.cpp を起動して文字起こしします。未設定・失敗時はアプリ全体を止めず、音声入力だけ失敗扱いになります。
                実機では whisper.cpp build が WebView の録音形式を読めるか確認してください。
              </div>

              <TextInput
                label="Executable path"
                note="whisper.cpp の実行ファイルパス (例: C:\tools\whisper\whisper.exe)"
                value={s.whisperExecutablePath}
                placeholder="C:\path\to\whisper.exe"
                onChange={(v) => update({ whisperExecutablePath: v })}
              />
              <TextInput
                label="Model path"
                note="ggml モデルファイルパス (例: C:\tools\whisper\ggml-tiny.bin)"
                value={s.whisperModelPath}
                placeholder="C:\path\to\ggml-tiny.bin"
                onChange={(v) => update({ whisperModelPath: v })}
              />
              <TextInput
                label="FFmpeg executable path"
                note="WebView録音をWhisper用の16kHz mono PCM WAVへ変換するために使います。クラウド送信はありません。"
                value={s.ffmpegExecutablePath}
                placeholder="C:\tools\ffmpeg\bin\ffmpeg.exe"
                onChange={(v) => update({ ffmpegExecutablePath: v })}
              />

              <div style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}>タイムアウト (秒)</div>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={Math.round(s.whisperTimeoutMs / 1000)}
                  onChange={(e) => update({ whisperTimeoutMs: Math.max(5, Number(e.target.value)) * 1000 })}
                  style={{ width: 80, padding: "4px 8px", fontSize: 12, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>

              <div style={{ fontSize: 11, color: "#777", lineHeight: 1.7, padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                実行時はWebView録音を一時ファイルに保存し、FFmpegで16kHz mono PCM WAVへ変換してからWhisperへ渡します。
                元音声・変換後WAV・文字起こしファイルは処理後に削除します。Whisper CLI は
                <code style={{ margin: "0 3px" }}>-m</code>
                <code style={{ margin: "0 3px" }}>-f</code>
                <code style={{ margin: "0 3px" }}>-otxt</code>
                <code style={{ margin: "0 3px" }}>-of</code>
                を使って呼び出されます。
              </div>
            </>
          )}

          <SectionHead title="直近の音声認識結果" />
          <div style={{ fontSize: 12, color: "#666", lineHeight: 1.8, padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
            <div><strong>session:</strong> {voiceDebug.voiceSessionId ?? "-"}</div>
            <div><strong>status:</strong> {statusLabel(voiceDebug.status)}</div>
            <div><strong>transcript:</strong> {voiceDebug.transcriptPreview || "なし"}</div>
            <div><strong>normalized:</strong> {voiceDebug.normalizedTranscriptPreview || "なし"}</div>
            <div><strong>intent:</strong> {voiceDebug.intent ?? "-"}</div>
            <div><strong>length:</strong> {voiceDebug.transcriptLength ?? 0}</div>
            <div><strong>stale dropped:</strong> {voiceDebug.staleDroppedCount ?? 0}</div>
            <div><strong>updated:</strong> {timeLabel(voiceDebug.updatedAt)}</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
              transcriptは確認用の一時表示だけです。記憶・export・localStorageには保存しません。
            </div>
            {s.debugModeEnabled && (
              <div style={{ marginTop: 8, padding: "8px", background: "#fafafa", border: "1px solid #eee", borderRadius: 6, fontSize: 11, color: "#777" }}>
                <div>mime: {voiceDebug.inputMimeType ?? "-"}</div>
                <div>extension: {voiceDebug.inputExtension ?? "-"}</div>
                <div>conversion: {boolLabel(voiceDebug.conversionUsed)}</div>
                <div>ffmpeg configured: {boolLabel(voiceDebug.ffmpegConfigured)}</div>
                <div>ffmpeg ok: {boolLabel(voiceDebug.ffmpegExitOk)}</div>
                <div>whisper ok: {boolLabel(voiceDebug.whisperExitOk)}</div>
                <div>temp cleanup: {boolLabel(voiceDebug.tempCleanupDone)}</div>
                <div>ai source: {voiceDebug.aiSource ?? "-"}</div>
                <div>ai fallback: {voiceDebug.aiFallbackReason ?? "-"}</div>
                <div>response: {voiceDebug.responsePreview ?? "-"}</div>
                {voiceDebug.stderrPreview && <div>stderr: {voiceDebug.stderrPreview}</div>}
              </div>
            )}
          </div>
        </>
      )}

      <SectionHead title="テキストで話しかける" />
      <div style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ fontSize: 11, color: "#777", lineHeight: 1.6, marginBottom: 6 }}>
          音声と同じ会話経路に一時的に送ります。入力本文は記憶・export・localStorageには保存しません。
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={textMessage}
            placeholder="例: 今何を見てる？"
            onChange={(e) => setTextMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitTextMessage();
            }}
            style={{ flex: 1, padding: "6px 8px", fontSize: 12, border: "1px solid #ddd", borderRadius: 6 }}
          />
          <button
            onClick={submitTextMessage}
            disabled={!textMessage.trim()}
            style={{ fontSize: 12, padding: "6px 12px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: textMessage.trim() ? "pointer" : "default" }}
          >
            送信
          </button>
        </div>
      </div>

      <SectionHead title="直近の発話トレース" />
      <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6, padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
        {traces.length === 0 ? (
          <div style={{ color: "#999" }}>まだトレースはありません。</div>
        ) : traces.slice(-5).reverse().map((t) => (
          <div key={t.eventId} style={{ padding: "6px 0", borderBottom: "1px dashed #eee" }}>
            <div><strong>{new Date(t.timestamp).toLocaleTimeString()}</strong> {t.trigger} / {t.responseSource ?? t.source ?? "-"}</div>
            <div>intent: {t.intent ?? "-"} / priority: {t.speechPriority ?? "-"}</div>
            <div>input: {t.normalizedTranscriptPreview ?? t.textInputPreview ?? t.rawTranscriptPreview ?? "-"}</div>
            <div>response: {t.selectedResponse ?? "-"}</div>
            <div>fallback: {t.fallbackReason ?? "-"} / dropped: {t.dropped ? "yes" : "no"} / suppressed: {t.suppressed ? "yes" : "no"}</div>
            {s.debugModeEnabled && (
              <div style={{ color: "#999" }}>
                session: {t.voiceSessionId ?? "-"} / activity: {t.observationSummary ?? "-"} / app: {t.activeAppCategory ?? "-"} / proc: {t.activeProcessName ?? "-"}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* プライバシーノート */}
      <div style={{
        marginTop: 20, padding: "10px 12px", background: "#f5f0ff",
        borderRadius: 8, fontSize: 11, color: "#6a40d0", lineHeight: 1.7,
      }}>
        <strong>音声入力のプライバシーについて</strong><br />
        ・常時マイク監視は行いません<br />
        ・Push-to-talk 操作中のみ録音します<br />
        ・録音データは STT 処理後に即座に破棄されます<br />
        ・クラウド STT は使用しません (すべてローカル処理)<br />
        ・聞き取った内容を外部に送信しません<br />
        ・whisper.cpp を使う場合もローカル実行のみです
      </div>
    </div>
  );
}
