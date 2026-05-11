// ウィンドウドラッグフック
// Tauri の startDragging() API を使用してネイティブドラッグを実現する
// 透明ウィンドウでも動作する

import { useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface UseDragReturn {
  onDragStart: (e: React.MouseEvent) => void;
}

export function useDrag(): UseDragReturn {
  const onDragStart = useCallback((e: React.MouseEvent) => {
    // 左クリックのみドラッグ対象
    if (e.button !== 0) return;
    e.preventDefault();

    // Tauri のネイティブドラッグを開始
    // これにより OS レベルでウィンドウが移動する
    void getCurrentWindow().startDragging();
  }, []);

  return { onDragStart };
}
