// AI エンジン設定ページ
// ローカル LLM (Ollama) の接続設定と発話エンジンの選択を行う

import { useSettings } from "../store";
import type { AIEngine } from "../types";

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16, marginBottom: 4 }}>
      {title}
    </div>
  );
}

function Row({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13 }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: "#999" }}>{note}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

const ENGINE_OPTIONS: { v: AIEngine; label: string; note: string }[] = [
  { v: "none",   label: "なし",   note: "AI を使わない (ルールベース発話のみ)" },
  { v: "mock",   label: "Mock",   note: "開発用ダミー応答" },
  { v: "ollama", label: "Ollama", note: "ローカル LLM (要 Ollama 起動)" },
];

export function AIPage() {
  const [s, update] = useSettings();

  return (
    <div>
      <SectionHead title="発話エンジン" />

      {/* エンジン選択 */}
      {ENGINE_OPTIONS.map((opt) => (
        <div
          key={opt.v}
          onClick={() => update({ aiEngine: opt.v })}
          style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "8px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer",
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: "50%", border: "2px solid #a890f0",
            background: s.aiEngine === opt.v ? "#a890f0" : "transparent",
            flexShrink: 0, marginTop: 1,
          }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: s.aiEngine === opt.v ? 600 : 400 }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: "#999" }}>{opt.note}</div>
          </div>
        </div>
      ))}

      {/* Ollama 設定 (engine=ollama のときのみ表示) */}
      {s.aiEngine === "ollama" && (
        <>
          <SectionHead title="Ollama 接続設定" />

          <Row label="ベース URL" note="Ollama サーバーのアドレス">
            <input
              type="text"
              value={s.ollamaBaseUrl}
              onChange={(e) => update({ ollamaBaseUrl: e.target.value })}
              style={{
                fontSize: 12, border: "1px solid #ddd", borderRadius: 6,
                padding: "3px 8px", width: 200,
              }}
            />
          </Row>

          <Row label="モデル名" note="例: llama3.2:3b, gemma3:4b">
            <input
              type="text"
              value={s.ollamaModel}
              onChange={(e) => update({ ollamaModel: e.target.value })}
              style={{
                fontSize: 12, border: "1px solid #ddd", borderRadius: 6,
                padding: "3px 8px", width: 160,
              }}
            />
          </Row>

          <Row label="タイムアウト (ms)" note="応答待ち上限時間">
            <input
              type="number"
              min={2000}
              max={30000}
              step={1000}
              value={s.ollamaTimeoutMs}
              onChange={(e) => update({ ollamaTimeoutMs: Number(e.target.value) })}
              style={{
                fontSize: 12, border: "1px solid #ddd", borderRadius: 6,
                padding: "3px 8px", width: 90,
              }}
            />
          </Row>
        </>
      )}

      {/* プライバシーノート */}
      <div style={{
        marginTop: 20, padding: "10px 12px", background: "#f5f0ff",
        borderRadius: 8, fontSize: 11, color: "#6a40d0", lineHeight: 1.6,
      }}>
        <strong>プライバシー保護について</strong><br />
        AI に渡されるのは「活動の概要」「時刻帯」「席を離れた時間」などの抽象情報のみです。
        ウィンドウタイトル・ファイル名・URL・入力内容は一切送信されません。
        Ollama は完全にローカルで動作し、クラウドへの送信はありません。
      </div>
    </div>
  );
}
