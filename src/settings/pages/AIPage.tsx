// AI エンジン設定ページ
// ローカル LLM (Ollama) の接続設定・テスト・デバッグ情報を表示する

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettings, getSettings } from "../store";
import { getLastAIResult, subscribeLastAIResult, getAIResponse } from "../../companion/ai/AIProviderManager";
import type { AIEngine } from "../types";
import type { LastAIResultDebug } from "../../companion/ai/types";
import { buildCompanionContext } from "../../systems/ai/buildCompanionContext";
import { getRecentEvents } from "../../systems/memory/memoryStore";
import { EMPTY_SNAPSHOT } from "../../observation/types";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

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
  { v: "openai", label: "OpenAI", note: "クラウド LLM — API key 必須・外部送信あり" },
];

function sourceLabel(source: LastAIResultDebug["source"]): { text: string; color: string } {
  switch (source) {
    case "openai":   return { text: "openai",   color: "#2f80ed" };
    case "ollama":   return { text: "ollama",   color: "#4a90d9" };
    case "rule":     return { text: "rule",     color: "#888" };
    case "mock":     return { text: "mock",     color: "#f0a030" };
    case "fallback": return { text: "fallback", color: "#e05050" };
    case "none":     return { text: "なし",     color: "#bbb" };
  }
}

function statusColor(status: LastAIResultDebug["status"]): string {
  switch (status) {
    case "success": return "#4caf7d";
    case "fallback": return "#f0a030";
    case "failed": return "#e05050";
    case "skipped": return "#999";
    default: return "#bbb";
  }
}

function LastResultPanel({ result }: { result: LastAIResultDebug }) {
  const { text: srcText, color } = sourceLabel(result.source);
  const statColor = statusColor(result.status);
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
        {result.status && (
          <span style={{
            display: "inline-block", padding: "1px 8px", borderRadius: 10,
            fontSize: 11, fontWeight: 700, background: statColor + "22", color: statColor,
          }}>status: {result.status}</span>
        )}
        <span style={{ color: "#bbb", fontSize: 11 }}>{ago}</span>
      </div>
      {result.fallbackFrom && (
        <div style={{ color: "#8a6a30" }}>fallbackFrom: {result.fallbackFrom}</div>
      )}
      {result.fallbackTo && (
        <div style={{ color: "#8a6a30" }}>fallbackTo: {result.fallbackTo}</div>
      )}
      {result.httpStatus !== undefined && (
        <div style={{ color: "#8a6a30" }}>httpStatus: {result.httpStatus}</div>
      )}
      {result.intent && (
        <div style={{ color: "#666" }}>intent: {result.intent}</div>
      )}
      {result.fallbackReason && (
        <div style={{ color: "#e05050" }}>reason: {result.fallbackReason}</div>
      )}
      {result.safeReason && (
        <div style={{ color: "#c06040" }}>safeReason: {result.safeReason}</div>
      )}
      {result.qualityRejectedReason && (
        <div style={{ color: "#c06040" }}>qualityRejectedReason: {result.qualityRejectedReason}</div>
      )}
      {result.model && (
        <div style={{ color: "#666" }}>model: {result.model}</div>
      )}
      {result.latencyMs !== undefined && (
        <div style={{ color: "#666" }}>latency: {result.latencyMs}ms</div>
      )}
      {result.responsePreview && (
        <div style={{ color: "#444", fontStyle: "italic" }}>
          「{result.responsePreview}{result.responsePreview.length >= 80 ? "…" : ""}」
        </div>
      )}
      {result.errorMessage && (
        <div style={{ color: "#e05050", fontSize: 11 }}>error: {result.errorMessage}</div>
      )}
    </div>
  );
}

function openAISummary(result: LastAIResultDebug): {
  tone: "ok" | "warn" | "ng";
  headline: string;
  detail: string;
} {
  if (result.source === "openai" && result.status === "success") {
    return {
      tone: "ok",
      headline: "OpenAI active",
      detail: `現在 OpenAI / ${result.model ?? "-"} で応答中`,
    };
  }
  if (result.fallbackFrom === "openai" && result.source !== "fallback") {
    return {
      tone: "warn",
      headline: "OpenAI failed / fallback active",
      detail: `OpenAIは応答していません。現在は ${result.source} / ${result.model ?? "-"} で応答中`,
    };
  }
  if (result.fallbackFrom === "openai" || result.source === "fallback") {
    return {
      tone: "ng",
      headline: "OpenAI unavailable",
      detail: "OpenAIは応答していません。API key / billing / quota / rate limit / network を確認してください",
    };
  }
  return {
    tone: "warn",
    headline: "OpenAI not used yet",
    detail: "OpenAIテストを実行すると実際の provider と fallback 状態を確認できます",
  };
}

function OpenAIStatusCard({ result, configuredModel }: { result: LastAIResultDebug; configuredModel: string }) {
  const summary = openAISummary(result);
  const color =
    summary.tone === "ok" ? "#4caf7d" :
    summary.tone === "warn" ? "#d18400" :
    "#e05050";

  return (
    <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, border: `1px solid ${color}55`, background: summary.tone === "ok" ? "#f1fff6" : "#fff8ee", fontSize: 12, lineHeight: 1.8 }}>
      <div style={{ color, fontWeight: 700 }}>{summary.headline}</div>
      <div style={{ color: "#555" }}>{summary.detail}</div>
      {(result.httpStatus === 429 || result.safeReason === "billing_or_quota" || result.safeReason === "billing_or_rate_limit" || result.safeReason === "rate_limited") && (
        <div style={{ color: "#8a5000" }}>
          理由: API quota / billing / rate limit の可能性があります。ChatGPT契約とは別にOpenAI API側の課金状態を確認してください。
        </div>
      )}
      <div style={{ marginTop: 4, color: "#666" }}>configured model: {configuredModel}</div>
      <div style={{ color: "#666" }}>actual provider used: {result.source}</div>
      <div style={{ color: "#666" }}>actual model used: {result.model ?? "-"}</div>
      <div style={{ color: "#666" }}>intent: {result.intent ?? "-"}</div>
      <div style={{ color: "#666" }}>status: {result.status ?? "-"}</div>
      <div style={{ color: "#666" }}>fallbackFrom: {result.fallbackFrom ?? "-"}</div>
      <div style={{ color: "#666" }}>fallbackTo: {result.fallbackTo ?? (result.fallbackFrom ? result.source : "-")}</div>
      <div style={{ color: "#666" }}>safe reason: {result.safeReason ?? result.fallbackReason ?? "-"}</div>
      <div style={{ color: "#666" }}>latency: {result.latencyMs !== undefined ? `${result.latencyMs}ms` : "-"}</div>
      <div style={{ color: "#666" }}>response preview: {result.responsePreview ?? "-"}</div>
    </div>
  );
}

function OpenAITestSection({ model, timeoutMs }: { model: string; timeoutMs: number }) {
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "done" | "err">("idle");
  const [testOutput, setTestOutput] = useState<string>("");
  const [lastResult, setLastResult] = useState<LastAIResultDebug>(getLastAIResult());

  useEffect(() => {
    const unsub = subscribeLastAIResult(() => setLastResult({ ...getLastAIResult() }));
    return unsub;
  }, []);

  const runTestResponse = useCallback(async () => {
    setTestStatus("running");
    setTestOutput("");
    try {
      const settings = getSettings();
      const events = getRecentEvents(10);
      const ctx = buildCompanionContext("click", EMPTY_SNAPSHOT, events, settings);
      const out = await getAIResponse(ctx);
      const result = getLastAIResult();
      setLastResult({ ...result });
      if (out.shouldSpeak && out.text && result.source === "openai" && result.status === "success") {
        setTestOutput(out.text);
        setTestStatus("done");
      } else if (out.shouldSpeak && out.text) {
        setTestOutput(`${result.source}/${result.status ?? "-"}: ${out.text}`);
        setTestStatus("err");
      } else {
        setTestOutput(`shouldSpeak: false / reason: ${out.reason ?? result.fallbackReason ?? "-"}`);
        setTestStatus("err");
      }
    } catch (e) {
      setTestOutput((e instanceof Error ? e.message : String(e)).slice(0, 160));
      setTestStatus("err");
    }
  }, []);

  return (
    <>
      <SectionHead title="OpenAI テスト" />
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f0f0f0", flexWrap: "wrap" }}>
        <button
          onClick={() => void runTestResponse()}
          disabled={testStatus === "running"}
          style={{
            fontSize: 12, padding: "4px 12px", border: "1px solid #2f80ed",
            borderRadius: 6, background: "white", color: "#2f80ed", cursor: "pointer",
          }}
        >
          {testStatus === "running" ? "テスト中…" : "OpenAI 発話テスト"}
        </button>
        <span style={{ fontSize: 11, color: "#999" }}>{model} / timeout {timeoutMs}ms</span>
      </div>
      {testStatus !== "idle" && (
        <div style={{ padding: "6px 0", fontSize: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ color: testStatus === "done" ? "#4caf7d" : testStatus === "err" ? "#e05050" : "#f0a030", marginBottom: 2 }}>
            {testStatus === "running" ? "OpenAI 応答待ち中…" :
             testStatus === "done" ? "✓ OpenAI 応答成功" : "× OpenAI 応答またはフォールバック"}
          </div>
          {testOutput && (
            <div style={{ color: testStatus === "done" ? "#444" : "#e05050", fontStyle: testStatus === "done" ? "italic" : "normal", wordBreak: "break-word" }}>
              {testStatus === "done" ? `「${testOutput}」` : testOutput}
            </div>
          )}
        </div>
      )}
      <OpenAIStatusCard result={lastResult} configuredModel={model} />
      <LastResultPanel result={lastResult} />
    </>
  );
}

type OllamaModel = { name: string };

function OllamaTestSection({ baseUrl, model, timeoutMs }: {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}) {
  const [connStatus, setConnStatus] = useState<"idle" | "checking" | "ok" | "ng">("idle");
  const [connError, setConnError] = useState<string>("");
  const [models, setModels] = useState<OllamaModel[] | null>(null);

  const [rawStatus, setRawStatus] = useState<"idle" | "running" | "ok" | "err">("idle");
  const [rawOutput, setRawOutput] = useState<string>("");

  const [testStatus, setTestStatus] = useState<"idle" | "running" | "done" | "err">("idle");
  const [testOutput, setTestOutput] = useState<string>("");
  const [lastResult, setLastResult] = useState<LastAIResultDebug>(getLastAIResult());

  useEffect(() => {
    const unsub = subscribeLastAIResult(() => setLastResult({ ...getLastAIResult() }));
    return unsub;
  }, []);

  // 接続テスト: /api/tags を Rust 経由で叩く
  const runConnectionTest = useCallback(async () => {
    setConnStatus("checking");
    setConnError("");
    setModels(null);
    try {
      const json = isTauri
        ? await invoke<string>("ollama_list_models", { baseUrl })
        : await fetch(`${baseUrl}/api/tags`).then((r) => r.text());
      const data = JSON.parse(json) as { models?: OllamaModel[] };
      setModels(data.models ?? []);
      setConnStatus("ok");
    } catch (e) {
      setConnError((e instanceof Error ? e.message : String(e)).slice(0, 200));
      setConnStatus("ng");
    }
  }, [baseUrl]);

  // Raw Chat テスト: 固定 ASCII プロンプトで Ollama が実際に応答するか確認
  const runRawChatTest = useCallback(async () => {
    setRawStatus("running");
    setRawOutput("");
    const t0 = Date.now();
    try {
      const json = isTauri
        ? await invoke<string>("ollama_chat", {
            baseUrl, model,
            system: "You are a test assistant. Follow instructions exactly.",
            user: "Reply with exactly this text and nothing else: OLLAMA_OK_123",
            timeoutMs: 15_000,
          })
        : await fetch(`${baseUrl}/api/chat`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, stream: false, messages: [
              { role: "system", content: "You are a test assistant. Follow instructions exactly." },
              { role: "user",   content: "Reply with exactly this text and nothing else: OLLAMA_OK_123" },
            ], options: { temperature: 0, num_predict: 20 } }),
          }).then((r) => r.text());
      const data = JSON.parse(json) as { message?: { content?: string } };
      const content = data?.message?.content ?? "(empty)";
      const latency = Date.now() - t0;
      setRawOutput(`${latency}ms → "${content.trim()}"`);
      setRawStatus("ok");
    } catch (e) {
      setRawOutput((e instanceof Error ? e.message : String(e)).slice(0, 200));
      setRawStatus("err");
    }
  }, [baseUrl, model]);

  // Companion 発話テスト: 実際の AI パイプライン経由
  const runTestResponse = useCallback(async () => {
    setTestStatus("running");
    setTestOutput("");
    try {
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

  const rawColor =
    rawStatus === "ok" ? "#4caf7d" :
    rawStatus === "err" ? "#e05050" :
    rawStatus === "running" ? "#f0a030" : "#888";

  return (
    <>
      <SectionHead title="接続テスト" />
      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
        ※ アプリは Rust 経由で Ollama にアクセスします (WebView CORS 回避)
      </div>

      <div style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #f0f0f0", flexWrap: "wrap" }}>
        <button
          onClick={() => void runConnectionTest()}
          disabled={connStatus === "checking"}
          style={{
            fontSize: 12, padding: "4px 12px", border: `1px solid ${connColor}`,
            borderRadius: 6, background: "white", color: connColor, cursor: "pointer",
          }}
        >
          {connStatus === "checking" ? "確認中…" : "①モデル一覧取得"}
        </button>
        <button
          onClick={() => void runRawChatTest()}
          disabled={rawStatus === "running"}
          style={{
            fontSize: 12, padding: "4px 12px", border: `1px solid ${rawColor}`,
            borderRadius: 6, background: "white", color: rawColor, cursor: "pointer",
          }}
        >
          {rawStatus === "running" ? "テスト中…" : "②Raw Chat テスト"}
        </button>
        <button
          onClick={() => void runTestResponse()}
          disabled={testStatus === "running"}
          style={{
            fontSize: 12, padding: "4px 12px", border: "1px solid #a890f0",
            borderRadius: 6, background: "white", color: "#6a40d0", cursor: "pointer",
          }}
        >
          {testStatus === "running" ? "テスト中…" : "③コンパニオン発話テスト"}
        </button>
      </div>

      {/* ① 接続結果 */}
      {connStatus !== "idle" && (
        <div style={{ padding: "6px 0", fontSize: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ color: connColor, marginBottom: 2 }}>
            {connStatus === "ok" ? "✓ /api/tags 取得成功" :
             connStatus === "ng" ? "× 接続失敗" :
             "確認中…"}
          </div>
          {connError && (
            <div style={{ color: "#e05050", fontSize: 11, wordBreak: "break-all" }}>
              エラー: {connError}
            </div>
          )}
          {connStatus === "ng" && (
            <div style={{ color: "#8a6a30", fontSize: 11, lineHeight: 1.6, marginTop: 4 }}>
              Ollamaが起動しているか、Base URLが <code>http://127.0.0.1:11434</code> のままか、
              設定中のモデルを `ollama pull` 済みかを確認してください。
            </div>
          )}
          {models !== null && models.length === 0 && (
            <div style={{ color: "#e08030", fontSize: 11 }}>
              モデルなし — ollama pull でモデルを取得してください
            </div>
          )}
          {models && models.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>
                取得済みモデル (設定中: <strong>{model}</strong>):
              </div>
              {models.map((m) => (
                <div key={m.name} style={{
                  fontSize: 11, padding: "1px 6px", borderRadius: 4, marginBottom: 1,
                  background: m.name === model ? "#e8f0ff" : "#f8f8f8",
                  color: m.name === model ? "#3a70d0" : "#555",
                  fontFamily: "monospace",
                }}>
                  {m.name === model ? "▶ " : "  "}{m.name}
                </div>
              ))}
              {!models.some((m) => m.name === model) && (
                <div style={{ color: "#e05050", fontSize: 11, marginTop: 4 }}>
                  ⚠ 設定中のモデル「{model}」がリストにありません。モデル名を確認してください。
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ② Raw Chat テスト結果 */}
      {rawStatus !== "idle" && (
        <div style={{ padding: "6px 0", fontSize: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ color: rawColor, marginBottom: 2 }}>
            {rawStatus === "ok" ? "✓ Raw Chat 成功" :
             rawStatus === "err" ? "× Raw Chat 失敗" : "テスト中…"}
          </div>
          {rawOutput && (
            <div style={{ color: rawStatus === "ok" ? "#444" : "#e05050", fontSize: 11, wordBreak: "break-all" }}>
              {rawOutput}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>
            期待値: 「OLLAMA_OK_123」が含まれていれば OK
          </div>
        </div>
      )}

      {/* ③ コンパニオン発話テスト結果 */}
      {testStatus !== "idle" && (
        <div style={{ padding: "6px 0", fontSize: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ color: testStatus === "done" ? "#4caf7d" : testStatus === "err" ? "#e05050" : "#f0a030", marginBottom: 2 }}>
            {testStatus === "running" ? "AI 応答待ち中…" :
             testStatus === "done" ? "✓ コンパニオン発話テスト成功" : "× コンパニオン発話テスト失敗"}
          </div>
          {testOutput && (
            <div style={{ color: testStatus === "done" ? "#444" : "#e05050", fontStyle: testStatus === "done" ? "italic" : "normal" }}>
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

      {/* OpenAI 設定 (engine=openai のときのみ表示) */}
      {s.aiEngine === "openai" && (
        <>
          <SectionHead title="OpenAI 接続設定" />

          <div style={{
            marginBottom: 8, padding: "8px 12px", background: "#fff3e0",
            borderRadius: 8, fontSize: 11, color: "#8a5000", lineHeight: 1.7,
            border: "1px solid #f0c080",
          }}>
            <strong>⚠ 外部送信・API key 保存について</strong><br />
            API key は現在 <strong>端末内 localStorage に平文保存</strong> されます。
            端末を共有している場合は使用しないでください。<br />
            OpenAI にはクラウド経由でリクエストが送信されます。
            送る情報: 活動概要・ObservationSignal(抽象)・アプリカテゴリ・ユーザー入力。
            <strong>raw ファイル名・ウィンドウタイトル・transcript 履歴は送りません。</strong>
          </div>

          <Row label="API Key" note="sk-... — 端末内保存。漏洩注意">
            <input
              type="password"
              value={s.openaiApiKey}
              placeholder="sk-..."
              onChange={(e) => update({ openaiApiKey: e.target.value })}
              style={{
                fontSize: 12, border: "1px solid #ddd", borderRadius: 6,
                padding: "3px 8px", width: 200,
              }}
            />
          </Row>

          <Row label="モデル名" note="例: gpt-4o-mini / gpt-4o">
            <input
              type="text"
              value={s.openaiModel}
              onChange={(e) => update({ openaiModel: e.target.value })}
              style={{
                fontSize: 12, border: "1px solid #ddd", borderRadius: 6,
                padding: "3px 8px", width: 200,
              }}
            />
          </Row>

          <Row label="ベース URL" note="互換APIの場合のみ変更 (通常は変更不要)">
            <input
              type="text"
              value={s.openaiBaseUrl}
              onChange={(e) => update({ openaiBaseUrl: e.target.value })}
              style={{
                fontSize: 12, border: "1px solid #ddd", borderRadius: 6,
                padding: "3px 8px", width: 200,
              }}
            />
          </Row>

          <Row label="タイムアウト (ms)" note="">
            <input
              type="number"
              min={3000}
              max={60000}
              step={1000}
              value={s.openaiTimeoutMs}
              onChange={(e) => update({ openaiTimeoutMs: Number(e.target.value) })}
              style={{
                fontSize: 12, border: "1px solid #ddd", borderRadius: 6,
                padding: "3px 8px", width: 90,
              }}
            />
          </Row>

          <SectionHead title="送信スコープ設定" />
          <Row label="ObservationSignal を送る" note="アプリカテゴリ・フォルダ状況の抽象シグナル (raw除外)">
            <input
              type="checkbox"
              checked={s.openaiSendObservationSignals}
              onChange={(e) => update({ openaiSendObservationSignals: e.target.checked })}
            />
          </Row>
          <Row label="保存メモを送る" note="MemoryPageで「発話に使う」がONの保存メモだけ (最大5件)">
            <input
              type="checkbox"
              checked={s.openaiSendMemoryNotes}
              onChange={(e) => update({ openaiSendMemoryNotes: e.target.checked })}
            />
          </Row>

          <div style={{ fontSize: 11, color: "#999", lineHeight: 1.6, padding: "6px 0" }}>
            DebugページでOpenAIへ送る内容のプレビューを確認できます。
          </div>

          <OpenAITestSection model={s.openaiModel} timeoutMs={s.openaiTimeoutMs} />
        </>
      )}

      {/* プライバシーノート */}
      <div style={{
        marginTop: 20, padding: "10px 12px", background: "#f5f0ff",
        borderRadius: 8, fontSize: 11, color: "#6a40d0", lineHeight: 1.6,
      }}>
        <strong>プライバシー保護について</strong><br />
        AI に渡されるのは「活動の概要」「時刻帯」「席を離れた時間」などの抽象情報のみです。
        ウィンドウタイトル・ファイル名・URL・入力内容は一切送信されません (Ollama / rule)。
        OpenAI を使用する場合は上記の警告を確認してください。
        Ollama は完全にローカルで動作します。
      </div>
    </div>
  );
}
