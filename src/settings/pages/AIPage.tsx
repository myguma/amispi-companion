// AI エンジン設定ページ
// ローカル LLM (Ollama) の接続設定・テスト・デバッグ情報を表示する

import { useState, useEffect, useCallback } from "react";
import { useSettings, getSettings } from "../store";
import { getLastAIResult, subscribeLastAIResult, getAIResponse } from "../../companion/ai/AIProviderManager";
import type { AIEngine } from "../types";
import type { LastAIResultDebug } from "../../companion/ai/types";
import { buildCompanionContext } from "../../systems/ai/buildCompanionContext";
import { getRecentEvents } from "../../systems/memory/memoryStore";
import { EMPTY_SNAPSHOT } from "../../observation/types";

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

function sourceLabel(source: LastAIResultDebug["source"]): { text: string; color: string } {
  switch (source) {
    case "ollama":   return { text: "ollama",   color: "#4a90d9" };
    case "rule":     return { text: "rule",     color: "#888" };
    case "mock":     return { text: "mock",     color: "#f0a030" };
    case "fallback": return { text: "fallback", color: "#e05050" };
    case "none":     return { text: "なし",     color: "#bbb" };
  }
}

function LastResultPanel({ result }: { result: LastAIResultDebug }) {
  const { text: srcText, color } = sourceLabel(result.source);
  const ago = result.updatedAt > 0
    ? `${Math.round((Date.now() - result.updatedAt) / 1000)}秒前`
    : "—";

  return (
    <div style={{
      background: "#f8f8ff", borderRadius: 8, padding: "10px 12px",
      fontSize: 12, lineHeight: 1.8, marginTop: 8,
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <span style={{
          display: "inline-block", padding: "1px 8px", borderRadius: 10,
          fontSize: 11, fontWeight: 700, background: color + "22", color,
        }}>source: {srcText}</span>
        <span style={{ color: "#bbb", fontSize: 11 }}>{ago}</span>
      </div>
      {result.fallbackReason && (
        <div style={{ color: "#e05050" }}>fallback reason: {result.fallbackReason}</div>
      )}
      {result.model && (
        <div style={{ color: "#666" }}>model: {result.model}</div>
      )}
      {result.latencyMs !== undefined && (
        <div style={{ color: "#666" }}>latency: {result.latencyMs}ms</div>
      )}
      {result.responsePreview && (
        <div style={{ color: "#444", fontStyle: "italic" }}>
          「{result.responsePreview}{result.responsePreview.length >= 60 ? "…" : ""}」
        </div>
      )}
      {result.errorMessage && (
        <div style={{ color: "#e05050", fontSize: 11 }}>error: {result.errorMessage}</div>
      )}
    </div>
  );
}

type OllamaModel = { name: string };

function OllamaTestSection({ baseUrl, model, timeoutMs }: {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}) {
  const [connStatus, setConnStatus] = useState<"idle" | "checking" | "ok" | "ng">("idle");
  const [models, setModels] = useState<OllamaModel[] | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "done" | "err">("idle");
  const [testOutput, setTestOutput] = useState<string>("");
  const [lastResult, setLastResult] = useState<LastAIResultDebug>(getLastAIResult());

  useEffect(() => {
    const unsub = subscribeLastAIResult(() => setLastResult({ ...getLastAIResult() }));
    return unsub;
  }, []);

  const runConnectionTest = useCallback(async () => {
    setConnStatus("checking");
    setModels(null);
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), 5_000);
      const res = await fetch(`${baseUrl}/api/tags`, { signal: ctrl.signal });
      clearTimeout(id);
      if (!res.ok) { setConnStatus("ng"); return; }
      const json = await res.json() as { models?: OllamaModel[] };
      setModels(json.models ?? []);
      setConnStatus("ok");
    } catch {
      setConnStatus("ng");
    }
  }, [baseUrl]);

  const runTestResponse = useCallback(async () => {
    setTestStatus("running");
    setTestOutput("");
    try {
      const [s] = [getLastAIResult()]; // 現在の settings は getSettings() 経由
      void s; // suppress unused warning
      const { getSettings } = await import("../../settings/store");
      const settings = getSettings();
      const events = getRecentEvents(10);
      const ctx = buildCompanionContext("click", EMPTY_SNAPSHOT, events, settings);
      const out = await getAIResponse(ctx);
      if (out.shouldSpeak && out.text) {
        setTestOutput(out.text);
        setTestStatus("done");
      } else {
        setTestOutput(`shouldSpeak: false / reason: ${out.reason ?? "—"}`);
        setTestStatus("err");
      }
    } catch (e) {
      setTestOutput((e instanceof Error ? e.message : String(e)).slice(0, 120));
      setTestStatus("err");
    }
    setLastResult({ ...getLastAIResult() });
  }, []);

  const connColor =
    connStatus === "ok" ? "#4caf7d" :
    connStatus === "ng" ? "#e05050" :
    connStatus === "checking" ? "#f0a030" : "#888";

  return (
    <>
      <SectionHead title="接続テスト" />

      <div style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #f0f0f0", flexWrap: "wrap" }}>
        <button
          onClick={() => void runConnectionTest()}
          disabled={connStatus === "checking"}
          style={{
            fontSize: 12, padding: "4px 12px", border: `1px solid ${connColor}`,
            borderRadius: 6, background: "white", color: connColor, cursor: "pointer",
          }}
        >
          {connStatus === "checking" ? "確認中…" : "接続テスト"}
        </button>
        <button
          onClick={() => void runTestResponse()}
          disabled={testStatus === "running"}
          style={{
            fontSize: 12, padding: "4px 12px", border: "1px solid #a890f0",
            borderRadius: 6, background: "white", color: "#6a40d0", cursor: "pointer",
          }}
        >
          {testStatus === "running" ? "テスト中…" : "テスト発話"}
        </button>
      </div>

      {/* 接続結果 */}
      {connStatus !== "idle" && (
        <div style={{ padding: "6px 0", fontSize: 12 }}>
          <span style={{ color: connColor }}>
            {connStatus === "ok" ? "✓ 接続OK" :
             connStatus === "ng" ? "× 接続失敗 (Ollama未起動 or URL誤り)" :
             "確認中…"}
          </span>
          {models !== null && models.length === 0 && (
            <span style={{ marginLeft: 8, color: "#e08030" }}>モデルなし (ollama pull でモデルを取得してください)</span>
          )}
        </div>
      )}

      {/* モデル一覧 */}
      {models && models.length > 0 && (
        <div style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
            取得済みモデル (設定中: <strong>{model}</strong>):
          </div>
          {models.map((m) => (
            <div key={m.name} style={{
              fontSize: 12, padding: "2px 6px", borderRadius: 4, marginBottom: 2,
              background: m.name === model ? "#e8f0ff" : "#f8f8f8",
              color: m.name === model ? "#3a70d0" : "#444",
              fontFamily: "monospace",
            }}>
              {m.name === model ? "▶ " : "  "}{m.name}
              {m.name !== model && (
                <span style={{ color: "#aaa", fontSize: 11, marginLeft: 8 }}>
                  ← 設定で変更可能
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* テスト発話結果 */}
      {testStatus !== "idle" && (
        <div style={{ padding: "6px 0", fontSize: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ color: testStatus === "done" ? "#4caf7d" : testStatus === "err" ? "#e05050" : "#f0a030", marginBottom: 2 }}>
            {testStatus === "running" ? "AI 応答待ち中…" :
             testStatus === "done" ? "✓ 発話テスト成功" : "× 発話テスト失敗"}
          </div>
          {testOutput && (
            <div style={{ color: "#444", fontStyle: testStatus === "done" ? "italic" : "normal" }}>
              {testStatus === "done" ? `「${testOutput}」` : testOutput}
            </div>
          )}
        </div>
      )}

      {/* 最後のAI応答デバッグ */}
      <SectionHead title="最後のAI応答" />
      <LastResultPanel result={lastResult} />

      <div style={{ fontSize: 11, color: "#aaa", marginTop: 6, lineHeight: 1.6, paddingBottom: 4 }}>
        timeout: {timeoutMs}ms — クリックやテスト発話のたびに更新されます
      </div>
    </>
  );
}

export function AIPage() {
  const [s, update] = useSettings();

  return (
    <div>
      <SectionHead title="発話エンジン" />

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

          <Row label="モデル名" note="例: qwen2.5:3b-instruct-16k, llama3.2:3b">
            <input
              type="text"
              value={s.ollamaModel}
              onChange={(e) => update({ ollamaModel: e.target.value })}
              style={{
                fontSize: 12, border: "1px solid #ddd", borderRadius: 6,
                padding: "3px 8px", width: 200,
              }}
            />
          </Row>

          <Row label="タイムアウト (ms)" note="応答待ち上限 (低速モデルは20000以上推奨)">
            <input
              type="number"
              min={2000}
              max={60000}
              step={1000}
              value={s.ollamaTimeoutMs}
              onChange={(e) => update({ ollamaTimeoutMs: Number(e.target.value) })}
              style={{
                fontSize: 12, border: "1px solid #ddd", borderRadius: 6,
                padding: "3px 8px", width: 90,
              }}
            />
          </Row>

          <OllamaTestSection
            baseUrl={s.ollamaBaseUrl}
            model={s.ollamaModel}
            timeoutMs={s.ollamaTimeoutMs}
          />
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
