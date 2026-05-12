// 無明が見ているもの — 透明性ページ (v2)
// ユーザーが「何を観測されているか」「今どう認識しているか」を確認できる

import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "../store";
import type { PermissionSettings } from "../../privacy/permissions";
import type { ObservationSnapshot } from "../../observation/types";
import { inferActivity } from "../../companion/activity/inferActivity";
import { buildMemorySummary } from "../../companion/memory/buildMemorySummary";
import { buildDailySummary } from "../../companion/memory/dailySummary";
import { getRecentEvents } from "../../systems/memory/memoryStore";
import { canSpeak } from "../../companion/speech/SpeechPolicy";

type ActiveAppDebugInfo = {
  platform: string;
  hwndAvailable: boolean;
  hwndRaw: number;
  pid: number;
  pidAvailable: boolean;
  openProcessOk: boolean;
  queryNameOk: boolean;
  processName: string;
  processPathLen: number;
  category: string;
  errorStage: string;
  errorCode: number;
  lastErrorBefore: number;
  isSelfApp: boolean;
};

type RawActiveAppDebugInfo = Partial<ActiveAppDebugInfo> & Record<string, unknown>;

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

function categoryLabel(cat: string): string {
  const MAP: Record<string, string> = {
    ide: "IDE/エディタ", daw: "DAW/音楽制作", browser: "ブラウザ",
    media: "メディア", game: "ゲーム", office: "オフィス",
    terminal: "ターミナル", communication: "チャット/通話",
    system: "システム", self: "自アプリ (設定画面)",
    unknown: "不明",
  };
  return MAP[cat] ?? cat;
}

function unknownReason(snap: ObservationSnapshot): string | null {
  if (!snap.activeApp) return "前面アプリ名を取得できませんでした (権限不足の可能性)";
  if (snap.activeApp.category === "self") return "設定画面・コンパニオン自身が前面です";
  if (snap.activeApp.category === "unknown") {
    return `アプリ名は取得済み (${snap.activeApp.processName}) ですが分類未登録です`;
  }
  return null;
}

function errorStageLabel(stage: string, code: number): string {
  const labels: Record<string, string> = {
    ok:                  "成功",
    hwnd_null:           "フォアグラウンドウィンドウ取得失敗 (HWND null)",
    pid_zero:            "プロセスID取得失敗 (PID=0)",
    open_process_failed: "プロセスハンドル取得失敗 (OpenProcess)",
    query_name_failed:   "プロセス名取得失敗 (QueryFullProcessImageNameW)",
    unsupported_platform:"非Windowsプラットフォーム",
    missing_field:       "デバッグ結果の必須フィールド未受信",
  };
  const label = labels[stage] ?? stage;
  return code > 0 ? `${label} (Win32エラー: ${code})` : label;
}

function pickBool(raw: RawActiveAppDebugInfo, camel: keyof ActiveAppDebugInfo, snake: string): boolean {
  return Boolean(raw[camel] ?? raw[snake] ?? false);
}

function pickNumber(raw: RawActiveAppDebugInfo, camel: keyof ActiveAppDebugInfo, snake: string): number | undefined {
  const value = raw[camel] ?? raw[snake];
  return typeof value === "number" ? value : undefined;
}

function pickString(raw: RawActiveAppDebugInfo, camel: keyof ActiveAppDebugInfo, snake: string): string {
  const value = raw[camel] ?? raw[snake];
  return typeof value === "string" ? value : "";
}

function normalizeDebugInfo(raw: RawActiveAppDebugInfo): ActiveAppDebugInfo {
  return {
    platform: pickString(raw, "platform", "platform") || "?",
    hwndAvailable: pickBool(raw, "hwndAvailable", "hwnd_available"),
    hwndRaw: pickNumber(raw, "hwndRaw", "hwnd_raw") ?? -1,
    pid: pickNumber(raw, "pid", "pid") ?? 0,
    pidAvailable: pickBool(raw, "pidAvailable", "pid_available"),
    openProcessOk: pickBool(raw, "openProcessOk", "open_process_ok"),
    queryNameOk: pickBool(raw, "queryNameOk", "query_name_ok"),
    processName: pickString(raw, "processName", "process_name"),
    processPathLen: pickNumber(raw, "processPathLen", "process_path_len") ?? 0,
    category: pickString(raw, "category", "category") || "unknown",
    errorStage: pickString(raw, "errorStage", "error_stage") || "missing_field",
    errorCode: pickNumber(raw, "errorCode", "error_code") ?? 0,
    lastErrorBefore: pickNumber(raw, "lastErrorBefore", "last_error_before") ?? 0,
    isSelfApp: pickBool(raw, "isSelfApp", "is_self_app"),
  };
}

function ActiveAppDebugPanel() {
  const [info, setInfo] = useState<ActiveAppDebugInfo | null>(null);
  const [rawInfo, setRawInfo] = useState<RawActiveAppDebugInfo | null>(null);
  const [fetching, setFetching] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const fetchingRef  = useRef(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDebug = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setFetching(true);
    try {
      const d = await invoke<RawActiveAppDebugInfo>("get_active_app_debug");
      console.log("[active-app-debug]", d);
      setRawInfo(d);
      setInfo(normalizeDebugInfo(d));
    } catch (err) {
      console.warn("[active-app-debug] failed", err);
    }
    fetchingRef.current = false;
    setFetching(false);
  };

  const fetchDelayed = () => {
    if (fetchingRef.current || countdown !== null) return;
    setCountdown(3);
    let n = 3;
    intervalRef.current = setInterval(() => {
      n--;
      if (n <= 0) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        setCountdown(null);
        void fetchDebug();
      } else {
        setCountdown(n);
      }
    }, 1000);
  };

  useEffect(() => {
    void fetchDebug();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // hwndRaw を安全に hex 表示するヘルパー
  const fmtHwnd = (v: number | undefined | null): string => {
    if (v == null || v < 0) return "フィールド未受信";
    if (v === 0) return "NULL(0)";
    return `0x${v.toString(16)}`;
  };

  if (!info && countdown === null && !fetching) return <div style={{ fontSize: 12, color: "#bbb" }}>取得中…</div>;

  const stageOk = info?.errorStage === "ok";
  const stageColor = stageOk ? "#4caf7d" : "#e05050";

  return (
    <div style={{ background: "#fff8f0", borderRadius: 8, padding: "10px 12px", fontSize: 11, lineHeight: 1.9, fontFamily: "monospace" }}>
      {info ? (
        <>
          <div style={{ color: stageColor, fontWeight: 700, marginBottom: 4 }}>
            [{info.platform ?? "?"}] {errorStageLabel(info.errorStage ?? "", info.errorCode ?? 0)}
          </div>
          <div>hwnd: {info.hwndAvailable ? "✓" : "✗"}  (raw={fmtHwnd(info.hwndRaw)})</div>
          <div>pid: {info.pidAvailable ? `✓ (${info.pid})` : "✗"}</div>
          <div>OpenProcess: {info.openProcessOk ? "✓" : "✗"}</div>
          <div>QueryName: {info.queryNameOk ? "✓" : "✗"}</div>
          <div>pathLen: {info.processPathLen}</div>
          {info.lastErrorBefore != null && info.lastErrorBefore > 0 && (
            <div style={{ color: "#e08030" }}>pre-call LastError: {info.lastErrorBefore}</div>
          )}
          {info.processName && <div>processName: <strong>{info.processName}</strong></div>}
          {info.queryNameOk && <div>category: <strong>{info.category}</strong></div>}
          {info.isSelfApp && (
            <div style={{ color: "#e08030", marginTop: 4 }}>
              ⚠ 設定画面自身が前面です。他のアプリを前面にして再取得してください。
            </div>
          )}
        </>
      ) : (
        <div style={{ color: "#bbb" }}>{fetching ? "取得中…" : "データなし"}</div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        <button
          onClick={() => void fetchDebug()}
          disabled={fetching || countdown !== null}
          style={{ fontSize: 11, padding: "2px 10px", border: "1px solid #ddd", borderRadius: 4, background: "white", cursor: "pointer" }}
        >
          {fetching ? "取得中…" : "今すぐ再取得"}
        </button>
        <button
          onClick={fetchDelayed}
          disabled={fetching || countdown !== null}
          style={{ fontSize: 11, padding: "2px 10px", border: "1px solid #f0a030", borderRadius: 4, background: "#fffbe8", cursor: "pointer", color: "#a06010" }}
        >
          {countdown !== null ? `${countdown}秒後にキャプチャ…` : "3秒後にキャプチャ"}
        </button>
      </div>
      {countdown !== null && (
        <div style={{ color: "#f0a030", marginTop: 4 }}>
          3秒以内に確認したいウィンドウをクリックして、キーボード入力を受ける一番手前の状態にしてください。最大化は不要です。
        </div>
      )}
      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: "pointer", color: "#a06010" }}>raw JSON</summary>
        <pre style={{
          marginTop: 4, padding: 8, background: "rgba(255,255,255,0.7)",
          border: "1px solid #f0d8b8", borderRadius: 6, overflowX: "auto",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {rawInfo ? JSON.stringify(rawInfo, null, 2) : "null"}
        </pre>
      </details>
    </div>
  );
}

function LiveStatusPanel({ snap }: { snap: ObservationSnapshot | null }) {
  if (!snap) {
    return <div style={{ fontSize: 12, color: "#bbb", padding: "8px 0" }}>取得中…</div>;
  }

  const insight = inferActivity(snap);
  const idleMin = Math.round(snap.idle.idleMs / 60_000);
  const media   = snap.media;
  const reason  = unknownReason(snap);

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
        アプリ種別: <strong>{snap.activeApp ? categoryLabel(snap.activeApp.category) : "不明"}</strong>
        {snap.activeApp && (
          <span style={{ color: "#aaa", fontSize: 11, marginLeft: 6 }}>
            ({snap.activeApp.processName})
          </span>
        )}
        {snap.fullscreenLikely && <span style={{ marginLeft: 8, color: "#c040a0" }}>全画面中</span>}
      </div>
      {reason && (
        <div style={{ color: "#e08030", fontSize: 11, marginTop: 2 }}>⚠ {reason}</div>
      )}
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

  useEffect(() => {
    void fetchSnap();
    // TransparencyPage 表示中は 10秒ごとに自動更新
    const timer = setInterval(() => { void fetchSnap(); }, 10_000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: "0 4px" }}>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
        無明はPCの中だけで動作します。観測した情報は外部に送信されません。
      </p>

      {/* ── 現在の認識状態 (ライブ) ── */}
      <Section title="今の認識状態">
        <LiveStatusPanel snap={snap} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          <button
            onClick={() => void fetchSnap()}
            style={{
              fontSize: 11, padding: "3px 10px", border: "1px solid #c8b8ff",
              borderRadius: 6, background: "white", color: "#6a40d0", cursor: "pointer",
            }}
          >
            手動更新
          </button>
          {lastFetch && <span style={{ fontSize: 11, color: "#bbb" }}>最終取得: {lastFetch}</span>}
          <span style={{ fontSize: 10, color: "#ccc" }}>自動更新: 10秒ごと</span>
        </div>
      </Section>

      {/* ── アクティブアプリ取得デバッグ ── */}
      <Section title="アクティブアプリ取得 デバッグ">
        <div style={{ fontSize: 11, color: "#999", marginBottom: 6, lineHeight: 1.6 }}>
          フォアグラウンドプロセス名取得の各段階を表示します。<br />
          「設定画面以外のアプリ」を前面にした状態で「再取得」を押してください。
        </div>
        <ActiveAppDebugPanel />
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
        アプリを終了するといつでも観測が止まります。<br />
        過去の記録や今日の記憶は「<strong style={{ color: "#6a40d0" }}>記憶</strong>」タブで確認・削除できます。
      </div>
    </div>
  );
}
