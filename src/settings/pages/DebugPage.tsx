// デバッグ設定ページ

import { useEffect, useState } from "react";
import { useSettings } from "../store";
import { getInteractionTraces, subscribeInteractionTrace } from "../../systems/debug/interactionTraceStore";
import type { InteractionTraceEntry } from "../../systems/debug/interactionTraceStore";

function Toggle({
  label, note, checked, onChange,
}: { label: string; note?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{note}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
          background: checked ? "#a890f0" : "#ddd", flexShrink: 0, marginLeft: 12, marginTop: 2,
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

function SectionHead({ title }: { title: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4, marginBottom: 4 }}>{title}</div>;
}

export function DebugPage() {
  const [s, update] = useSettings();
  const [traces, setTraces] = useState<InteractionTraceEntry[]>(getInteractionTraces());

  useEffect(() => subscribeInteractionTrace(() => setTraces([...getInteractionTraces()])), []);

  return (
    <div>
      <SectionHead title="QA" />
      <Toggle
        label="デバッグモード"
        note="レイアウト枠・座標・状態を本体ウィンドウ上に表示します。通常利用ではOFF推奨。"
        checked={s.debugModeEnabled}
        onChange={(v) => update({ debugModeEnabled: v })}
      />
      <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.7, color: "#777" }}>
        ONにすると、companion window内で viewport / character / speech / update badge の矩形と状態を確認できます。
        speech表示時にキャラが見切れる場合は、この表示をONにした状態でスクリーンショットを確認します。
      </div>

      <SectionHead title="現在有効な設定値" />
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8, color: "#666", background: "#fafafa", border: "1px solid #eee", borderRadius: 6, padding: 10 }}>
        <div>autonomousMovementEnabled: {String(s.autonomousMovementEnabled)}</div>
        <div>movementFrequency: {s.movementFrequency}</div>
        <div>autonomousSpeechEnabled: {String(s.autonomousSpeechEnabled)}</div>
        <div>speechInterval: {s.autonomousSpeechIntervalPreset}</div>
        <div>legacy max/hour: {s.maxAutonomousReactionsPerHour}</div>
        <div>quiet/focus/DND: {String(s.quietMode)} / {String(s.focusMode)} / {String(s.doNotDisturb)}</div>
        <div>cryEnabled / autonomousCry: {String(s.cryEnabled)} / {String(s.playCryOnAutonomousSpeech)}</div>
        <div>voiceInputEnabled: {String(s.voiceInputEnabled)}</div>
      </div>

      <SectionHead title="直近の発話トレース" />
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.7, color: "#666" }}>
        {traces.length === 0 ? (
          <div style={{ color: "#999" }}>まだトレースはありません。</div>
        ) : traces.slice(-8).reverse().map((t) => (
          <div key={t.eventId} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <div><strong>{new Date(t.timestamp).toLocaleTimeString()}</strong> {t.trigger} / {t.responseSource ?? t.source ?? "-"}</div>
            <div>session: {t.voiceSessionId ?? "-"} / intent: {t.intent ?? "-"} / priority: {t.speechPriority ?? "-"}</div>
            <div>input: {t.normalizedTranscriptPreview ?? t.textInputPreview ?? t.rawTranscriptPreview ?? "-"}</div>
            <div>response: {t.selectedResponse ?? "-"}</div>
            <div>fallback: {t.fallbackReason ?? "-"} / dropped: {t.dropped ? "yes" : "no"} / suppressed: {t.suppressed ? "yes" : "no"}</div>
            <div style={{ color: "#999" }}>activity: {t.observationSummary ?? "-"} / app: {t.activeAppCategory ?? "-"} / proc: {t.activeProcessName ?? "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
