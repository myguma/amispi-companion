// アップデーターフック
// 起動後しばらくしてサイレントに更新チェックを行う
// UIはキャラクターの世界観に合わせて UpdateBadge が担当する

import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface UpdateInfo {
  version: string;
  body: string | null;
}

interface UseUpdaterReturn {
  updateAvailable: UpdateInfo | null;
  installing: boolean;
  installUpdate: () => void;
}

// Tauri 環境かどうか判定
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** アップデート確認の遅延時間 (起動後すぐに確認すると重いため遅らせる) */
const CHECK_DELAY_MS = 8000;

export function useUpdater(): UseUpdaterReturn {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);

  // 起動後 CHECK_DELAY_MS 後にサイレントでアップデートを確認
  useEffect(() => {
    if (!isTauri) return;

    const timer = setTimeout(async () => {
      try {
        const info = await invoke<UpdateInfo | null>("check_for_updates");
        if (info) setUpdateAvailable(info);
      } catch {
        // ネットワーク不可・設定未完了など — サイレントに無視
      }
    }, CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const installUpdate = useCallback(() => {
    if (!isTauri || installing) return;
    setInstalling(true);

    invoke("install_update").catch((err: unknown) => {
      setInstalling(false);
      // eslint-disable-next-line no-alert
      alert(`Update failed: ${String(err)}`);
    });
    // 成功時は app.restart() が呼ばれるためここには戻ってこない
  }, [installing]);

  return { updateAvailable, installing, installUpdate };
}
