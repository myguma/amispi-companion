// アップデートページ

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type UpdateInfo = {
  version: string;
  body: string | null;
};

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function SectionHead({ title }: { title: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4, marginBottom: 8 }}>{title}</div>;
}

function ActionButton({
  children, onClick, disabled,
}: { children: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 12,
        padding: "7px 14px",
        border: "1px solid #d8cef8",
        borderRadius: 6,
        background: disabled ? "#f3f0fb" : "white",
        color: disabled ? "#aaa" : "#5b35b0",
        cursor: disabled ? "default" : "pointer",
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function ErrorHint({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div style={{ marginTop: 6, color: "#8a5a5a", fontSize: 11, lineHeight: 1.6 }}>
      ネットワーク接続、GitHub Releasesへの到達、またはインストール済みアプリの署名設定を確認してください。
      companion上の通知が押せない場合も、このタブから再試行できます。
    </div>
  );
}

export function UpdatePage() {
  const [currentVersion, setCurrentVersion] = useState("…");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [status, setStatus] = useState("更新確認はまだ実行されていません");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri) {
      setCurrentVersion("dev");
      return;
    }
    invoke<string>("get_app_version").then(setCurrentVersion).catch(() => setCurrentVersion("?"));
  }, []);

  const checkUpdates = async () => {
    if (!isTauri) {
      setStatus("Tauri実行時のみ更新確認できます");
      return;
    }
    setChecking(true);
    setError(null);
    setStatus("更新を確認しています…");
    try {
      const info = await invoke<UpdateInfo | null>("check_for_updates");
      setUpdateInfo(info);
      setStatus(info ? `v${info.version} が利用できます` : "最新です");
    } catch (e) {
      setUpdateInfo(null);
      setError(e instanceof Error ? e.message : String(e));
      setStatus("更新確認に失敗しました");
    } finally {
      setChecking(false);
    }
  };

  const installUpdate = async () => {
    if (!isTauri) return;
    setInstalling(true);
    setError(null);
    setStatus("更新をインストールしています…");
    try {
      await invoke("install_update");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("インストールに失敗しました");
      setInstalling(false);
    }
  };

  return (
    <div>
      <SectionHead title="アップデート" />
      <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
        <div style={{ fontSize: 13, color: "#555" }}>
          現在のバージョン: <span style={{ fontVariantNumeric: "tabular-nums", color: "#3a2870", fontWeight: 700 }}>v{currentVersion}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionButton onClick={checkUpdates} disabled={checking || installing}>
            {checking ? "確認中…" : "更新を確認"}
          </ActionButton>
          {updateInfo && (
            <ActionButton onClick={installUpdate} disabled={checking || installing}>
              {installing ? "インストール中…" : "インストールして再起動"}
            </ActionButton>
          )}
        </div>
        <div style={{
          fontSize: 12,
          color: error ? "#c84848" : updateInfo ? "#4f42a8" : "#777",
          background: error ? "#fff0f0" : "#f8f6ff",
          border: `1px solid ${error ? "#ffd6d6" : "#ebe6ff"}`,
          borderRadius: 6,
          padding: "8px 10px",
          lineHeight: 1.6,
        }}>
          {status}
          {updateInfo && (
            <div style={{ marginTop: 4 }}>
              新バージョン: <strong>v{updateInfo.version}</strong>
            </div>
          )}
          {error && <div style={{ marginTop: 4, wordBreak: "break-word" }}>{error}</div>}
          <ErrorHint error={error} />
        </div>
        <div style={{ fontSize: 11, color: "#999", lineHeight: 1.7 }}>
          companion上の更新通知が押せない場合でも、この設定画面から更新できます。
        </div>
      </div>
    </div>
  );
}
