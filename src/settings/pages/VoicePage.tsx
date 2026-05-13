// 音声入力設定ページ (Phase 6b-real)
// Push-to-talk の設定 / STT エンジン選択 / プライバシー説明

import { useSettings } from "../store";
import type { VoiceInputMode, STTEngine } from "../types";

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

export function VoicePage() {
  const [s, update] = useSettings();

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
            </>
          )}
        </>
      )}

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
