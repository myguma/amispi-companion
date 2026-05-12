// デスクトップ上を自律移動するWanderフック
// idle / sleep 状態のときのみ移動。タッチ・発話中は停止する。
// 参考: Shimeji (java.simmi.org) の random-walk アプローチを TypeScript で再実装

import { useEffect, useRef } from "react";
import type React from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CompanionState } from "../types/companion";

const WANDER_STATES: readonly CompanionState[] = ["idle", "sleep"];

// 次のワンダー開始まで待機する秒数 (ランダム)
const MIN_WAIT_MS = 18_000;
const MAX_WAIT_MS = 50_000;

// 移動アニメーション: 約60fps で physical px / frame
const FRAME_MS = 16;
const SPEED_IDLE = 1.2;   // idle のときの速度
const SPEED_SLEEP = 0.6;  // sleep のときの速度 (ゆっくり漂う)

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** physical px での画面サイズと window サイズを返す */
function getPhysicalBounds() {
  const dpr = window.devicePixelRatio || 1;
  return {
    sw: Math.round(window.screen.width * dpr),
    sh: Math.round(window.screen.height * dpr),
    ww: Math.round(200 * dpr),
    wh: Math.round(300 * dpr),
  };
}

/** 現在の window 位置 (physical px) */
function getCurrentPhysicalPos() {
  const dpr = window.devicePixelRatio || 1;
  return {
    x: Math.round(window.screenX * dpr),
    y: Math.round(window.screenY * dpr),
  };
}

export function useWander(
  state: CompanionState,
  mouseDownRef: React.RefObject<boolean>
) {
  const stateRef = useRef<CompanionState>(state);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const curPosRef = useRef(getCurrentPhysicalPos());

  // 最新 state を ref に同期
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!isTauri) return;

    const stopAnim = () => {
      if (animRef.current) {
        clearInterval(animRef.current);
        animRef.current = null;
      }
    };

    const scheduleNext = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const delay = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
      timerRef.current = setTimeout(() => startWander(), delay);
    };

    const startWander = () => {
      const curState = stateRef.current;
      if (!WANDER_STATES.includes(curState)) {
        scheduleNext();
        return;
      }

      const { sw, sh, ww, wh } = getPhysicalBounds();
      const margin = 30;
      const tx = Math.floor(Math.random() * (sw - ww - margin * 2)) + margin;
      const ty = Math.floor(Math.random() * (sh - wh - margin * 2)) + margin;

      curPosRef.current = getCurrentPhysicalPos();

      stopAnim();
      animRef.current = setInterval(async () => {
        // つかまれたら今回の移動をキャンセルし次回に仕切り直す
        if (mouseDownRef.current) {
          stopAnim();
          scheduleNext();
          return;
        }

        const s = stateRef.current;
        if (!WANDER_STATES.includes(s)) {
          stopAnim();
          scheduleNext();
          return;
        }

        const { x: cx, y: cy } = curPosRef.current;
        const dx = tx - cx;
        const dy = ty - cy;
        const dist = Math.hypot(dx, dy);

        const speed = s === "sleep" ? SPEED_SLEEP : SPEED_IDLE;

        if (dist < speed * 2) {
          stopAnim();
          scheduleNext();
          return;
        }

        const nx = Math.round(cx + (dx / dist) * speed);
        const ny = Math.round(cy + (dy / dist) * speed);
        curPosRef.current = { x: nx, y: ny };

        try {
          await invoke("move_window", { x: nx, y: ny });
        } catch {
          stopAnim();
        }
      }, FRAME_MS);
    };

    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopAnim();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // state が移動不可に変わったら即停止
  useEffect(() => {
    if (!WANDER_STATES.includes(state) && animRef.current) {
      clearInterval(animRef.current);
      animRef.current = null;
    }
  }, [state]);
}
