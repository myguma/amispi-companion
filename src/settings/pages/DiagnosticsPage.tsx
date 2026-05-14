// 診断ページ — Voice / Observation / Memory / 発話抑制の内部状態を確認する
import { useEffect, useState } from "react";
import { useSettings } from "../store";
import { getMemoryStats } from "../../systems/memory/memoryStore";
import { getObservationTimeline } from "../../systems/observation/observationTimelineStore";
import { getCurrentSignals, subscribeCurrentSignals } from "../../systems/observation/currentSignalStore";
import type { ObservationSignal } from "../../systems/observation/observationSignals";
import { getAutonomousSpeechDebug, subscribeAutonomousSpeechDebug } from "../../systems/debug/autonomousSpeechDebugStore";
import type { AutonomousSpeechDebugState } from "../../systems/debug/autonomousSpeechDebugStore";

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16, marginBottom: 6 }}>
      {title}
    </div>
  );
}

function CheckRow({ label, ok, note }: { label: string; ok: boolean | null; note?: string }) {
  const color = ok === null ? "#aaa" : ok ? "#4caf7d" : "#e07060";
  const icon = ok === null ? "—" : ok ? "✓" : "✗";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0", borderBottom: "1px solid #f4f4f4", fontSize: 12 }}>
      <span style={{ color, fontWeight: 700, flexShrink: 0, width: 16 }}>{icon}</span>
      <div>
        <div style={{ color: "#444" }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: "#999" }}>{note}</div>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f4f4f4", fontSize: 12 }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{ color: "#333", fontWeight: 500 }}>{value}</span>
    </div>
  );
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

export function DiagnosticsPage() {
  const [s] = useSettings();
  const memStats = getMemoryStats();
  const [timelineCount, setTimelineCount] = useState(() => getObservationTimeline().length);
  const [signals, setSignals] = useState<ObservationSignal[]>(getCurrentSignals);
  const [autoDebug, setAutoDebug] = useState<AutonomousSpeechDebugState>(getAutonomousSpeechDebug);

  useEffect(() => {
    const unsub = subscribeCurrentSignals(() => setSignals([...getCurrentSignals()]));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeAutonomousSpeechDebug(() => setAutoDebug({ ...getAutonomousSpeechDebug() }));
    return unsub;
  }, []);

  // Timeline count は他windowで更新されるためポーリング
  useEffect(() => {
    const timer = setInterval(() => setTimelineCount(getObservationTimeline().length), 5000);
    return () => clearInterval(timer);
  }, []);

  const ffmpegOk = s.ffmpegExecutablePath.trim().length > 0;
  const voiceEnabled = s.voiceInputEnabled;
  const topSig = signals.length > 0
    ? signals.reduce((a, b) => b.strength > a.strength ? b : a)
    : null;

  // 現在の発話抑制理由を推定（設定ベース）
  const suppressReasons: string[] = [];
  if (!s.autonomousSpeechEnabled) suppressReasons.push("自律発話 OFF");
  if (s.quietMode) suppressReasons.push("Quiet Mode");
  if (s.doNotDisturb) suppressReasons.push("Do Not Disturb");
  if (s.focusMode) suppressReasons.push("Focus Mode");
  if (s.suppressWhenFullscreen) suppressReasons.push("全画面抑制 (条件次第)");
  if (s.autonomousSpeechSafetyCapEnabled) suppressReasons.push("安全キャップ ON (旧式)");
  if (autoDebug.suppressionReason && autoDebug.suppressionReason !== "allowed") {
    suppressReasons.push(`実行時: ${autoDebug.suppressionReason}`);
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: "#666", lineHeight: 1.7, marginBottom: 4 }}>
        セットアップの状態を確認します。赤は設定が必要な項目です。
      </p>

      <SectionHead title="音声 (Voice)" />
      <CheckRow label="音声入力" ok={voiceEnabled} note={voiceEnabled ? "Push-to-talk 有効" : "無効 — VoicePageで有効化できます"} />
      <CheckRow label="STTエンジン" ok={s.sttEngine === "whisperCli"} note={s.sttEngine === "mock" ? "Mockモード（テスト用）" : "Whisper CLI"} />
      {s.sttEngine === "whisperCli" && (
        <>
          <CheckRow label="Whisper executable" ok={s.whisperExecutablePath.trim().length > 0} note={s.whisperExecutablePath || "未設定 — VoicePageで設定してください"} />
          <CheckRow label="Whisper model" ok={s.whisperModelPath.trim().length > 0} note={s.whisperModelPath || "未設定"} />
          <CheckRow label="FFmpeg" ok={ffmpegOk} note={s.ffmpegExecutablePath || "未設定 — 音声変換に必要"} />
          <CheckRow label="STT言語" ok={true} note={`${s.whisperLanguage}${s.whisperLanguage === "custom" ? ` (${s.whisperCustomLanguage})` : ""}`} />
        </>
      )}

      <SectionHead title="観察 (Observation)" />
      <InfoRow label="観察レベル" value={s.observationLevel} />
      <InfoRow label="フォルダメタデータ" value={s.permissions.folderMetadataEnabled ? "ON" : "OFF"} />
      <InfoRow label="Filename signals" value={s.filenameSignalsEnabled ? "ON" : "OFF"} />
      <InfoRow label="Observation Timeline" value={`${timelineCount}件記録済み`} />
      {signals.length > 0 ? (
        <div style={{ padding: "4px 0 2px" }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>現在のシグナル ({signals.length}件):</div>
          {signals.slice(0, 4).map((sig) => (
            <div key={sig.kind} style={{ fontSize: 11, color: "#555", paddingLeft: 8, lineHeight: 1.7 }}>
              {sig.summary} <span style={{ color: "#bbb" }}>({Math.round(sig.strength * 100)}%)</span>
            </div>
          ))}
          {topSig && (
            <div style={{ fontSize: 11, color: "#7a50d0", paddingLeft: 8 }}>topSignal: {topSig.kind} — {topSig.summary}</div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#bbb", padding: "3px 0" }}>シグナルなし (コンパニオンWindow起動後に表示)</div>
      )}

      <SectionHead title="記憶 (Memory)" />
      <InfoRow label="Memory Mode" value={s.memoryMode} />
      <InfoRow label="記録件数" value={`${memStats.totalEvents}件`} />
      <InfoRow label="保持期間" value={s.memoryRetentionDays === 0 ? "無期限" : `${s.memoryRetentionDays}日`} />
      <InfoRow label="保存メモ" value={`${memStats.noteCount}件`} />

      <SectionHead title="自律発話 (Autonomous Speech)" />
      <CheckRow label="自律発話" ok={s.autonomousSpeechEnabled} note={s.autonomousSpeechEnabled ? `間隔: ${s.autonomousSpeechIntervalPreset}` : "無効 — Watchful Modeで自動ON"} />
      <CheckRow label="Sleep発話" ok={s.sleepSpeechEnabled} note={`プリセット: ${s.sleepSpeechIntervalPreset} / autonomousSpeechと独立して動作`} />
      <CheckRow label="AI エンジン" ok={s.aiEngine !== "none"} note={s.aiEngine === "none" ? "なし (rule-based fallback)" : `${s.aiEngine} / ${s.ollamaModel}`} />
      <InfoRow label="Quiet Mode" value={s.quietMode ? "ON (抑制中)" : "OFF"} />
      <InfoRow label="Do Not Disturb" value={s.doNotDisturb ? "ON (抑制中)" : "OFF"} />
      <InfoRow label="次回発話予定" value={fmtTime(autoDebug.nextAutonomousSpeechAt)} />
      <InfoRow label="前回発話" value={fmtTime(autoDebug.lastAutonomousSpeechAt)} />
      <InfoRow label="次回sleep発話" value={fmtTime(autoDebug.nextSleepSpeechAt)} />
      {suppressReasons.length > 0 && (
        <div style={{ padding: "4px 0 2px" }}>
          <div style={{ fontSize: 11, color: "#c06040", marginBottom: 2 }}>発話抑制中の理由:</div>
          {suppressReasons.map((r) => (
            <div key={r} style={{ fontSize: 11, color: "#c08060", paddingLeft: 8 }}>• {r}</div>
          ))}
        </div>
      )}
      <InfoRow label="抑制理由 (実行時)" value={autoDebug.suppressionReason ?? "なし"} />
      <InfoRow label="次回まで" value={fmtMs(autoDebug.autonomousSpeechDelayMs)} />

      <SectionHead title="プライバシー境界" />
      <div style={{ marginTop: 8, padding: "10px 12px", background: "#f5f0ff", borderRadius: 8, fontSize: 11, color: "#6a40d0", lineHeight: 1.8 }}>
        <strong>このアプリは完全ローカルです</strong><br />
        ✗ クラウドAI / クラウドSTT: 未接続<br />
        ✗ 常時マイク監視: なし<br />
        ✗ Screen Capture / OCR: なし<br />
        ✗ raw filename 保存: なし<br />
        ✗ transcript 永続保存: なし<br />
        ✗ window title 本文保存: なし<br />
        ✗ 外部APIへの送信: なし
      </div>
    </div>
  );
}
