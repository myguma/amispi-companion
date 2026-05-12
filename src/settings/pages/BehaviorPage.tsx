// 動作設定ページ

import { useSettings } from "../store";

function Toggle({
  label, note, checked, onChange,
}: { label: string; note?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: "#999" }}>{note}</div>}
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

function Slider({
  label, min, max, step, value, onChange, format,
}: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span style={{ fontSize: 12, color: "#888" }}>{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#a890f0" }}
      />
    </div>
  );
}

function SSelect({
  label, value, options, onChange,
}: { label: string; value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontSize: 12, border: "1px solid #ddd", borderRadius: 6, padding: "2px 8px", background: "white" }}
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16, marginBottom: 4 }}>{title}</div>;
}

export function BehaviorPage() {
  const [s, update] = useSettings();

  return (
    <div>
      <SectionHead title="モード" />
      <Toggle label="おとなしくする (Quiet Mode)" note="自律発話・鳴き声を大幅に減らす" checked={s.quietMode} onChange={(v) => update({ quietMode: v })} />
      <Toggle label="集中モード (Focus Mode)" note="提案系の発話を無効にする" checked={s.focusMode} onChange={(v) => update({ focusMode: v })} />
      <Toggle label="邪魔しない (Do Not Disturb)" note="manualCall 以外すべて無効" checked={s.doNotDisturb} onChange={(v) => update({ doNotDisturb: v })} />

      <SectionHead title="自動抑制" />
      <Toggle label="全画面中は黙る" checked={s.suppressWhenFullscreen} onChange={(v) => update({ suppressWhenFullscreen: v })} />
      <Toggle label="動画・音楽再生中は黙る" checked={s.suppressWhenMediaLikely} onChange={(v) => update({ suppressWhenMediaLikely: v })} />
      <Toggle label="ゲーム中は黙る" checked={s.suppressWhenGamingLikely} onChange={(v) => update({ suppressWhenGamingLikely: v })} />

      <SectionHead title="音声" />
      <Toggle label="鳴き声あり" checked={s.cryEnabled} onChange={(v) => update({ cryEnabled: v })} />
      <Slider label="音量" min={0} max={1} step={0.05} value={s.volume} onChange={(v) => update({ volume: v })} format={(v) => `${Math.round(v * 100)}%`} />

      <SectionHead title="発話" />
      <Toggle label="自律発話あり" note="デフォルト OFF — 有効にすると時々しゃべる" checked={s.autonomousSpeechEnabled} onChange={(v) => update({ autonomousSpeechEnabled: v })} />
      <SSelect
        label="発話頻度"
        value={s.speechFrequency}
        options={[{ v: "rare", label: "まれ (推奨)" }, { v: "low", label: "少なめ" }, { v: "normal", label: "普通" }]}
        onChange={(v) => update({ speechFrequency: v as "rare" | "low" | "normal" })}
      />
      <Slider label="1時間の最大発話回数" min={1} max={10} step={1} value={s.maxAutonomousReactionsPerHour} onChange={(v) => update({ maxAutonomousReactionsPerHour: v })} />

      <SectionHead title="移動" />
      <Toggle label="自律移動あり" checked={s.autonomousMovementEnabled} onChange={(v) => update({ autonomousMovementEnabled: v })} />
      <SSelect
        label="移動頻度"
        value={s.movementFrequency}
        options={[{ v: "low", label: "少なめ" }, { v: "normal", label: "普通" }, { v: "high", label: "多め" }]}
        onChange={(v) => update({ movementFrequency: v as "low" | "normal" | "high" })}
      />
    </div>
  );
}
