// 音声入力設定ページ (Phase 6a)
// Push-to-talk の設定とプライバシー説明を表示する

import { useSettings } from "../store";
import type { VoiceInputMode } from "../types";

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

const MODE_OPTIONS: { v: VoiceInputMode; label: string; note: string }[] = [
  { v: "off",        label: "OFF",           note: "音声入力を使用しない" },
  { v: "pushToTalk", label: "Push-to-Talk",  note: "キャラクター長押し中のみ聞く (推奨)" },
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
        onChange={(v) => update({ voiceInputEnabled: v })}
      />

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
                <strong>キャラクターを長押し (0.5秒以上)</strong> で聞き取りを開始します。<br />
                離すと処理して返答します。
              </>
            ) : (
              "モードを選択してください。"
            )}
          </div>
        </>
      )}

      {/* プライバシーノート */}
      <div style={{
        marginTop: 20, padding: "10px 12px", background: "#f5f0ff",
        borderRadius: 8, fontSize: 11, color: "#6a40d0", lineHeight: 1.7,
      }}>
        <strong>音声入力のプライバシーについて</strong><br />
        ・常時マイク監視は行いません<br />
        ・Push-to-talk 操作中のみ聞きます<br />
        ・音声データは処理後に即座に破棄されます<br />
        ・クラウド STT は使用しません (すべてローカル処理)<br />
        ・聞き取った内容を外部に送信しません
      </div>

      {/* Phase 6b 予告 */}
      <div style={{
        marginTop: 12, padding: "8px 12px", background: "#f0f0f0",
        borderRadius: 8, fontSize: 11, color: "#888", lineHeight: 1.6,
      }}>
        <strong>現在の状態:</strong> Phase 6a — 設定・導線のみ実装済み。<br />
        ローカル STT (Whisper 等) は Phase 6b で統合予定です。
      </div>
    </div>
  );
}
