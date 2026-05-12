import type { CrySpec } from "../reactions/types";

export interface CryEngine {
  play(spec: CrySpec): Promise<void>;
  setVolume(volume: number): void;
  stopAll(): void;
}
