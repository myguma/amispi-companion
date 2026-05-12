// 権限モデル
// Level 0 (最小) ~ Level 4 (外部AI) で観測範囲を制御する

export type PermissionLevel = 0 | 1 | 2 | 3 | 4;

export type PrivacyField =
  | "time"
  | "idleMs"
  | "activeAppName"
  | "activeWindowTitle"
  | "folderCounts"
  | "fileNames"
  | "fileContent"
  | "clipboard"
  | "screenContent";

export type PermissionSettings = {
  level: PermissionLevel;
  windowTitleEnabled: boolean;
  folderMetadataEnabled: boolean;
  filenamesEnabled: boolean;
  cloudAllowed: boolean;
};

export const DEFAULT_PERMISSIONS: PermissionSettings = {
  level: 1,
  windowTitleEnabled: false,
  folderMetadataEnabled: true,
  filenamesEnabled: false,
  cloudAllowed: false,
};

export function canAccessField(
  field: PrivacyField,
  p: PermissionSettings
): boolean {
  switch (field) {
    case "time":
      return true;
    case "idleMs":
    case "activeAppName":
      return p.level >= 1;
    case "activeWindowTitle":
      return p.level >= 1 && p.windowTitleEnabled;
    case "folderCounts":
      return p.level >= 1 && p.folderMetadataEnabled;
    case "fileNames":
      return p.level >= 2 && p.filenamesEnabled;
    case "fileContent":
      return p.level >= 3;
    case "clipboard":
    case "screenContent":
      return false; // 常に禁止
  }
}
