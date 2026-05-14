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
  saveMemoryNote,
  getSavedMemoryNotes,
  getPromptMemoryNotes,
  updateMemoryNote,
  deleteEventById,
  importMemoryNotesFromPayload,
  type MemoryStats,
  type MemoryRetentionResult,
  type MemoryExportPayload,
  type MemoryNoteCategory,
  type SavedMemoryNote,
} from "../../systems/memory/memoryStore";
import { buildDailySummary, type DailySummary } from "../../companion/memory/dailySummary";
import { useSettings } from "../store";
import type { MemoryMode } from "../types";

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

const MEMORY_NOTE_CATEGORIES: { value: MemoryNoteCategory; label: string }[] = [
  { value: "preference", label: "好み" },
  { value: "project", label: "プロジェクト" },
  { value: "creative_direction", label: "創作方針" },
  { value: "technical_context", label: "技術文脈" },
  { value: "personal_note", label: "個人メモ" },
  { value: "avoid", label: "避けること" },
  { value: "style_preference", label: "文体・スタイル" },
];

function memoryNoteCategoryLabel(category: MemoryNoteCategory): string {
  return MEMORY_NOTE_CATEGORIES.find((item) => item.value === category)?.label ?? category;
}

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
  const [noteInput, setNoteInput] = useState("");
  const [noteCategory, setNoteCategory] = useState<MemoryNoteCategory>("personal_note");
  const [notePinned, setNotePinned] = useState(false);
  const [noteIncludeInPrompt, setNoteIncludeInPrompt] = useState(true);
  const [noteSaved, setNoteSaved] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState<MemoryNoteCategory>("personal_note");
  const [editPinned, setEditPinned] = useState(false);
  const [editIncludeInPrompt, setEditIncludeInPrompt] = useState(true);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    invoke<string>("get_app_version").then(setAppVersion).catch(() => setAppVersion("?"));
  }, []);

  const refresh = useCallback(() => {
    setData(loadPageData());
    setLastRetentionResult(null);
    setExportStatus(null);
    setImportStatus(null);
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

  const handleSaveNote = useCallback(() => {
    if (!noteInput.trim()) return;
    saveMemoryNote(noteInput.trim(), {
      category: noteCategory,
      pinned: notePinned,
      includeInPrompt: noteIncludeInPrompt,
    });
    setNoteInput("");
    setNotePinned(false);
    setNoteIncludeInPrompt(true);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
    refresh();
  }, [noteCategory, noteIncludeInPrompt, noteInput, notePinned, refresh]);

  const startEditNote = useCallback((note: SavedMemoryNote) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
    setEditCategory(note.category);
    setEditPinned(note.pinned);
    setEditIncludeInPrompt(note.includeInPrompt);
  }, []);

  const cancelEditNote = useCallback(() => {
    setEditingNoteId(null);
    setEditText("");
    setEditCategory("personal_note");
    setEditPinned(false);
    setEditIncludeInPrompt(true);
  }, []);

  const commitEditNote = useCallback(() => {
    if (!editingNoteId || !editText.trim()) return;
    updateMemoryNote(editingNoteId, {
      text: editText.trim(),
      category: editCategory,
      pinned: editPinned,
      includeInPrompt: editIncludeInPrompt,
    });
    cancelEditNote();
    refresh();
  }, [cancelEditNote, editCategory, editIncludeInPrompt, editPinned, editText, editingNoteId, refresh]);

  const handleImportMemoryNotes = useCallback(async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const result = importMemoryNotesFromPayload(JSON.parse(text));
      refresh();
      setImportStatus(`${result.importedCount}件の保存メモを取り込みました / skipped ${result.skippedCount}件`);
    } catch {
      setImportStatus("読み込みに失敗しました。Memory export JSONを選んでください。");
    }
  }, [refresh]);

  // フィルタ適用
  const filteredEvents = filter === "all"
    ? data.allEvents
    : data.allEvents.filter((e) => e.type === filter);

  const displayedEvents = filteredEvents.slice(0, DISPLAY_LIMIT);
  const hasMore = filteredEvents.length > DISPLAY_LIMIT;

  return (
    <div style={{ padding: "0 4px" }}>
      {/* 記録される / 記録されないもの */}
      <Section title="記録されるもの / 記録されないもの">
        <div style={{ background: "#f4f8ff", borderRadius: 8, padding: "10px 14px", fontSize: 11, lineHeight: 1.9, color: "#555" }}>
          <div><strong style={{ color: "#4a90d9" }}>記録する</strong>: 起動・クリック・発話ログ / Observation Timeline / ユーザーメモ</div>
          <div><strong style={{ color: "#e07060" }}>記録しない</strong>: 音声transcript本文 / テキスト入力本文 / ファイル名 / ウィンドウタイトル本文</div>
          <div><strong style={{ color: "#888" }}>揮発のみ</strong>: Interaction Trace / voice debug / autonomous speech debug</div>
        </div>
      </Section>

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

      {/* 記憶モード */}
      <Section title="記憶モード">
        <div style={{ background: "#f4f0ff", borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 1.8 }}>
          {[
            { v: "ephemeral" as MemoryMode,             label: "一時のみ",                  note: "起動中の揮発ストアだけ。再起動で消える" },
            { v: "timeline" as MemoryMode,              label: "タイムライン",               note: "ObservationEventを保存。発話ログも記録" },
            { v: "timeline_summary" as MemoryMode,      label: "タイムライン＋要約（推奨）", note: "タイムラインを保存し、今日の様子サマリーを生成" },
            { v: "ask_before_long_term" as MemoryMode,  label: "長期記憶は確認してから",     note: "意味のある記憶を候補に出す。承認したものだけ保存" },
          ].map((opt) => (
            <div key={opt.v} onClick={() => updateSettings({ memoryMode: opt.v })} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "6px 0", borderBottom: "1px solid #ede8ff", cursor: "pointer",
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: "50%", border: "2px solid #a890f0",
                background: settings.memoryMode === opt.v ? "#a890f0" : "transparent",
                flexShrink: 0, marginTop: 2,
              }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: settings.memoryMode === opt.v ? 600 : 400 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "#999" }}>{opt.note}</div>
              </div>
            </div>
          ))}
        </div>
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
            インポートはユーザー保存メモだけを取り込み、発話ログや観測ログは取り込みません。
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <label style={{
              fontSize: 12, padding: "5px 14px", border: "1px solid #bfe0c8",
              borderRadius: 6, background: "white", color: "#2f7b4f", cursor: "pointer",
            }}>
              保存メモだけ読み込む
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  void handleImportMemoryNotes(e.currentTarget.files?.[0] ?? null);
                  e.currentTarget.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>
            {importStatus && <span style={{ fontSize: 11, color: "#888" }}>{importStatus}</span>}
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

      {/* 長期記憶候補 */}
      <Section title="長期記憶候補">
        <div style={{ background: "#f7fff8", borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 1.8 }}>
          <p style={{ color: "#666", margin: "0 0 8px" }}>
            「覚えておいてほしいこと」を手動で記録できます。raw transcriptやファイル名は自動的には入りません。
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <select
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value as MemoryNoteCategory)}
              style={{ padding: "5px 8px", fontSize: 12, border: "1px solid #c8e0c8", borderRadius: 5 }}
            >
              {MEMORY_NOTE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#666" }}>
              <input type="checkbox" checked={notePinned} onChange={(e) => setNotePinned(e.target.checked)} />
              固定
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#666" }}>
              <input type="checkbox" checked={noteIncludeInPrompt} onChange={(e) => setNoteIncludeInPrompt(e.target.checked)} />
              発話に使う
            </label>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              value={noteInput}
              placeholder="例: 音楽制作が好き"
              onChange={(e) => { setNoteInput(e.target.value); setNoteSaved(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && noteInput.trim()) {
                  handleSaveNote();
                }
              }}
              style={{ flex: 1, padding: "5px 8px", fontSize: 12, border: "1px solid #c8e0c8", borderRadius: 5 }}
            />
            <button
              onClick={handleSaveNote}
              disabled={!noteInput.trim()}
              style={{ fontSize: 12, padding: "5px 12px", border: "1px solid #b0d4b8", borderRadius: 5, background: "white", color: "#2f7b4f", cursor: "pointer" }}
            >
              保存
            </button>
          </div>
          {noteSaved && <div style={{ fontSize: 11, color: "#4caf7d", marginTop: 4 }}>記憶に保存しました</div>}
          <div style={{ fontSize: 11, color: "#999", marginTop: 6 }}>
            Memory exportにも含まれます。OpenAIへ送るにはAI設定の「保存メモを送る」も別途ONが必要です。
          </div>
        </div>

        {/* 保存済みメモ一覧 */}
        {(() => {
          const notes = getSavedMemoryNotes();
          const promptNotes = getPromptMemoryNotes();
          if (notes.length === 0) return (
            <div style={{ fontSize: 11, color: "#bbb", padding: "6px 0 2px" }}>保存済みメモはありません</div>
          );
          return (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                保存済み: {notes.length}件 / 発話に使う候補: {promptNotes.length}件
              </div>
              {notes.map((note) => (
                <div key={note.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "5px 0", borderBottom: "1px solid #e8f5e9", fontSize: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    {editingNoteId === note.id ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          style={{ padding: "5px 8px", fontSize: 12, border: "1px solid #c8e0c8", borderRadius: 5 }}
                        />
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as MemoryNoteCategory)}
                            style={{ padding: "4px 8px", fontSize: 11, border: "1px solid #c8e0c8", borderRadius: 5 }}
                          >
                            {MEMORY_NOTE_CATEGORIES.map((category) => (
                              <option key={category.value} value={category.value}>{category.label}</option>
                            ))}
                          </select>
                          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#666" }}>
                            <input type="checkbox" checked={editPinned} onChange={(e) => setEditPinned(e.target.checked)} />
                            固定
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#666" }}>
                            <input type="checkbox" checked={editIncludeInPrompt} onChange={(e) => setEditIncludeInPrompt(e.target.checked)} />
                            発話に使う
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ color: "#333" }}>{note.text}</div>
                        <div style={{ fontSize: 10, color: "#aaa" }}>
                          {memoryNoteCategoryLabel(note.category)}
                          {note.pinned ? " / 固定" : ""}
                          {note.includeInPrompt ? " / 発話に使う" : " / 発話に使わない"}
                          {" / "}{new Date(note.timestamp).toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>
                  {editingNoteId === note.id ? (
                    <>
                      <button
                        onClick={commitEditNote}
                        disabled={!editText.trim()}
                        style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #b0d4b8", borderRadius: 4, background: "white", color: "#2f7b4f", cursor: "pointer", flexShrink: 0 }}
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEditNote}
                        style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #ddd", borderRadius: 4, background: "white", color: "#777", cursor: "pointer", flexShrink: 0 }}
                      >
                        やめる
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditNote(note)}
                        style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #ddd", borderRadius: 4, background: "white", color: "#286aa5", cursor: "pointer", flexShrink: 0 }}
                      >
                        編集
                      </button>
                      <button
                        onClick={() => {
                          if (!window.confirm("このメモを削除しますか？")) return;
                          deleteEventById(note.id);
                          refresh();
                        }}
                        style={{
                          fontSize: 11, padding: "2px 8px", border: "1px solid #ddd",
                          borderRadius: 4, background: "white", color: "#c06040", cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        削除
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
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
