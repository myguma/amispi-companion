// 初回起動オンボーディング

import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "../store";
import type { AIEngine, SpeechFrequency } from "../types";

const ONBOARDING_VERSION = 1;
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 14, marginBottom: 6 }}>
      {title}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: "1px solid #ebe6ff",
      borderRadius: 8,
      background: "white",
      padding: "12px 14px",
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function Toggle({
  label, note, checked, onChange,
}: { label: string; note?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f2f2f2", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{note}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
          background: checked ? "#a890f0" : "#ddd", flexShrink: 0, marginTop: 1,
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

function SelectRow({
  label, value, options, onChange,
}: { label: string; value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f2f2f2", gap: 12 }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontSize: 12, border: "1px solid #ddd", borderRadius: 6, padding: "3px 8px", background: "white" }}
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </div>
  );
}

function NumberRow({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f2f2f2", gap: 12 }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ fontSize: 12, border: "1px solid #ddd", borderRadius: 6, padding: "3px 8px", width: 76 }}
      />
    </div>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            width: i === step ? 18 : 7,
            height: 7,
            borderRadius: 4,
            background: i === step ? "#a890f0" : "#ded6f8",
            transition: "width 0.15s",
          }}
        />
      ))}
    </div>
  );
}

export function OnboardingPage({ onDone }: { onDone?: () => void }) {
  const [settings, update] = useSettings();
  const [step, setStep] = useState(0);
  const [connStatus, setConnStatus] = useState<"idle" | "checking" | "ok" | "ng">("idle");
  const [connMessage, setConnMessage] = useState("");

  const finish = useCallback(() => {
    update({ onboardingCompleted: true, onboardingVersion: ONBOARDING_VERSION });
    onDone?.();
  }, [onDone, update]);

  const testOllama = useCallback(async () => {
    setConnStatus("checking");
    setConnMessage("");
    try {
      const json = isTauri
        ? await invoke<string>("ollama_list_models", { baseUrl: settings.ollamaBaseUrl })
        : await fetch(`${settings.ollamaBaseUrl}/api/tags`).then((r) => r.text());
      const data = JSON.parse(json) as { models?: { name: string }[] };
      const count = data.models?.length ?? 0;
      setConnStatus("ok");
      setConnMessage(count > 0 ? `${count}件のモデルを確認しました` : "接続成功。モデルはまだありません");
    } catch (e) {
      setConnStatus("ng");
      setConnMessage((e instanceof Error ? e.message : String(e)).slice(0, 160));
    }
  }, [settings.ollamaBaseUrl]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: "#3a2870" }}>
            はじめに
          </h2>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            AmitySpirit Companion の初期設定
          </div>
        </div>
        <StepDots step={step} />
      </div>

      {step === 0 && (
        <Card>
          <SectionHead title="Welcome" />
          <h3 style={{ fontSize: 15, margin: "0 0 8px", color: "#3a2870" }}>
            静かにデスクトップに棲む観察型AIコンパニオン
          </h3>
          <Note>
            AmitySpirit Companion は、小さなキャラクターがデスクトップに常駐し、
            PC上の状態や現在のアプリを見ながら、ときどき短く反応するアプリです。
            汎用AIアシスタントではなく、作業の横にいる存在として振る舞います。
          </Note>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <SectionHead title="Privacy / Local-first" />
          <Note>
            生データを外部送信しません。クラウドAIは使いません。自動ファイル操作やコマンド実行もしません。
            常時マイク監視はせず、画面キャプチャ/OCRも現時点では実装しません。
          </Note>
          <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12, color: "#555" }}>
            <div>・観測は現在のアプリ種別や活動の概要が中心です</div>
            <div>・Ollamaを使う場合も接続先はローカルLLMです</div>
            <div>・記憶はアプリ内の軽いイベント履歴として扱います</div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <SectionHead title="AI Engine" />
          <SelectRow
            label="AIエンジン"
            value={settings.aiEngine}
            options={[
              { v: "none", label: "なし" },
              { v: "mock", label: "Mock" },
              { v: "ollama", label: "Ollama" },
            ]}
            onChange={(v) => update({ aiEngine: v as AIEngine })}
          />
          <div style={{ display: settings.aiEngine === "ollama" ? "block" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f2f2f2", gap: 12 }}>
              <span style={{ fontSize: 13 }}>Ollama URL</span>
              <input
                value={settings.ollamaBaseUrl}
                onChange={(e) => update({ ollamaBaseUrl: e.target.value })}
                style={{ fontSize: 12, border: "1px solid #ddd", borderRadius: 6, padding: "3px 8px", width: 210 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f2f2f2", gap: 12 }}>
              <span style={{ fontSize: 13 }}>モデル</span>
              <input
                value={settings.ollamaModel}
                onChange={(e) => update({ ollamaModel: e.target.value })}
                style={{ fontSize: 12, border: "1px solid #ddd", borderRadius: 6, padding: "3px 8px", width: 210 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => void testOllama()}
                disabled={connStatus === "checking"}
                style={{
                  fontSize: 12, padding: "5px 12px", border: "1px solid #a890f0",
                  borderRadius: 6, background: "white", color: "#6a40d0", cursor: "pointer",
                }}
              >
                {connStatus === "checking" ? "確認中…" : "接続テスト"}
              </button>
              {connStatus !== "idle" && (
                <span style={{
                  fontSize: 11,
                  color: connStatus === "ok" ? "#4caf7d" : connStatus === "ng" ? "#e05050" : "#888",
                }}>
                  {connStatus === "ok" ? "OK: " : connStatus === "ng" ? "NG: " : ""}{connMessage}
                </span>
              )}
            </div>
          </div>
          {settings.aiEngine !== "ollama" && (
            <Note>あとから「AI エンジン」タブで Ollama に切り替えられます。</Note>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card>
          <SectionHead title="Behavior" />
          <Toggle
            label="自律発話"
            note="最初はOFFまたは控えめがおすすめです"
            checked={settings.autonomousSpeechEnabled}
            onChange={(v) => update({ autonomousSpeechEnabled: v })}
          />
          <SelectRow
            label="発話頻度"
            value={settings.speechFrequency}
            options={[
              { v: "rare", label: "まれ" },
              { v: "low", label: "少なめ" },
              { v: "normal", label: "普通" },
            ]}
            onChange={(v) => update({ speechFrequency: v as SpeechFrequency })}
          />
          <NumberRow
            label="1時間の最大発話回数"
            value={settings.maxAutonomousReactionsPerHour}
            min={1}
            max={10}
            onChange={(v) => update({ maxAutonomousReactionsPerHour: v })}
          />
          <Toggle label="Quiet Mode" note="自律発話・鳴き声を大幅に減らします" checked={settings.quietMode} onChange={(v) => update({ quietMode: v })} />
          <Toggle label="Focus Mode" note="提案系の発話を止めます" checked={settings.focusMode} onChange={(v) => update({ focusMode: v })} />
          <Toggle label="Do Not Disturb" note="手動呼び出し以外を止めます" checked={settings.doNotDisturb} onChange={(v) => update({ doNotDisturb: v })} />
        </Card>
      )}

      {step === 4 && (
        <Card>
          <SectionHead title="Window / Controls" />
          <Toggle label="常に手前に表示" checked={settings.alwaysOnTop} onChange={(v) => update({ alwaysOnTop: v })} />
          <Toggle label="起動時に表示" checked={settings.showOnStartup} onChange={(v) => update({ showOnStartup: v })} />
          <Toggle
            label="デバッグモード"
            note="通常利用ではOFF推奨です。QA時だけレイアウト枠と座標を表示します"
            checked={settings.debugModeEnabled}
            onChange={(v) => update({ debugModeEnabled: v })}
          />
          <Note>
            キャラウィンドウは compact 200x280 固定です。speech表示時もwindow heightは広げません。
          </Note>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <SectionHead title="Finish" />
          <h3 style={{ fontSize: 15, margin: "0 0 8px", color: "#3a2870" }}>
            準備完了
          </h3>
          <Note>
            この画面は設定の「はじめに」タブからいつでも見直せます。
            まずは控えめな設定で使い、必要に応じてAIエンジンや自律発話を調整してください。
          </Note>
        </Card>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 14 }}>
        <button
          onClick={finish}
          style={{ fontSize: 12, padding: "6px 12px", border: "1px solid #ddd", borderRadius: 6, background: "white", color: "#888", cursor: "pointer" }}
        >
          {settings.onboardingCompleted ? "完了済みにする" : "スキップ"}
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setStep((v) => Math.max(0, v - 1))}
            disabled={step === 0}
            style={{ fontSize: 12, padding: "6px 12px", border: "1px solid #ddd", borderRadius: 6, background: "white", color: step === 0 ? "#bbb" : "#666", cursor: step === 0 ? "default" : "pointer" }}
          >
            戻る
          </button>
          {step < 5 ? (
            <button
              onClick={() => setStep((v) => Math.min(5, v + 1))}
              style={{ fontSize: 12, padding: "6px 14px", border: "none", borderRadius: 6, background: "#a890f0", color: "white", cursor: "pointer" }}
            >
              次へ
            </button>
          ) : (
            <button
              onClick={finish}
              style={{ fontSize: 12, padding: "6px 14px", border: "none", borderRadius: 6, background: "#a890f0", color: "white", cursor: "pointer" }}
            >
              はじめる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
