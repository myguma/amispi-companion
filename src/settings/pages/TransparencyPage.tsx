// 無明が見ているもの — 透明性ページ (v2)
// ユーザーが「何を観測されているか」「今どう認識しているか」を確認できる

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "../store";
import type { PermissionSettings } from "../../privacy/permissions";
import type { ObservationSnapshot } from "../../observation/types";
import { inferActivity } from "../../companion/activity/inferActivity";

const YES = "✓";
const NO  = "×";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function Row({ icon, label, note }: { icon: string; label: string; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0" }}>
      <span style={{ fontSize: 14, width: 20, flexShrink: 0, color: icon === YES ? "#4caf7d" : icon === NO ? "#999" : "#f0a030" }}>{icon}</span>
      <div>
        <span style={{ fontSize: 13 }}>{label}</span>
        {note && <span style={{ fontSize: 11, color: "#999", display: "block" }}>{note}</span>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function StatusBadge({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "1px 8px", borderRadius: 10,
      fontSize: 11, fontWeight: 600, background: color + "22", color,
    }}>
      {label}
    </span>
  );
}

function LiveStatusPanel({ snap }: { snap: ObservationSnapshot | null }) {
  if (!snap) {
    return <div style={{ fontSize: 12, color: "#bbb", padding: "8px 0" }}>取得中…</div>;
  }

  const insight = inferActivity(snap);
  const idleMin = Math.round(snap.idle.idleMs / 60_000);
  const media   = snap.media;

  const activityColor =
    insight.kind === "deepFocus"     ? "#6a40d0" :
    insight.kind === "coding"        ? "#4a90d9" :
    insight.kind === "composing"     ? "#e07c3a" :
    insight.kind === "gaming"        ? "#d04060" :
    insight.kind === "watchingVideo" ? "#c040a0" :
    insight.kind === "listeningMusic"? "#4caf7d" :
    insight.kind === "browsing"      ? "#5090c0" :
    insight.kind === "idle"          ? "#aaa"    :
    insight.kind === "away"          ? "#ccc"    : "#888";

  return (
    <div style={{
      background: "#f7f4ff", borderRadius: 8, padding: "10px 12px",
      fontSize: 12, lineHeight: 1.8, marginBottom: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <StatusBadge color={activityColor} label={insight.summary} />
        <span style={{ color: "#aaa" }}>({Math.round(insight.confidence * 100)}%)</span>
      </div>
      <div style={{ color: "#666" }}>
        アプリ: <strong>{snap.activeApp?.category ?? "不明"}</strong>
        {snap.fullscreenLikely && <span style={{ marginLeft: 8, color: "#c040a0" }}>全画面中</span>}
      </div>
      {idleMin > 0 && (
        <div style={{ color: "#666" }}>idle: {idleMin}分</div>
      )}
      {media?.audioLikelyActive && (
        <div style={{ color: "#4caf7d" }}>
          {media.mediaKind === "music" ? "音楽" : "動画"}再生中 ({media.sourceCategory})
        </div>
      )}
    </div>
  );
}

function OllamaStatus({ baseUrl }: { baseUrl: string }) {
  const [status, setStatus] = useState<"checking" | "ok" | "ng">("checking");

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3_000);
    fetch(`${baseUrl}/api/tags`, { signal: ctrl.signal })
      .then((r) => setStatus(r.ok ? "ok" : "ng"))
      .catch(() => setStatus("ng"))
      .finally(() => clearTimeout(t));
    return () => ctrl.abort();
  }, [baseUrl]);

  if (status === "checking") return <StatusBadge color="#888" label="確認中…" />;
  if (status === "ok")       return <StatusBadge color="#4caf7d" label="接続OK" />;
  return <StatusBadge color="#e05050" label="未起動" />;
}

export function TransparencyPage() {
  const [settings, update] = useSettings();
  const p = settings.permissions;

  const toggle = (key: keyof PermissionSettings, val: boolean) => {
    update({ permissions: { ...p, [key]: val } });
  };

  // ライブ観測状態
  const [snap, setSnap] = useState<ObservationSnapshot | null>(null);
  const [lastFetch, setLastFetch] = useState<string>("");

  const fetchSnap = async () => {
    if (!isTauri) return;
    try {
      const s = await invoke<ObservationSnapshot>("get_observation_snapshot", {
        perms: {
          level: p.level,
          window_title_enabled: p.windowTitleEnabled,
          folder_metadata_enabled: p.folderMetadataEnabled,
          filenames_enabled: p.filenamesEnabled,
          cloud_allowed: p.cloudAllowed,
        },
      });
      setSnap(s);
      setLastFetch(new Date().toLocaleTimeString("ja-JP"));
    } catch { /* サイレント */ }
  };

  useEffect(() => { void fetchSnap(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: "0 4px" }}>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
        無明はPCの中だけで動作します。観測した情報は外部に送信されません。
      </p>

      {/* ── 現在の認識状態 (ライブ) ── */}
      <Section title="今の認識状態">
        <LiveStatusPanel snap={snap} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <button
            onClick={() => void fetchSnap()}
            style={{
              fontSize: 11, padding: "3px 10px", border: "1px solid #c8b8ff",
              borderRadius: 6, background: "white", color: "#6a40d0", cursor: "pointer",
            }}
          >
            更新
          </button>
          {lastFetch && <span style={{ fontSize: 11, color: "#bbb" }}>最終取得: {lastFetch}</span>}
        </div>
      </Section>

      {/* ── AI エンジン状態 ── */}
      <Section title="AI エンジン">
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
          <span style={{ fontSize: 13, flex: 1 }}>エンジン</span>
          <StatusBadge
            color={settings.aiEngine === "none" ? "#aaa" : settings.aiEngine === "mock" ? "#f0a030" : "#4a90d9"}
            label={settings.aiEngine === "none" ? "なし" : settings.aiEngine === "mock" ? "Mock" : "Ollama"}
          />
        </div>
        {settings.aiEngine === "ollama" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
            <span style={{ fontSize: 13, flex: 1 }}>Ollama ({settings.ollamaModel})</span>
            <OllamaStatus baseUrl={settings.ollamaBaseUrl} />
          </div>
        )}
        <Row icon={NO} label="クラウド AI: なし" note="すべてローカル処理" />
      </Section>

      {/* ── 気づけること ── */}
      <Section title="無明が気づけること">
        <Row icon={YES} label="現在時刻" note="朝/昼/夕/深夜の挨拶に使う" />
        <Row icon={p.level >= 1 ? YES : NO} label="入力がしばらくないこと (idle)" note="全画面や sleep の判定に使う" />
        <Row icon={p.level >= 1 ? YES : NO} label="アクティブなアプリの種類" note="browser / ide / media など — タイトルは見ない" />
        <Row icon={p.level >= 1 ? YES : NO} label="全画面アプリ中かどうか" note="全画面中は黙る" />
        <Row icon={p.level >= 1 ? YES : NO} label="音楽・動画アプリが起動中か" note="Spotify等が起動中かどうかのみ — 再生内容は取得しない" />
        <Row icon={p.level >= 1 && p.folderMetadataEnabled ? YES : NO} label="Desktop のファイル数" note="増えすぎたら一言" />
        <Row icon={p.level >= 1 && p.folderMetadataEnabled ? YES : NO} label="Downloads のファイル数" note="増えすぎたら一言" />
      </Section>

      {/* ── 許可すると見えるもの ── */}
      <Section title="許可すると見えるもの">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
          <input
            type="checkbox"
            id="title_perm"
            checked={p.windowTitleEnabled}
            onChange={(e) => toggle("windowTitleEnabled", e.target.checked)}
            style={{ width: 16, height: 16, flexShrink: 0 }}
          />
          <label htmlFor="title_perm" style={{ cursor: "pointer" }}>
            <span style={{ fontSize: 13 }}>アクティブウィンドウのタイトル</span>
            <span style={{ fontSize: 11, color: "#999", display: "block" }}>ウィンドウタイトルのみ。ファイル内容・URLは取得しない</span>
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
          <input type="checkbox" id="fn_perm" checked={false} disabled style={{ width: 16, height: 16, flexShrink: 0 }} />
          <label htmlFor="fn_perm" style={{ color: "#bbb", cursor: "not-allowed" }}>
            <span style={{ fontSize: 13 }}>ファイル名 (将来実装予定)</span>
          </label>
        </div>
      </Section>

      {/* ── 見ていないもの ── */}
      <Section title="見ていないもの — 常に OFF">
        <Row icon={NO} label="画面キャプチャ・スクリーンショット" />
        <Row icon={NO} label="マイク・音声入力の常時監視" />
        <Row icon={NO} label="クリップボードの内容" />
        <Row icon={NO} label="キーボード入力の内容" />
        <Row icon={NO} label="ファイルの中身" />
        <Row icon={NO} label="画像・PDF・動画の内容" />
        <Row icon={NO} label="メール・メッセージ本文" />
        <Row icon={NO} label="ブラウザ閲覧履歴" />
        <Row icon={NO} label="パスワード・秘密情報" />
      </Section>

      {/* ── 外部送信 ── */}
      <Section title="外部送信">
        <Row icon={NO} label={`クラウド AI 送信: ${p.cloudAllowed ? "ON" : "OFF (デフォルト)"}`} note="外部送信は常に手動で許可が必要" />
        <Row icon={NO} label="ファイル削除・移動・リネーム: なし" />
        <Row icon={NO} label="コマンド実行: なし" />
        <Row icon={NO} label="メール・SNS送信: なし" />
      </Section>

      <div style={{ fontSize: 11, color: "#aaa", borderTop: "1px solid #eee", paddingTop: 12, lineHeight: 1.7 }}>
        この情報はPCの外に出ません。<br />
        アプリを終了するといつでも観測が止まります。
      </div>
    </div>
  );
}
