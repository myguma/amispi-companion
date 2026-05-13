export type ReactionTrigger =
  | "click"
  | "dragStart"
  | "dragEnd"
  | "wake"
  | "timedGreeting"
  | "randomIdle"
  | "fullscreenDetected"
  | "mediaDetected"
  | "gamingDetected"
  | "downloadsPile"
  | "desktopPile"
  | "longIdle"
  | "manualCall"
  | "updateAvailable"
  | "observation"
  | "overClicked"
  | "returnAfterBreak"
  | "returnAfterLongBreak"
  | "activityTransition"; // InferredActivity の意味ある遷移 (tags で種別指定)

export type CompanionEmotion =
  | "idle"
  | "aware"
  | "touched"
  | "thinking"
  | "speaking"
  | "sleep"
  | "waking"
  | "happy"
  | "shy"
  | "concerned";

export type CrySpec = {
  id: string;
  synth?: {
    kind: "soft_beep" | "murmur" | "sleepy" | "surprised";
    pitch?: number;
    durationMs?: number;
  };
  volume?: number;
};

export type DisplayMode = "bubble" | "tiny" | "none";
export type Interruptibility = "safe" | "avoidDuringFocus" | "onlyManual";

export type Reaction = {
  id: string;
  trigger: ReactionTrigger;
  cry?: CrySpec;
  text?: string;
  emotion: CompanionEmotion;
  priority: 0 | 1 | 2 | 3;
  cooldownMs: number;
  durationMs: number;
  displayMode: DisplayMode;
  interruptibility: Interruptibility;
  tags?: string[];
};

export type ReactionPolicy = {
  autonomousSpeech: boolean;
  cryEnabled: boolean;
  maxAutonomousReactionsPerHour: number;
  suppressWhenFullscreen: boolean;
  suppressWhenFocus: boolean;
  quietMode: boolean;
  doNotDisturb: boolean;
};
