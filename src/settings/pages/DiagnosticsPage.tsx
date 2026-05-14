// 診断ページ — Voice / Observation / Memory の設定状態を確認する
import { useSettings } from "../store";
import { getMemoryStats } from "../../systems/memory/memoryStore";
import { getObservationTimeline } from "../../systems/observation/observationTimelineStore";

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

export function DiagnosticsPage() {
  const [s] = useSettings();
  const memStats = getMemoryStats();
  const timelineCount = getObservationTimeline().length;

  const ffmpegOk = s.ffmpegExecutablePath.trim().length > 0;
  const voiceEnabled = s.voiceInputEnabled;

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
      <CheckRow label="観察レベル" ok={true} note={s.observationLevel} />
      <CheckRow label="フォルダメタデータ" ok={s.permissions.folderMetadataEnabled} note={s.permissions.folderMetadataEnabled ? "Downloads / Desktop をスキャン" : "無効"} />
      <CheckRow label="Filename signals" ok={s.filenameSignalsEnabled} note="インストーラー / DAW / 音声書き出しなどを検知" />
      <CheckRow label="Observation Timeline" ok={timelineCount >= 0} note={`${timelineCount}件記録済み`} />

      <SectionHead title="記憶 (Memory)" />
      <CheckRow label="Memory Mode" ok={true} note={s.memoryMode} />
      <CheckRow label="記録件数" ok={memStats.totalEvents > 0} note={`${memStats.totalEvents}件`} />
      <CheckRow label="保持期間" ok={s.memoryRetentionDays > 0 || s.memoryRetentionDays === 0} note={s.memoryRetentionDays === 0 ? "無期限" : `${s.memoryRetentionDays}日`} />

      <SectionHead title="自律発話 (Autonomous Speech)" />
      <CheckRow label="自律発話" ok={s.autonomousSpeechEnabled} note={s.autonomousSpeechEnabled ? `間隔: ${s.autonomousSpeechIntervalPreset}` : "無効"} />
      <CheckRow label="Sleep発話" ok={s.sleepSpeechEnabled} note={`プリセット: ${s.sleepSpeechIntervalPreset}`} />
      <CheckRow label="AI エンジン" ok={s.aiEngine !== "none"} note={s.aiEngine === "none" ? "なし (rule-based fallback)" : `${s.aiEngine} / ${s.ollamaModel}`} />

      <div style={{ marginTop: 16, padding: "10px 12px", background: "#f5f0ff", borderRadius: 8, fontSize: 11, color: "#6a40d0", lineHeight: 1.7 }}>
        <strong>このアプリは完全ローカルです</strong><br />
        ・クラウドAI / クラウドSTT は使いません<br />
        ・常時マイク / Screen Capture / OCR はしません<br />
        ・外部APIへの送信はしません
      </div>
    </div>
  );
}
