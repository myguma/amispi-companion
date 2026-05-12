// 無明の記憶 — Memory Viewer ページ
// ローカルに保存された記憶イベント / 今日の活動サマリーの確認・削除UI

import { useState, useCallback } from "react";
import type { MemoryEvent, MemoryEventType } from "../../types/companion";
import {
  getAllEvents,
  clearEvents,
  clearEventsByType,
  getMemoryStats,
  type MemoryStats,
} from "../../systems/memory/memoryStore";
import { buildDailySummary, type DailySummary } from "../../companion/memory/dailySummary";

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
  const [data, setData] = useState(() => loadPageData());
  const [filter, setFilter] = useState<FilterType>("all");
  const [isDeleting, setIsDeleting] = useState(false);

  const refresh = useCallback(() => {
    setData(loadPageData());
  }, []);

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
