// 観察センターページ — 何を見ているか、最近何を検知したか
import { useEffect, useState } from "react";
import { useSettings } from "../store";
import { getObservationTimeline, subscribeObservationTimeline, clearObservationTimeline } from "../../systems/observation/observationTimelineStore";
import type { ObservationEvent } from "../../systems/observation/observationTimelineStore";
import { getCurrentSnapshot, subscribeCurrentSnapshot } from "../../systems/observation/currentSnapshotStore";
import type { AppCategory, ObservationSnapshot } from "../../observation/types";
import { APP_CATEGORY_OPTIONS, appCategoryLabel, normalizeProcessName } from "../../observation/appClassification";

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
  const [snapshot, setSnapshot] = useState<ObservationSnapshot>(getCurrentSnapshot);
  const [manualProcess, setManualProcess] = useState("");
  const [manualCategory, setManualCategory] = useState<AppCategory>("unknown");

  useEffect(() => subscribeObservationTimeline(() => setTimeline([...getObservationTimeline()])), []);
  useEffect(() => subscribeCurrentSnapshot(() => setSnapshot({ ...getCurrentSnapshot() })), []);

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
  const activeProcess = snapshot.activeApp?.processName ? normalizeProcessName(snapshot.activeApp.processName) : "";
  const currentCustom = s.customAppClassifications ?? {};
  const customEntries = Object.entries(currentCustom).sort(([a], [b]) => a.localeCompare(b));
  const sampleFolders = [
    ["Downloads", snapshot.folders.downloads?.filenameSamples ?? []] as const,
    ["Desktop", snapshot.folders.desktop?.filenameSamples ?? []] as const,
  ];
  const sampleCount = sampleFolders.reduce((sum, [, samples]) => sum + samples.length, 0);

  const saveClassification = (processName: string, category: AppCategory) => {
    const key = normalizeProcessName(processName);
    if (!key) return;
    update({ customAppClassifications: { ...currentCustom, [key]: category } });
  };

  const deleteClassification = (processName: string) => {
    const key = normalizeProcessName(processName);
    const next = { ...currentCustom };
    delete next[key];
    update({ customAppClassifications: next });
  };

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
        <div>現在の前面アプリ: <strong>{snapshot.activeApp ? `${snapshot.activeApp.processName} / ${appCategoryLabel(snapshot.activeApp.category)}` : "未取得"}</strong></div>
        <div>分類理由: <strong>{snapshot.activeApp?.classificationReason ?? "-"}</strong></div>
        <div>アイドル時間: <strong>ON</strong></div>
        <div>フォルダメタデータ: <strong>{s.permissions.folderMetadataEnabled ? "ON" : "OFF"}</strong></div>
        <div>Filename signals: <strong>{s.filenameSignalsEnabled ? "ON" : "OFF"}</strong></div>
        <div>Filename samples: <strong>{s.filenameSamplesEnabled ? "ON" : "OFF"}</strong> / visible: <strong>{sampleCount}件</strong></div>
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

      <SectionHead title="ファイル名サンプル（明示ONのみ）" />
      <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8, padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>
          Desktop / Downloads の直下から最大件数だけ揮発表示します。file contentは読みません。Memory exportとObservation Timelineには保存しません。
        </div>
        <Toggle
          label="raw filename samplesを表示"
          note="デフォルトOFF。ONにすると権限level 2 + filenames permission + folder metadataを有効化します。"
          checked={s.filenameSamplesEnabled}
          onChange={(v) => update({
            filenameSamplesEnabled: v,
            permissions: v
              ? { ...s.permissions, level: (s.permissions.level >= 2 ? s.permissions.level : 2), filenamesEnabled: true, folderMetadataEnabled: true }
              : { ...s.permissions },
          })}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 0" }}>
          <span style={{ color: "#777" }}>最大件数</span>
          <input
            type="number"
            min={1}
            max={10}
            value={s.filenameSamplesMaxCount}
            onChange={(e) => update({ filenameSamplesMaxCount: Math.max(1, Math.min(10, Number(e.target.value) || 5)) })}
            disabled={!s.filenameSamplesEnabled}
            style={{ width: 64, padding: "3px 6px", fontSize: 12, border: "1px solid #ddd", borderRadius: 4 }}
          />
          <label style={{ display: "flex", gap: 4, alignItems: "center", color: "#777", fontSize: 11 }}>
            <input
              type="checkbox"
              checked={s.filenameSamplesSendToAI}
              onChange={(e) => update({ filenameSamplesSendToAI: e.target.checked })}
              disabled={!s.filenameSamplesEnabled}
            />
            外部AI送信は別許可
          </label>
        </div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>
          v1.5.0ではraw filenameの外部AI送信は行いません。別許可の状態とpayload previewで非送信を確認できます。
        </div>
        {sampleCount === 0 ? (
          <div style={{ color: "#bbb", fontSize: 11 }}>現在表示できるfilename sampleはありません</div>
        ) : sampleFolders.map(([label, samples]) => samples.length > 0 && (
          <div key={label} style={{ marginTop: 4 }}>
            <div style={{ color: "#888", fontSize: 11 }}>{label}</div>
            {samples.map((sample) => (
              <div key={`${label}:${sample}`} style={{ color: "#555", fontSize: 11, paddingLeft: 8, overflowWrap: "anywhere" }}>
                {sample}
              </div>
            ))}
          </div>
        ))}
      </div>

      <SectionHead title="ユーザー定義アプリ分類" />
      <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8, padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>
          process名だけを保存します。ウィンドウタイトル・ファイル名・入力内容は保存しません。
        </div>
        {activeProcess && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ color: "#777" }}>{activeProcess}</span>
            <select
              value={currentCustom[activeProcess] ?? snapshot.activeApp?.category ?? "unknown"}
              onChange={(e) => saveClassification(activeProcess, e.target.value as AppCategory)}
              style={{ fontSize: 12, padding: "3px 6px", border: "1px solid #ddd", borderRadius: 4 }}
            >
              {APP_CATEGORY_OPTIONS.map((cat) => <option key={cat} value={cat}>{appCategoryLabel(cat)}</option>)}
            </select>
            {currentCustom[activeProcess] && (
              <button onClick={() => deleteClassification(activeProcess)} style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #ddd", borderRadius: 4, background: "white", color: "#888" }}>
                削除
              </button>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <input
            value={manualProcess}
            onChange={(e) => setManualProcess(e.target.value)}
            placeholder="example.exe"
            style={{ fontSize: 12, padding: "4px 6px", border: "1px solid #ddd", borderRadius: 4, minWidth: 130 }}
          />
          <select
            value={manualCategory}
            onChange={(e) => setManualCategory(e.target.value as AppCategory)}
            style={{ fontSize: 12, padding: "4px 6px", border: "1px solid #ddd", borderRadius: 4 }}
          >
            {APP_CATEGORY_OPTIONS.map((cat) => <option key={cat} value={cat}>{appCategoryLabel(cat)}</option>)}
          </select>
          <button
            onClick={() => {
              saveClassification(manualProcess, manualCategory);
              setManualProcess("");
            }}
            style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #ddd", borderRadius: 4, background: "white", color: "#666" }}
          >
            保存
          </button>
        </div>
        {customEntries.length === 0 ? (
          <div style={{ color: "#bbb", fontSize: 11 }}>保存済みのユーザー定義分類はありません</div>
        ) : customEntries.map(([processName, category]) => (
          <div key={processName} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0", borderTop: "1px dashed #eee" }}>
            <span>{processName} → <strong>{appCategoryLabel(category)}</strong></span>
            <button onClick={() => deleteClassification(processName)} style={{ fontSize: 11, border: "none", background: "transparent", color: "#c06060", cursor: "pointer" }}>
              削除
            </button>
          </div>
        ))}
      </div>

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
