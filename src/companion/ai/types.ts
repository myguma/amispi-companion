import type { ReactionTrigger, CompanionEmotion } from "../reactions/types";
import type { ActivityKind, AppCategory } from "../../observation/types";

export type AIProviderKind = "mock" | "rule" | "local_http" | "cloud";

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
};

export interface AIProvider {
  readonly name: string;
  readonly kind: AIProviderKind;
  isAvailable(): Promise<boolean>;
  respond(input: AIProviderInput): Promise<AIProviderOutput>;
}
