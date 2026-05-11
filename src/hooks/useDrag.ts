// ウィンドウドラッグフック
// mousedown 後に一定量動いた場合のみ startDragging() を呼ぶ。
// 動かずに離した場合は通常の click イベントとして処理される。

import { useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface UseDragReturn {
  onDragStart: (e: React.MouseEvent) => void;
}

const DRAG_THRESHOLD_PX = 5;

export function useDrag(): UseDragReturn {
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;

    const onMouseMove = (me: MouseEvent) => {
      if (dragging) return;
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        dragging = true;
        cleanup();
        void getCurrentWindow().startDragging();
      }
    };

    const onMouseUp = () => cleanup();

    const cleanup = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  return { onDragStart };
}
