// 設定の永続化
// app_config_dir に settings.json として保存する

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersistedSettings {
    pub permission_level: u8,
    pub window_title_enabled: bool,
    pub folder_metadata_enabled: bool,
    pub filenames_enabled: bool,
    pub cloud_allowed: bool,
    pub quiet_mode: bool,
    pub focus_mode: bool,
    pub do_not_disturb: bool,
    pub suppress_when_fullscreen: bool,
    pub suppress_when_media_likely: bool,
    pub suppress_when_gaming_likely: bool,
    pub cry_enabled: bool,
    pub volume: f32,
    pub autonomous_movement_enabled: bool,
    pub movement_frequency: String,
    pub always_on_top: bool,
    pub autonomous_speech_enabled: bool,
    pub speech_frequency: String,
    pub max_autonomous_reactions_per_hour: u32,
    pub show_on_startup: bool,
}

impl Default for PersistedSettings {
    fn default() -> Self {
        Self {
            permission_level: 1,
            window_title_enabled: false,
            folder_metadata_enabled: true,
            filenames_enabled: false,
            cloud_allowed: false,
            quiet_mode: false,
            focus_mode: false,
            do_not_disturb: false,
            suppress_when_fullscreen: true,
            suppress_when_media_likely: true,
            suppress_when_gaming_likely: true,
            cry_enabled: true,
            volume: 0.4,
            autonomous_movement_enabled: true,
            movement_frequency: "low".to_string(),
            always_on_top: true,
            autonomous_speech_enabled: false,
            speech_frequency: "rare".to_string(),
            max_autonomous_reactions_per_hour: 2,
            show_on_startup: true,
        }
    }
}

fn settings_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    use tauri::Manager;
    app.path().app_config_dir().ok().map(|d| d.join("settings.json"))
}

pub fn load_settings(app: &tauri::AppHandle) -> PersistedSettings {
    let Some(path) = settings_path(app) else {
        return PersistedSettings::default();
    };
    let Ok(raw) = std::fs::read_to_string(&path) else {
        return PersistedSettings::default();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

pub fn save_settings(app: &tauri::AppHandle, settings: &PersistedSettings) -> Result<(), String> {
    let path = settings_path(app).ok_or("config dir unavailable")?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}
