import type { ReactionTrigger, CompanionEmotion } from "../reactions/types";
import type { ActivityKind, AppCategory, ObservationSnapshot } from "../../observation/types";
import type { ActivityInsight } from "../activity/inferActivity";
import type { CompanionMemorySummary } from "../memory/buildMemorySummary";
import type { MemoryEvent } from "../../types/companion";
import type { ObservationSignal } from "../../systems/observation/observationSignals";

// ──── 新型: CompanionContext / CompanionUtterance ────────────────

export type AIEngine = "none" | "mock" | "ollama" | "openai";

/** AI トリガーの発生元 */
export type AITrigger =
  | "click"
  | "idle"
  | "observation"
  | "wake"
  | "return"
  | "manual"
  | "voice"
  | "text";

/** 発話生成に必要な統合コンテキスト */
export type CompanionContext = {
  trigger: AITrigger;
  recentEvents: MemoryEvent[];
  observation: ObservationSnapshot;
  activityInsight: ActivityInsight;
  memorySummary: CompanionMemorySummary;
  /** 現在の ObservationSignals (プロンプト・RuleProvider で参照) */
  signals?: ObservationSignal[];
  /** autonomous speech / quiet / focus / DND etc. */
  speechSettings: {
    autonomousSpeechEnabled: boolean;
    quietMode: boolean;
    focusMode: boolean;
    doNotDisturb: boolean;
    maxAutonomousReactionsPerHour: number;
    suppressWhenFullscreen: boolean;
  };
  voiceInput?: string;
};

/** コンパニオンの発話出力 */
export type CompanionUtterance = {
  text: string;
  shouldSpeak: boolean;
  source: "none" | "dialogue" | "reaction" | "mock" | "ollama" | "rule";
};

export type AIProviderKind = "mock" | "rule" | "local_http" | "cloud" | "cloud_openai";

export type CompanionRuntimeContext = {
  nowLocal: string;
  activity: ActivityKind;
  activeAppCategory?: AppCategory;
  idleMinutes: number;
  fullscreenLikely: boolean;
  folderSignals: {
    desktopFileCount?: number;
    downloadsFileCount?: number;
    recentDownloadsCount?: number;
    screenshotPileLikely?: boolean;
  };
  modes: {
    quietMode: boolean;
    focusMode: boolean;
    doNotDisturb: boolean;
  };
};

export type AIProviderInput = {
  trigger: ReactionTrigger;
  runtimeContext: CompanionRuntimeContext;
  privacy: {
    destination: "local_rule" | "local_llm" | "cloud_llm";
    allowedFields: string[];
    redacted: boolean;
  };
  constraints: {
    maxLength: number;
    language: "ja" | "en";
    tone: "quiet" | "neutral" | "playful";
    oneSentence?: boolean;
  };
};

export type AIProviderOutput = {
  text?: string;
  emotion?: CompanionEmotion;
  shouldSpeak: boolean;
  confidence?: number;
  reason?: string;
  safeReason?: string;
  httpStatus?: number;
  providerErrorCode?: string;
};

export type AIResultSource = "openai" | "ollama" | "rule" | "mock" | "fallback" | "none";
export type AIResultStatus = "success" | "failed" | "skipped" | "fallback";

export type LastAIResultDebug = {
  source: AIResultSource;
  status?: AIResultStatus;
  trigger?: string;
  fallbackReason?: string;
  safeReason?: string;
  fallbackFrom?: AIResultSource;
  fallbackTo?: AIResultSource;
  model?: string;
  baseUrl?: string;
  httpStatus?: number;
  providerErrorCode?: string;
  latencyMs?: number;
  responsePreview?: string;
  errorMessage?: string;
  qualityRejected?: boolean;
  qualityRejectedReason?: string;
  updatedAt: number;
};

export interface AIProvider {
  readonly name: string;
  readonly kind: AIProviderKind;
  isAvailable(): Promise<boolean>;
  respond(ctx: CompanionContext): Promise<AIProviderOutput>;
}
