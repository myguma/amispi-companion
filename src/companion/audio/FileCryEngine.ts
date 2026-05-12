import type { CryEngine } from "./CryEngine";
import type { CrySpec } from "../reactions/types";

export class FileCryEngine implements CryEngine {
  private _vol = 0.4;
  // AudioContext はシングルトンで使い回す (毎回 new すると上限に達する)
  private _ctx: AudioContext | null = null;

  private async getCtx(): Promise<AudioContext> {
    if (!this._ctx || this._ctx.state === "closed") {
      this._ctx = new AudioContext();
    }
    // WebView2 はバックグラウンドで suspend することがある
    if (this._ctx.state === "suspended") {
      await this._ctx.resume();
    }
    return this._ctx;
  }

  async play(spec: CrySpec): Promise<void> {
    if (!spec.synth) return;
    try {
      const ctx = await this.getCtx();
      const gain = ctx.createGain();
      const vol = (spec.volume ?? 1.0) * this._vol;
      gain.gain.value = vol;
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const pitch = spec.synth.pitch ?? 1.0;
      const dur = (spec.synth.durationMs ?? 150) / 1000;

      switch (spec.synth.kind) {
        case "soft_beep":
          osc.type = "sine";
          osc.frequency.value = 660 * pitch;
          gain.gain.setTargetAtTime(0, ctx.currentTime + dur * 0.5, 0.08);
          break;
        case "murmur":
          osc.type = "triangle";
          osc.frequency.value = 220 * pitch;
          gain.gain.setTargetAtTime(0, ctx.currentTime + dur * 0.3, 0.12);
          break;
        case "sleepy":
          osc.type = "sine";
          osc.frequency.value = 330 * pitch;
          osc.frequency.linearRampToValueAtTime(200 * pitch, ctx.currentTime + dur);
          gain.gain.setTargetAtTime(0, ctx.currentTime, dur * 0.8);
          break;
        case "surprised":
          osc.type = "sine";
          osc.frequency.value = 880 * pitch;
          osc.frequency.linearRampToValueAtTime(440 * pitch, ctx.currentTime + dur);
          gain.gain.setTargetAtTime(0, ctx.currentTime + dur * 0.7, 0.05);
          break;
      }

      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.1);
      // コンテキストは閉じない — 次の再生でも使い回す
    } catch (e) {
      console.warn("[CryEngine] play failed:", e);
    }
  }

  setVolume(v: number): void {
    this._vol = Math.max(0, Math.min(1, v));
  }

  stopAll(): void {
    this._ctx?.close().catch(() => {});
    this._ctx = null;
  }
}

export const cryEngine: CryEngine = new FileCryEngine();
