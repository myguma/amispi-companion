// PrivacyGate
// 「LLM に秘密を守ってと頼るのではなく、そもそも渡さない」設計

import type { PermissionSettings, PrivacyField } from "./permissions";
import { canAccessField } from "./permissions";

export type PrivacyDestination =
  | "local_rule"
  | "local_llm"
  | "cloud_llm"
  | "ui_display"
  | "debug_log";

export type PrivacyGateRequest = {
  destination: PrivacyDestination;
  requestedFields: PrivacyField[];
  permissions: PermissionSettings;
};

export type PrivacyGateResult = {
  allowedFields: PrivacyField[];
  blockedFields: PrivacyField[];
};

// cloud に送っても NG なフィールド (cloudAllowed=true でも禁止)
const CLOUD_BLOCKED_ALWAYS: PrivacyField[] = [
  "activeWindowTitle",
  "fileNames",
  "fileContent",
  "clipboard",
  "screenContent",
];

// debug_log に出してはいけないフィールド
const DEBUG_LOG_BLOCKED: PrivacyField[] = [
  "activeWindowTitle",
  "fileNames",
  "fileContent",
  "clipboard",
  "screenContent",
];

export function checkPrivacyGate(req: PrivacyGateRequest): PrivacyGateResult {
  const allowedFields: PrivacyField[] = [];
  const blockedFields: PrivacyField[] = [];

  for (const field of req.requestedFields) {
    let allowed = canAccessField(field, req.permissions);

    if (allowed && req.destination === "cloud_llm") {
      if (!req.permissions.cloudAllowed) allowed = false;
      else if (CLOUD_BLOCKED_ALWAYS.includes(field)) allowed = false;
    }

    if (allowed && req.destination === "debug_log") {
      if (DEBUG_LOG_BLOCKED.includes(field)) allowed = false;
    }

    if (allowed) allowedFields.push(field);
    else blockedFields.push(field);
  }

  return { allowedFields, blockedFields };
}
