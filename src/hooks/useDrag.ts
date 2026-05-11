// ウィンドウドラッグフック
// mousedown 後に一定量動いた場合のみ startDragging() を呼ぶ。
// mouseDownRef: マウスが押されている間 true — Wander に渡してドラッグ中の移動を止める。
// isDragging: 閾値を超えて実際にドラッグが始まった場合のみ true — 表情変化に使用。

import { useCallback, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface UseDragReturn {
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
  mouseDownRef: React.RefObject<boolean>;
}

const DRAG_THRESHOLD_PX = 5;

export function useDrag(): UseDragReturn {
  const [isDragging, setIsDragging] = useState(false);
  const mouseDownRef = useRef(false);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    mouseDownRef.current = true;
    setIsDragging(false);

    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;

    const reset = () => {
      mouseDownRef.current = false;
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", resetOnNextMove);
    };

    // OS ネイティブドラッグ終了後に mousemove が届いたらリセット (mouseup が来ない場合のバックアップ)
    const resetOnNextMove = () => {
      reset();
    };

    const onMouseMove = (me: MouseEvent) => {
      if (dragging) return;
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        dragging = true;
        setIsDragging(true);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        // OS ドラッグ後の最初の mousemove でリセット
        window.addEventListener("mousemove", resetOnNextMove);
        void getCurrentWindow().startDragging();
      }
    };

    const onMouseUp = () => reset();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  return { onDragStart, isDragging, mouseDownRef };
}
