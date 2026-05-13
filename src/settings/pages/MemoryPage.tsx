// 無明の記憶 — Memory Viewer ページ
// ローカルに保存された記憶イベント / 今日の活動サマリーの確認・削除UI

import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MemoryEvent, MemoryEventType } from "../../types/companion";
import {
  getAllEvents,
  clearEvents,
  clearEventsByType,
  getMemoryStats,
  countExpiredEvents,
  pruneExpiredEvents,
  buildMemoryExportPayload,
  type MemoryStats,
  type MemoryRetentionResult,
  type MemoryExportPayload,
} from "../../systems/memory/memoryStore";
import { buildDailySummary, type DailySummary } from "../../companion/memory/dailySummary";
import { useSettings } from "../store";

// ────────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────────

/** タイムスタンプを相対表現に変換 */
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec  = Math.round(diff / 1000);
  if (sec < 60)           return "今";
  const min = Math.round(sec / 60);
  if (min < 60)           return `${min}分前`;
  const h = Math.round(min / 60);
  if (h < 24)             return `${h}時間前`;
  const d = Math.round(h / 24);
  if (d < 30)             return `${d}日前`;
  return new Date(ts).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

/** タイムスタンプを時刻表示 */
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatExportRange(events: MemoryEvent[]): string {
  if (events.length === 0) return "記録なし";
  const oldest = events[0]?.timestamp;
  const newest = events[events.length - 1]?.timestamp;
  if (typeof oldest !== "number" || typeof newest !== "number") return "期間不明";
  return `${formatDateTime(oldest)} 〜 ${formatDateTime(newest)}`;
}

// イベントタイプの日本語ラベル・色
const EVENT_TYPE_LABELS: Record<MemoryEventType, string> = {
  app_start:          "起動",
  character_clicked:  "タップ",
  speech_shown:       "発話",
  state_changed:      "状態変化",
  note_saved:         "メモ",
};

const EVENT_TYPE_COLORS: Record<MemoryEventType, string> = {
  app_start:          "#4a90d9",
  character_clicked:  "#4caf7d",
  speech_shown:       "#6a40d0",
  state_changed:      "#aaa",
  note_saved:         "#e07c3a",
};

// フィルタ選択肢
type FilterType = MemoryEventType | "all";
const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all",               label: "すべて" },
  { value: "speech_shown",      label: "発話" },
  { value: "character_clicked", label: "タップ" },
  { value: "app_start",         label: "起動" },
  { value: "state_changed",     label: "状態変化" },
  { value: "note_saved",        label: "メモ" },
];

const DISPLAY_LIMIT = 50;
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const RETENTION_OPTIONS: { value: number; label: string; description: string }[] = [
  { value: 7,  label: "7日",  description: "短めに保つ" },
  { value: 30, label: "30日", description: "推奨" },
  { value: 90, label: "90日", description: "長めに保つ" },
  { value: 0,  label: "無期限", description: "自動削除なし" },
];

// ────────────────────────────────────────────────
// サブコンポーネント
// ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function StatCard({ stats, daily }: { stats: MemoryStats; daily: DailySummary }) {
  return (
    <div style={{ background: "#f4f0ff", borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 2 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 24px" }}>
        <span style={{ color: "#666" }}>記録件数: <strong>{stats.totalEvents}</strong></span>
        <span style={{ color: "#666" }}>今日のタップ: <strong>{stats.clickCount}</strong></span>
        <span style={{ color: "#666" }}>今日の発話: <strong>{stats.speechCount}</strong></span>
        <span style={{ color: "#666" }}>今日の起動: <strong>{daily.sessionCountToday}</strong></span>
      </div>
      {stats.oldestEventAt && (
        <div style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>
          最古: {relativeTime(stats.oldestEventAt)} / 最新: {stats.newestEventAt ? relativeTime(stats.newestEventAt) : "—"}
        </div>
      )}
      <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          display: "inline-block", padding: "1px 8px", borderRadius: 10,
          fontSize: 10, fontWeight: 600, background: "#4caf7d22", color: "#4caf7d",
        }}>ローカル保存のみ</span>
        <span style={{ fontSize: 11, color: "#aaa" }}>外部には送信されません</span>
      </div>
    </div>
  );
}

function DailySummaryPanel({ daily }: { daily: DailySummary }) {
  if (daily.sessionCountToday === 0) {
    return (
      <div style={{ background: "#fafafa", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#bbb" }}>
        今日はまだ記録が少ないです。
      </div>
    );
  }

  return (
    <div style={{ background: "#fafafa", borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 1.9 }}>
      {daily.naturalSummary && (
        <div style={{ color: "#555", marginBottom: 6, fontStyle: "italic" }}>{daily.naturalSummary}</div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 20px", color: "#777" }}>
        {daily.sessionStartTime !== null && (
          <span>起動: {formatTime(daily.sessionStartTime)}〜</span>
        )}
        {daily.activeHoursToday > 0 && (
          <span>経過: {daily.activeHoursToday}時間</span>
        )}
        <span>タップ: {daily.todayClickCount}回</span>
        <span>発話: {daily.todaySpeechCount}回</span>
      </div>
    </div>
  );
}

function EventTypeBadge({ type }: { type: MemoryEventType }) {
  const color = EVENT_TYPE_COLORS[type] ?? "#888";
  const label = EVENT_TYPE_LABELS[type] ?? type;
  return (
    <span style={{
      display: "inline-block", padding: "0 7px", borderRadius: 6,
      fontSize: 10, fontWeight: 600, background: color + "22", color,
      flexShrink: 0, lineHeight: "20px",
    }}>
      {label}
    </span>
  );
}

function EventItem({ event }: { event: MemoryEvent }) {
  // speech_shown のテキストを preview
  const preview = event.type === "speech_shown" && typeof event.data?.text === "string"
    ? `「${String(event.data.text).slice(0, 40)}」`
    : event.type === "state_changed" && typeof event.data?.to === "string"
      ? `→ ${String(event.data.to)}`
      : null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "5px 0", borderBottom: "1px solid #f0f0f0", fontSize: 12,
    }}>
      <EventTypeBadge type={event.type} />
      <span style={{ color: "#aaa", flexShrink: 0, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
        {relativeTime(event.timestamp)}
      </span>
      {preview && (
        <span style={{ color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {preview}
        </span>
      )}
    </div>
  );
}

function FilterBar({ active, onChange }: { active: FilterType; onChange: (v: FilterType) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "2px 10px", fontSize: 11, borderRadius: 12, cursor: "pointer",
            border: active === opt.value ? "1px solid #a890f0" : "1px solid #ddd",
            background: active === opt.value ? "#f0ebff" : "white",
            color: active === opt.value ? "#6a40d0" : "#888",
            fontWeight: active === opt.value ? 600 : 400,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function RetentionSummary({ result }: { result: MemoryRetentionResult }) {
  if (!result.enabled) {
    return (
      <span style={{ color: "#888" }}>
        自動削除は無効です。記録は最大500件まで、このPC内に保存されます。
      </span>
    );
  }

  const cutoff = result.cutoffTimestamp
    ? new Date(result.cutoffTimestamp).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })
    : "—";

  return (
    <span style={{ color: "#888" }}>
      {cutoff} より古い記録が対象です。現在の設定では <strong>{result.deletedCount}</strong> 件が削除対象です。
    </span>
  );
}

function ExportSummary({ events }: { events: MemoryEvent[] }) {
  const typeCount = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.type] = (acc[event.type] ?? 0) + 1;
    return acc;
  }, {});
  const labels = FILTER_OPTIONS
    .filter((opt) => opt.value !== "all")
    .map((opt) => `${opt.label}:${typeCount[opt.value] ?? 0}`)
    .join(" / ");

  return (
    <div style={{ fontSize: 11, color: "#888", lineHeight: 1.7 }}>
      <div>件数: <strong>{events.length}</strong> 件</div>
      <div>期間: {formatExportRange(events)}</div>
      <div>タイプ: {labels}</div>
    </div>
  );
}

function makeExportFileName(payload: MemoryExportPayload): string {
  const stamp = payload.exportedAt.replace(/[:.]/g, "-");
  return `amispi-memory-${stamp}.json`;
}

function downloadJson(payload: MemoryExportPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = makeExportFileName(payload);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ────────────────────────────────────────────────
// MemoryPage 本体
// ────────────────────────────────────────────────

function loadPageData() {
  const allEvents = getAllEvents(); // 全件 (古い順)
  const stats     = getMemoryStats();
  const daily     = buildDailySummary(allEvents);
  // 表示用: 新しい順 (逆順) で最大 DISPLAY_LIMIT 件
  const reversed  = [...allEvents].reverse();
  return { allEvents: reversed, stats, daily };
}

export function MemoryPage() {
  const [settings, updateSettings] = useSettings();
  const [data, setData] = useState(() => loadPageData());
  const [filter, setFilter] = useState<FilterType>("all");
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastRetentionResult, setLastRetentionResult] = useState<MemoryRetentionResult | null>(null);
  const [appVersion, setAppVersion] = useState("dev");
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    invoke<string>("get_app_version").then(setAppVersion).catch(() => setAppVersion("?"));
  }, []);

  const refresh = useCallback(() => {
    setData(loadPageData());
    setLastRetentionResult(null);
    setExportStatus(null);
  }, []);

  const retentionPreview = countExpiredEvents(settings.memoryRetentionDays);

  // 全記憶削除
  const handleClearAll = useCallback(() => {
    if (!window.confirm(
      "無明のローカル記憶をすべて削除しますか？\n\n" +
      "削除される情報:\n" +
      "・起動ログ・クリック記録・発話ログ・状態変化ログ\n" +
      "・今日の活動サマリー\n\n" +
      "この操作は元に戻せません。"
    )) return;

    setIsDeleting(true);
    try {
      clearEvents();
    } finally {
      setIsDeleting(false);
    }
    refresh();
  }, [refresh]);

  // 発話ログのみ削除
  const handleClearSpeeches = useCallback(() => {
    if (!window.confirm(
      "無明の発話ログのみ削除しますか？\n" +
      "起動ログ・クリック記録は残ります。"
    )) return;

    clearEventsByType("speech_shown");
    refresh();
  }, [refresh]);

  const handleRetentionChange = useCallback((retentionDays: number) => {
    updateSettings({ memoryRetentionDays: retentionDays });
    setLastRetentionResult(null);
  }, [updateSettings]);

  const handlePruneExpired = useCallback(() => {
    const preview = countExpiredEvents(settings.memoryRetentionDays);
    if (!preview.enabled) {
      setLastRetentionResult(preview);
      return;
    }

    if (preview.deletedCount > 0 && !window.confirm(
      `${preview.deletedCount}件の古い記録を整理しますか？\n\n` +
      "削除された記録は元に戻せません。"
    )) return;

    const result = pruneExpiredEvents(settings.memoryRetentionDays);
    setLastRetentionResult(result);
    setData(loadPageData());
  }, [settings.memoryRetentionDays]);

  const handleExport = useCallback(() => {
    const events = getAllEvents();
    const payload = buildMemoryExportPayload(appVersion, settings.memoryRetentionDays);
    downloadJson(payload);
    setExportStatus(`${events.length}件の記録をJSONとして保存しました`);
  }, [appVersion, settings.memoryRetentionDays]);

  // フィルタ適用
  const filteredEvents = filter === "all"
    ? data.allEvents
    : data.allEvents.filter((e) => e.type === filter);

  const displayedEvents = filteredEvents.slice(0, DISPLAY_LIMIT);
  const hasMore = filteredEvents.length > DISPLAY_LIMIT;

  return (
    <div style={{ padding: "0 4px" }}>
      {/* 説明 */}
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.7 }}>
        無明の記憶はこのPC内にのみ保存されます。外部には送信されません。<br />
        ここから確認・削除できます。
      </p>

      {/* 統計サマリー */}
      <Section title="今日の記憶">
        <StatCard stats={data.stats} daily={data.daily} />
      </Section>

      {/* 今日の活動サマリー */}
      <Section title="今日の様子">
        <DailySummaryPanel daily={data.daily} />
      </Section>

      {/* 保存期間 */}
      <Section title="保存期間">
        <div style={{ background: "#f7fbff", borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 1.8 }}>
          <p style={{ color: "#666", margin: "0 0 10px" }}>
            古い記録はこのPC内で自動削除されます。外部送信は行いません。
            DailySummary は保存された記録から再計算されます。
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {RETENTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRetentionChange(option.value)}
                style={{
                  padding: "4px 11px",
                  borderRadius: 14,
                  border: settings.memoryRetentionDays === option.value ? "1px solid #4a90d9" : "1px solid #d8e5f5",
                  background: settings.memoryRetentionDays === option.value ? "#eaf4ff" : "white",
                  color: settings.memoryRetentionDays === option.value ? "#286aa5" : "#777",
                  fontSize: 12,
                  fontWeight: settings.memoryRetentionDays === option.value ? 600 : 400,
                  cursor: "pointer",
                }}
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, marginBottom: 10 }}>
            <RetentionSummary result={retentionPreview} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handlePruneExpired}
              disabled={data.stats.totalEvents === 0}
              style={{
                fontSize: 12, padding: "5px 14px", border: "1px solid #b8d4f0",
                borderRadius: 6, background: "white", color: "#286aa5", cursor: "pointer",
                opacity: data.stats.totalEvents === 0 ? 0.4 : 1,
              }}
            >
              今すぐ整理
            </button>
            {lastRetentionResult && (
              <span style={{ fontSize: 11, color: "#888" }}>
                {lastRetentionResult.enabled
                  ? `${lastRetentionResult.deletedCount}件を整理しました`
                  : "無期限のため自動整理は無効です"}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* エクスポート */}
      <Section title="エクスポート">
        <div style={{ background: "#f7fff8", borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 1.8 }}>
          <p style={{ color: "#666", margin: "0 0 10px" }}>
            現在保存されている記録をJSONとしてこのPCに保存します。外部送信は行いません。
            インポート機能はまだありません。
          </p>
          <ExportSummary events={[...data.allEvents].reverse()} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button
              onClick={handleExport}
              style={{
                fontSize: 12, padding: "5px 14px", border: "1px solid #bfe0c8",
                borderRadius: 6, background: "white", color: "#2f7b4f", cursor: "pointer",
              }}
            >
              JSONを書き出す
            </button>
            <span style={{ fontSize: 11, color: "#888" }}>
              schemaVersion: 1 / appVersion: v{appVersion}
            </span>
            {exportStatus && (
              <span style={{ fontSize: 11, color: "#4caf7d" }}>{exportStatus}</span>
            )}
          </div>
        </div>
      </Section>

      {/* イベントログ */}
      <Section title={`記録ログ (全${data.stats.totalEvents}件)`}>
        <FilterBar active={filter} onChange={setFilter} />
        {displayedEvents.length === 0 ? (
          <div style={{ fontSize: 12, color: "#bbb", padding: "8px 0" }}>記録がありません</div>
        ) : (
          <div style={{ background: "#fafafa", borderRadius: 8, padding: "4px 12px" }}>
            {displayedEvents.map((e) => (
              <EventItem key={e.id} event={e} />
            ))}
            {hasMore && (
              <div style={{ fontSize: 11, color: "#bbb", padding: "6px 0", textAlign: "center" }}>
                最新 {DISPLAY_LIMIT}件を表示中 (全 {filteredEvents.length}件)
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 削除コントロール */}
      <Section title="削除">
        <div style={{ background: "#fff8f4", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px" }}>
            削除した記憶は復元できません。無明は削除後、記憶なしの状態から再スタートします。
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              onClick={handleClearSpeeches}
              style={{
                fontSize: 12, padding: "5px 14px", border: "1px solid #ddd",
                borderRadius: 6, background: "white", color: "#888", cursor: "pointer",
              }}
            >
              発話ログのみ削除
            </button>
            <button
              onClick={handleClearAll}
              disabled={isDeleting || data.stats.totalEvents === 0}
              style={{
                fontSize: 12, padding: "5px 14px", border: "1px solid #f0a030",
                borderRadius: 6, background: "white", color: "#d06020", cursor: "pointer",
                opacity: data.stats.totalEvents === 0 ? 0.4 : 1,
              }}
            >
              {isDeleting ? "削除中…" : "すべての記憶を削除"}
            </button>
            <button
              onClick={refresh}
              style={{
                fontSize: 12, padding: "5px 14px", border: "1px solid #c8b8ff",
                borderRadius: 6, background: "white", color: "#6a40d0", cursor: "pointer",
                marginLeft: "auto",
              }}
            >
              更新
            </button>
          </div>
        </div>
      </Section>

      <div style={{ fontSize: 11, color: "#aaa", borderTop: "1px solid #eee", paddingTop: 12, lineHeight: 1.7 }}>
        記憶はこのPC内の localStorage にのみ保存されます。<br />
        クラウド・外部サービスへの送信は行いません。
      </div>
    </div>
  );
}
