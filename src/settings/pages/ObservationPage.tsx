// 観察センターページ — 何を見ているか、最近何を検知したか
import { useEffect, useState } from "react";
import { useSettings } from "../store";
import { getObservationTimeline, subscribeObservationTimeline, clearObservationTimeline } from "../../systems/observation/observationTimelineStore";
import type { ObservationEvent } from "../../systems/observation/observationTimelineStore";

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16, marginBottom: 4 }}>
      {title}
    </div>
  );
}

function Toggle({ label, note, checked, onChange }: {
  label: string; note?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: "#999" }}>{note}</div>}
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: checked ? "#a890f0" : "#ddd", flexShrink: 0, marginLeft: 12, marginTop: 2,
        position: "relative", transition: "background 0.2s",
      }} aria-pressed={checked}>
        <span style={{
          position: "absolute", top: 3, left: checked ? 22 : 3, width: 18, height: 18,
          borderRadius: "50%", background: "white", transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

type ObservationLevel = "minimal" | "balanced" | "watchful" | "custom";
const LEVEL_OPTIONS: { v: ObservationLevel; label: string; note: string }[] = [
  { v: "minimal",  label: "最小",   note: "アプリ種別とアイドルのみ" },
  { v: "balanced", label: "バランス（推奨）", note: "フォルダメタデータ + filename signals" },
  { v: "watchful", label: "観察モード", note: "より詳しく見る。ウィンドウタイトルはオプション" },
  { v: "custom",   label: "カスタム", note: "個別にON/OFFする" },
];

function typeLabel(t: ObservationEvent["type"]): string {
  const map: Record<ObservationEvent["type"], string> = {
    active_app_changed: "アプリ切替",
    idle_started: "アイドル開始",
    user_returned: "操作再開",
    media_started: "メディア開始",
    media_stopped: "メディア停止",
    folder_signal_changed: "フォルダ変化",
    companion_reacted: "発話",
    setting_changed: "設定変更",
    sleep_entered: "スリープ",
    update_available: "更新あり",
  };
  return map[t] ?? t;
}

export function ObservationPage() {
  const [s, update] = useSettings();
  const [timeline, setTimeline] = useState<ObservationEvent[]>(getObservationTimeline());

  useEffect(() => subscribeObservationTimeline(() => setTimeline([...getObservationTimeline()])), []);

  const observationLevel: ObservationLevel = s.observationLevel ?? "balanced";
  const updateLevel = (level: ObservationLevel) => {
    const patch: Record<string, unknown> = { observationLevel: level };
    if (level === "minimal") {
      patch.filenameSignalsEnabled = false;
      Object.assign(patch, { permissions: { ...s.permissions, folderMetadataEnabled: false, windowTitleEnabled: false } });
    } else if (level === "balanced") {
      patch.filenameSignalsEnabled = true;
      Object.assign(patch, { permissions: { ...s.permissions, folderMetadataEnabled: true, windowTitleEnabled: false } });
    } else if (level === "watchful") {
      patch.filenameSignalsEnabled = true;
      Object.assign(patch, { permissions: { ...s.permissions, folderMetadataEnabled: true } });
    }
    update(patch as any);
  };

  const recentEvents = timeline.slice(-30).reverse();

  return (
    <div>
      <SectionHead title="観察レベル" />
      {LEVEL_OPTIONS.map((opt) => (
        <div key={opt.v} onClick={() => updateLevel(opt.v)} style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "8px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer",
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: "50%", border: "2px solid #a890f0",
            background: observationLevel === opt.v ? "#a890f0" : "transparent",
            flexShrink: 0, marginTop: 1,
          }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: observationLevel === opt.v ? 600 : 400 }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: "#999" }}>{opt.note}</div>
          </div>
        </div>
      ))}

      <SectionHead title="現在見ているもの" />
      <div style={{ fontSize: 12, color: "#555", lineHeight: 2, padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
        <div>アプリ種別: <strong>ON</strong></div>
        <div>アイドル時間: <strong>ON</strong></div>
        <div>フォルダメタデータ: <strong>{s.permissions.folderMetadataEnabled ? "ON" : "OFF"}</strong></div>
        <div>Filename signals: <strong>{s.filenameSignalsEnabled ? "ON" : "OFF"}</strong></div>
        <div>ウィンドウタイトル: <strong>{s.permissions.windowTitleEnabled ? "ON" : "OFF"}</strong></div>
        <div>メディア推定: <strong>ON</strong></div>
        <div>常時マイク: <strong style={{ color: "#999" }}>OFF (push-to-talk のみ)</strong></div>
        <div>スクリーン録画/OCR: <strong style={{ color: "#999" }}>OFF</strong></div>
        <div>クラウド送信: <strong style={{ color: "#999" }}>OFF</strong></div>
      </div>

      {s.permissions.level >= 1 && observationLevel === "watchful" && (
        <div style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
          <Toggle
            label="ウィンドウタイトルを含める"
            note="タイトルはローカル処理のみ。クラウド送信なし"
            checked={s.permissions.windowTitleEnabled}
            onChange={(v) => update({ permissions: { ...s.permissions, windowTitleEnabled: v } })}
          />
        </div>
      )}

      <SectionHead title="最近検知したこと" />
      <div style={{ fontSize: 11, color: "#666", lineHeight: 1.7, padding: "4px 0" }}>
        {recentEvents.length === 0 ? (
          <div style={{ color: "#bbb", padding: "8px 0" }}>まだ記録はありません</div>
        ) : recentEvents.map((e) => (
          <div key={e.id} style={{ padding: "5px 0", borderBottom: "1px dashed #eee" }}>
            <span style={{ color: "#aaa", marginRight: 6 }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
            <strong>{typeLabel(e.type)}</strong>
            <span style={{ color: "#888", marginLeft: 6 }}>{e.summary}</span>
          </div>
        ))}
      </div>

      {timeline.length > 0 && (
        <div style={{ padding: "12px 0" }}>
          <button
            onClick={() => { if (confirm("Observation Timelineをクリアしますか？")) clearObservationTimeline(); }}
            style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", color: "#888" }}
          >
            タイムラインをクリア
          </button>
        </div>
      )}

      <div style={{ marginTop: 16, padding: "10px 12px", background: "#f5f0ff", borderRadius: 8, fontSize: 11, color: "#6a40d0", lineHeight: 1.7 }}>
        <strong>Observation Timelineについて</strong><br />
        ・記録するのは「何が起きたか」の構造化イベントのみ<br />
        ・ウィンドウタイトル本文・ファイル名・入力内容は保存しません<br />
        ・クラウドに送信しません<br />
        ・Memory exportとは別管理（設定でexportも可）<br />
        ・保持期間はメモリ設定の「記録保持日数」に従います
      </div>
    </div>
  );
}
