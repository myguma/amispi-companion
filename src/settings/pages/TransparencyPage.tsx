// 無明が見ているもの — 透明性ページ
// ユーザーが「何を観測されているか」を一目で把握できるようにする

import { useSettings } from "../store";
import type { PermissionSettings } from "../../privacy/permissions";

const YES = "✓";
const NO = "×";

function Row({ icon, label, note }: { icon: string; label: string; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0" }}>
      <span style={{ fontSize: 14, width: 20, flexShrink: 0, color: icon === YES ? "#4caf7d" : icon === NO ? "#999" : "#f0a030" }}>{icon}</span>
      <div>
        <span style={{ fontSize: 13 }}>{label}</span>
        {note && <span style={{ fontSize: 11, color: "#999", display: "block" }}>{note}</span>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export function TransparencyPage() {
  const [settings, update] = useSettings();
  const p = settings.permissions;

  const toggle = (key: keyof PermissionSettings, val: boolean) => {
    update({ permissions: { ...p, [key]: val } });
  };

  return (
    <div style={{ padding: "0 4px" }}>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
        無明はPCの中だけで動作します。観測した情報は外部に送信されません。
      </p>

      <Section title="無明が気づけること">
        <Row icon={YES} label="現在時刻" note="朝/昼/夕/深夜の挨拶に使う" />
        <Row icon={p.level >= 1 ? YES : NO} label="入力がしばらくないこと (idle)" note="全画面や sleep の判定に使う" />
        <Row icon={p.level >= 1 ? YES : NO} label="アクティブなアプリの種類" note="browser / ide / media など — タイトルは見ない" />
        <Row icon={p.level >= 1 ? YES : NO} label="全画面アプリ中かどうか" note="全画面中は黙る" />
        <Row icon={p.level >= 1 ? YES : NO} label="音楽・動画アプリが起動中か" note="Spotify等が起動中かどうかのみ — 再生内容は取得しない" />
        <Row icon={p.level >= 1 && p.folderMetadataEnabled ? YES : NO} label="Desktop のファイル数" note="増えすぎたら一言" />
        <Row icon={p.level >= 1 && p.folderMetadataEnabled ? YES : NO} label="Downloads のファイル数" note="増えすぎたら一言" />
      </Section>

      <Section title="許可すると見えるもの">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
          <input
            type="checkbox"
            id="title_perm"
            checked={p.windowTitleEnabled}
            onChange={(e) => toggle("windowTitleEnabled", e.target.checked)}
            style={{ width: 16, height: 16, flexShrink: 0 }}
          />
          <label htmlFor="title_perm" style={{ cursor: "pointer" }}>
            <span style={{ fontSize: 13 }}>アクティブウィンドウのタイトル</span>
            <span style={{ fontSize: 11, color: "#999", display: "block" }}>ウィンドウタイトルのみ。ファイル内容・URLは取得しない</span>
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
          <input type="checkbox" id="fn_perm" checked={false} disabled style={{ width: 16, height: 16, flexShrink: 0 }} />
          <label htmlFor="fn_perm" style={{ color: "#bbb", cursor: "not-allowed" }}>
            <span style={{ fontSize: 13 }}>ファイル名 (将来実装予定)</span>
          </label>
        </div>
      </Section>

      <Section title="見ていないもの">
        <Row icon={NO} label="ファイルの中身" />
        <Row icon={NO} label="画像・PDF・動画の内容" />
        <Row icon={NO} label="メール・メッセージ本文" />
        <Row icon={NO} label="ブラウザ閲覧履歴" />
        <Row icon={NO} label="パスワード・秘密情報" />
        <Row icon={NO} label="クリップボードの内容" />
        <Row icon={NO} label="キーボード入力の内容" />
        <Row icon={NO} label="画面の常時OCR" />
      </Section>

      <Section title="外部送信">
        <Row icon={NO} label={`クラウドAI送信: ${p.cloudAllowed ? "ON" : "OFF (デフォルト)"}`} note="外部送信は常に手動で許可が必要" />
        <Row icon={NO} label="ファイル削除・移動・リネーム: なし" />
        <Row icon={NO} label="コマンド実行: なし" />
        <Row icon={NO} label="メール・SNS送信: なし" />
      </Section>

      <div style={{ fontSize: 11, color: "#aaa", borderTop: "1px solid #eee", paddingTop: 12, lineHeight: 1.7 }}>
        この情報はPCの外に出ません。<br />
        アプリを終了するといつでも観測が止まります。
      </div>
    </div>
  );
}
