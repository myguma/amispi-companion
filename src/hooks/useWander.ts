// デスクトップ上を自律移動するWanderフック
// idle / sleep 状態のときのみ移動。タッチ・発話中は停止する。
// 参考: Shimeji (java.simmi.org) の random-walk アプローチを TypeScript で再実装

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CompanionState } from "../types/companion";
import { COMPANION_COMPACT_H, COMPANION_WINDOW_W } from "../constants/companionLayout";
import type { MovementFrequency } from "../settings/types";

const WANDER_STATES: readonly CompanionState[] = ["idle", "sleep"];

// 次のワンダー開始まで待機する秒数 (ランダム)
const WAIT_BY_FREQUENCY: Record<MovementFrequency, [number, number]> = {
  low: [45_000, 90_000],
  normal: [25_000, 55_000],
  high: [12_000, 32_000],
};

// 移動アニメーション: 約60fps で physical px / frame
const FRAME_MS = 16;
const SPEED_IDLE = 1.2;   // idle のときの速度
const SPEED_SLEEP = 0.6;  // sleep のときの速度 (ゆっくり漂う)

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** physical px での画面サイズと window サイズを返す */
function getPhysicalBounds() {
  const dpr = window.devicePixelRatio || 1;
  const ww = window.outerWidth > 0 ? window.outerWidth : COMPANION_WINDOW_W;
  const wh = window.outerHeight > 0 ? window.outerHeight : COMPANION_COMPACT_H;
  return {
    sw: Math.round(window.screen.width * dpr),
    sh: Math.round(window.screen.height * dpr),
    ww: Math.round(ww * dpr),
    wh: Math.round(wh * dpr),
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
  mouseDownRef: React.RefObject<boolean>,
  enabled = true,
  frequency: MovementFrequency = "low"
): { facingRight: boolean } {
  const stateRef = useRef<CompanionState>(state);
  const enabledRef = useRef(enabled);
  const frequencyRef = useRef(frequency);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const curPosRef = useRef(getCurrentPhysicalPos());
  const [facingRight, setFacingRight] = useState(false);
  const facingRightRef = useRef(false);

  // 最新 state を ref に同期
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    frequencyRef.current = frequency;
  }, [frequency]);

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
      if (!enabledRef.current) {
        timerRef.current = null;
        return;
      }
      const [minWait, maxWait] = WAIT_BY_FREQUENCY[frequencyRef.current] ?? WAIT_BY_FREQUENCY.low;
      const delay = minWait + Math.random() * (maxWait - minWait);
      timerRef.current = setTimeout(() => startWander(), delay);
    };

    const startWander = () => {
      if (!enabledRef.current) {
        stopAnim();
        return;
      }
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
        if (!enabledRef.current || mouseDownRef.current) {
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

        // 移動方向が変わったときだけ setState (毎フレーム呼ぶと重い)
        const nowRight = dx > 0;
        if (nowRight !== facingRightRef.current) {
          facingRightRef.current = nowRight;
          setFacingRight(nowRight);
        }

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
  }, [mouseDownRef, enabled, frequency]);

  // state が移動不可に変わったら即停止
  useEffect(() => {
    if ((!enabled || !WANDER_STATES.includes(state)) && animRef.current) {
      clearInterval(animRef.current);
      animRef.current = null;
    }
    if (!enabled && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [enabled, state]);

  return { facingRight };
}
