// 無明が見ているもの — 透明性ページ (v2)
// ユーザーが「何を観測されているか」「今どう認識しているか」を確認できる

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "../store";
import type { PermissionSettings } from "../../privacy/permissions";
import type { ObservationSnapshot } from "../../observation/types";
import { inferActivity } from "../../companion/activity/inferActivity";
import { buildMemorySummary } from "../../companion/memory/buildMemorySummary";
import { buildDailySummary } from "../../companion/memory/dailySummary";
import { getRecentEvents } from "../../systems/memory/memoryStore";
import { canSpeak } from "../../companion/speech/SpeechPolicy";

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

function ReasonTag({ text }: { text: string }) {
  // 技術タグを人間向けに変換
  const label =
    text === "input_active"    ? "入力あり" :
    text === "no_recent_input" ? "入力なし" :
    text === "fullscreen"      ? "全画面" :
    text === "high_cpu"        ? "CPU高" :
    text === "windowed"        ? "ウィンドウ" :
    text.startsWith("idle=")   ? text.replace("idle=", "").replace("min", "分").replace(/(\d+)s$/, "$1秒") + "無操作" :
    text.startsWith("bg_media:")? "バックグラウンド音楽" :
    text.startsWith("category=")? null : // category タグは表示しない
    text;

  if (label === null) return null;
  return (
    <span style={{
      display: "inline-block", padding: "1px 6px", borderRadius: 6,
      fontSize: 10, background: "#eee", color: "#666", margin: "0 2px 2px 0",
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
    insight.kind === "reading"       ? "#5b8fa8" :
    insight.kind === "browsing"      ? "#5090c0" :
    insight.kind === "idle"          ? "#aaa"    :
    insight.kind === "away"          ? "#ccc"    : "#888";

  const reasonTags = insight.reasons.filter((r) =>
    !r.startsWith("category=") && r !== "no_strong_signal" && r !== "no_category_match"
  );

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
        アプリ種別: <strong>{snap.activeApp?.category ?? "不明"}</strong>
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
      {snap.system?.cpuLoad !== undefined && snap.system.cpuLoad > 40 && (
        <div style={{ color: "#888" }}>CPU: {Math.round(snap.system.cpuLoad)}%</div>
      )}
      {reasonTags.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {reasonTags.map((r) => <ReasonTag key={r} text={r} />)}
        </div>
      )}
    </div>
  );
}

function MemorySummaryPanel() {
  const events  = getRecentEvents(200);
  const memory  = buildMemorySummary(events);
  const daily   = buildDailySummary(events);

  const breakLabel =
    memory.lastSessionBreak === "longDay"  ? "前回から日が明けた" :
    memory.lastSessionBreak === "hours"    ? "数時間ぶり" :
    memory.lastSessionBreak === "short"    ? "短い休憩あり" : "連続セッション";

  return (
    <div style={{
      background: "#f4f8f4", borderRadius: 8, padding: "10px 12px",
      fontSize: 12, lineHeight: 1.8,
    }}>
      <div style={{ color: "#666" }}>今日の起動: <strong>{daily.sessionCountToday}回</strong></div>
      <div style={{ color: "#666" }}>今日のクリック: <strong>{memory.todayClickCount}回</strong></div>
      {daily.activeHoursToday > 0 && (
        <div style={{ color: "#666" }}>
          起動からの経過: <strong>{daily.activeHoursToday}時間</strong>
        </div>
      )}
      <div style={{ color: "#888", fontSize: 11 }}>{breakLabel}</div>
      {memory.shortNaturalSummary && (
        <div style={{ color: "#555", marginTop: 4, fontSize: 11, fontStyle: "italic" }}>
          {memory.shortNaturalSummary}
        </div>
      )}
    </div>
  );
}

function SpeechControlPanel({
  snap,
  autonomousSpeechEnabled,
  settings,
}: {
  snap: ObservationSnapshot | null;
  autonomousSpeechEnabled: boolean;
  settings: ReturnType<typeof useSettings>[0];
}) {
  if (!snap) return <div style={{ fontSize: 12, color: "#bbb" }}>取得中…</div>;

  const insight = inferActivity(snap);

  // SpeechPolicy による抑制理由を計算 (近似: lastSpeechAt=null, count=0 で楽観的)
  const policyResult = canSpeak(
    "observation",
    settings,
    snap,
    null,
    0
  );

  // activity-based 抑制 (deepFocus / gaming / watchingVideo)
  const silentKinds = ["deepFocus", "gaming", "watchingVideo"] as const;
  const isSilentActivity = (silentKinds as readonly string[]).includes(insight.kind);

  const suppressReasons: string[] = [];
  if (!autonomousSpeechEnabled)              suppressReasons.push("自律発話: OFF");
  if (isSilentActivity)                      suppressReasons.push(`${insight.summary}中は抑制`);
  if (!policyResult.allowed) {
    const reasonMap: Record<string, string> = {
      dnd:           "DND モード",
      quiet:         "Quiet モード",
      focus:         "Focus モード",
      fullscreen:    "全画面中",
      rateLimit:     "発話上限に達した",
      recentlySpoke: "直前に発話した",
    };
    suppressReasons.push(reasonMap[policyResult.reason ?? ""] ?? policyResult.reason ?? "抑制中");
  }

  const nextBehavior =
    !autonomousSpeechEnabled
      ? "自律発話なし (クリックで反応)"
      : suppressReasons.length > 0
        ? "今は黙る"
        : snap.fullscreenLikely
          ? "全画面中なので抑制"
          : insight.kind === "deepFocus"
            ? "集中中なので抑制"
            : "状態変化があれば小さく反応";

  const statusColor = suppressReasons.length > 0 ? "#aaa" : "#4caf7d";

  return (
    <div style={{
      background: "#f8f8ff", borderRadius: 8, padding: "10px 12px",
      fontSize: 12, lineHeight: 1.8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <StatusBadge
          color={autonomousSpeechEnabled ? "#4a90d9" : "#aaa"}
          label={autonomousSpeechEnabled ? "自律発話: ON" : "自律発話: OFF"}
        />
        <StatusBadge color={statusColor} label={nextBehavior} />
      </div>
      {suppressReasons.length > 0 && (
        <div style={{ color: "#999", fontSize: 11, marginTop: 2 }}>
          抑制中: {suppressReasons.join(" / ")}
        </div>
      )}
      <div style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
        推定状態: {insight.summary} ({Math.round(insight.confidence * 100)}%)
      </div>
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
  const autonomousSpeechEnabled = (settings as { autonomousSpeechEnabled?: boolean }).autonomousSpeechEnabled ?? false;

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

      {/* ── 発話制御 ── */}
      <Section title="発話制御">
        <SpeechControlPanel
          snap={snap}
          autonomousSpeechEnabled={autonomousSpeechEnabled}
          settings={settings}
        />
      </Section>

      {/* ── 今日の記憶 ── */}
      <Section title="今日の記憶">
        <MemorySummaryPanel />
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
        <Row icon={YES} label="CPU 使用率 (概略)" note="ビルド中等の推定に使う — ファイルや内容は見ない" />
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
