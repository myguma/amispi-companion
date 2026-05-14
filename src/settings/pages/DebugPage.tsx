// デバッグ設定ページ

import { useEffect, useState } from "react";
import { useSettings } from "../store";
import { getInteractionTraces, subscribeInteractionTrace } from "../../systems/debug/interactionTraceStore";
import type { InteractionTraceEntry } from "../../systems/debug/interactionTraceStore";
import { getAutonomousSpeechDebug, subscribeAutonomousSpeechDebug } from "../../systems/debug/autonomousSpeechDebugStore";
import type { AutonomousSpeechDebugState } from "../../systems/debug/autonomousSpeechDebugStore";
import { getCurrentSignals, subscribeCurrentSignals } from "../../systems/observation/currentSignalStore";
import type { ObservationSignal } from "../../systems/observation/observationSignals";
import { getObservationTimeline } from "../../systems/observation/observationTimelineStore";

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

function fmtTime(ts: number | null): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleTimeString();
}

function fmtMs(ms: number | null): string {
  if (!ms) return "-";
  if (ms >= 60_000) return `${Math.round(ms / 60_000)}分`;
  return `${Math.round(ms / 1000)}秒`;
}

export function DebugPage() {
  const [s, update] = useSettings();
  const [traces, setTraces] = useState<InteractionTraceEntry[]>(getInteractionTraces());
  const [autoDebug, setAutoDebug] = useState<AutonomousSpeechDebugState>(getAutonomousSpeechDebug());
  const [signals, setSignals] = useState<ObservationSignal[]>(getCurrentSignals);
  const [timelineCount, setTimelineCount] = useState(() => getObservationTimeline().length);

  useEffect(() => subscribeInteractionTrace(() => setTraces([...getInteractionTraces()])), []);
  useEffect(() => subscribeAutonomousSpeechDebug(() => setAutoDebug({ ...getAutonomousSpeechDebug() })), []);
  useEffect(() => subscribeCurrentSignals(() => setSignals([...getCurrentSignals()])), []);
  useEffect(() => {
    const timer = setInterval(() => setTimelineCount(getObservationTimeline().length), 5000);
    return () => clearInterval(timer);
  }, []);

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
      </div>

      <SectionHead title="現在設定スナップショット" />
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8, color: "#666", background: "#fafafa", border: "1px solid #eee", borderRadius: 6, padding: 10 }}>
        <div>observationLevel: {s.observationLevel}</div>
        <div>memoryMode: {s.memoryMode}</div>
        <div>autonomousSpeechEnabled: {String(s.autonomousSpeechEnabled)}</div>
        <div>speechInterval: {s.autonomousSpeechIntervalPreset}</div>
        <div>safetyCapEnabled: {String(s.autonomousSpeechSafetyCapEnabled)}</div>
        <div>sleepSpeechEnabled: {String(s.sleepSpeechEnabled)} / {s.sleepSpeechIntervalPreset}</div>
        <div>quiet/focus/DND: {String(s.quietMode)} / {String(s.focusMode)} / {String(s.doNotDisturb)}</div>
        <div>filenameSignalsEnabled: {String(s.filenameSignalsEnabled)}</div>
        <div>folderMetadataEnabled: {String(s.permissions.folderMetadataEnabled)}</div>
        <div>autonomousMovementEnabled: {String(s.autonomousMovementEnabled)}</div>
        <div>voiceInputEnabled: {String(s.voiceInputEnabled)}</div>
        <div>cryEnabled / autonomousCry: {String(s.cryEnabled)} / {String(s.playCryOnAutonomousSpeech)}</div>
      </div>

      <SectionHead title="現在のObservationSignals" />
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8, color: "#666", background: "#fafafa", border: "1px solid #eee", borderRadius: 6, padding: 10 }}>
        {signals.length === 0 ? (
          <div style={{ color: "#bbb" }}>シグナルなし (コンパニオンWindow起動後に表示)</div>
        ) : signals.map((sig) => (
          <div key={sig.kind}>
            <strong>{sig.kind}</strong>: {sig.summary} ({Math.round(sig.strength * 100)}%)
          </div>
        ))}
        {signals.length > 0 && (() => {
          const top = signals.reduce((a, b) => b.strength > a.strength ? b : a);
          return <div style={{ color: "#7a50d0", marginTop: 4 }}>topSignal: {top.kind} — {top.summary}</div>;
        })()}
      </div>

      <SectionHead title="Observation Timeline" />
      <div style={{ fontSize: 11, color: "#666", background: "#fafafa", border: "1px solid #eee", borderRadius: 6, padding: 10, marginTop: 8 }}>
        <div>記録件数: {timelineCount}件</div>
        {getObservationTimeline().slice(-5).reverse().map((e) => (
          <div key={e.id} style={{ paddingTop: 3, color: "#888" }}>
            {new Date(e.timestamp).toLocaleTimeString()} — {e.type}: {e.summary}
          </div>
        ))}
      </div>

      <SectionHead title="自律発話スケジューリング状態" />
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8, color: "#666", background: "#fafafa", border: "1px solid #eee", borderRadius: 6, padding: 10 }}>
        <div>enabled: {String(autoDebug.autonomousSpeechEnabled)}</div>
        <div>interval: {autoDebug.autonomousSpeechIntervalPreset} / safetyCap: {String(autoDebug.safetyCapEnabled)}</div>
        <div>suppressionReason: {autoDebug.suppressionReason ?? "-"}</div>
        <div>lastSpoke: {fmtTime(autoDebug.lastAutonomousSpeechAt)}</div>
        <div>nextScheduled: {fmtTime(autoDebug.nextAutonomousSpeechAt)}</div>
        <div>delay: {fmtMs(autoDebug.autonomousSpeechDelayMs)}</div>
        <div>reactionCountInLastHour: {autoDebug.reactionCountInLastHour}</div>
      </div>

      <SectionHead title="sleep発話" />
      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.8, padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
        <div><strong>enabled:</strong> {autoDebug.sleepSpeechEnabled ? "yes" : "no"}</div>
        <div><strong>preset:</strong> {autoDebug.sleepSpeechIntervalPreset ?? "-"}</div>
        <div><strong>next:</strong> {fmtTime(autoDebug.nextSleepSpeechAt)}</div>
        <div><strong>lastSpoke:</strong> {fmtTime(autoDebug.lastSleepSpeechAt)}</div>
        <div><strong>suppression:</strong> {autoDebug.sleepSpeechSuppressionReason ?? "none"}</div>
        <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>
          ※ sleep発話はautonomousSpeechEnabled=falseでも動作します (sleepSpeechEnabled=trueなら)
        </div>
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
