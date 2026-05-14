// 観測サービス
// Windows API でローカル情報を取得し、権限に応じてフィルタした snapshot を返す。
// 生データをそのまま返さない。パス・タイトルは権限チェック後のみ含める。

use serde::Serialize;
use std::collections::HashMap;

// ──────────────────────────────────────────
// 型定義 (TypeScript 側の ObservationSnapshot と対応)
// ──────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IdleInfo {
    pub idle_ms: u64,
    pub input_active_recently: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActiveAppInfo {
    pub process_name: String,
    pub category: String,
    pub classification_reason: String,
    pub classification_source: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActiveWindowInfo {
    pub title_redacted: Option<String>,
    pub included: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FolderSummary {
    pub folder_kind: String,
    pub file_count: usize,
    pub dir_count: usize,
    pub total_size_bytes: u64,
    pub extension_counts: HashMap<String, usize>,
    pub recent_file_count: usize,
    pub screenshot_pile_likely: bool,
    pub audio_pile_likely: bool,
    pub image_pile_likely: bool,
    // v1.5.0: explicit opt-in, volatile raw filename samples for Debug/Diagnostics only.
    // These are never persisted by Rust and are only returned when filename_samples_enabled is true.
    pub filename_samples: Vec<String>,
    // v1.0.6: filename-derived signals
    pub filename_signals: Vec<String>,
    pub installer_pile_likely: bool,
    pub archive_pile_likely: bool,
    pub audio_export_likely: bool,
    pub image_export_likely: bool,
    pub daw_project_likely: bool,
    pub code_project_likely: bool,
    pub temp_download_likely: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FolderSnapshots {
    pub desktop: Option<FolderSummary>,
    pub downloads: Option<FolderSummary>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub cpu_load: Option<f32>,
    pub memory_load: Option<f32>,
}

/// フォアグラウンドプロセス取得の詳細デバッグ情報
/// 実機でどの段階で失敗しているかを UI に表示するために使う
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActiveAppDebugInfo {
    pub platform: String,
    pub hwnd_available: bool,
    pub hwnd_raw: u64,         // HWND の生値 (null=0 か否かの確認用)
    pub pid: u32,
    pub pid_available: bool,
    pub open_process_ok: bool,
    pub query_name_ok: bool,
    pub process_name: String,
    pub process_path_len: usize,
    pub category: String,
    pub classification_reason: String,
    pub classification_source: String,
    pub error_stage: String,
    pub error_code: u32,
    pub last_error_before: u32, // API 呼び出し前の GetLastError 値
    pub is_self_app: bool,
}

/// バックグラウンドメディア再生の推定情報
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MediaContext {
    /// 何らかのメディアアプリが起動中か
    pub audio_likely_active: bool,
    /// "music" | "video" | "none"
    pub media_kind: String,
    /// "music_app" | "video_app" | "daw" | "browser" | "none"
    pub source_category: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrivacyMeta {
    pub permission_level: u8,
    pub title_included: bool,
    pub filenames_included: bool,
    pub filename_samples_included: bool,
    pub content_included: bool,
    pub cloud_allowed: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ObservationSnapshot {
    pub timestamp: String,
    pub idle: IdleInfo,
    pub active_app: Option<ActiveAppInfo>,
    pub active_window: Option<ActiveWindowInfo>,
    pub fullscreen_likely: bool,
    pub folders: FolderSnapshots,
    pub system: Option<SystemInfo>,
    pub media: Option<MediaContext>,
    pub privacy: PrivacyMeta,
}

#[allow(dead_code)]
fn classify_app(name: &str) -> (String, String, String) {
    let name = name.to_lowercase();

    let exact = |items: &[&str]| items.iter().any(|item| *item == name);
    let contains = |items: &[&str]| items.iter().any(|item| name.contains(item));
    let result = |category: &str, reason: String| {
        (category.to_string(), reason, "built_in".to_string())
    };

    if contains(&["msedgewebview2"]) || exact(&["amispi-companion.exe", "amispi-companion"]) {
        return result("self", format!("self_app:{}", name));
    }

    if exact(&["chatgpt.exe", "chatgpt"]) {
        return result("ai_chat", format!("exact:{}", name));
    }
    if exact(&["claude.exe", "claude"]) {
        return result("ai_assistant", format!("exact:{}", name));
    }
    if contains(&["perplexity"]) {
        return result("ai_search", format!("contains:{}", name));
    }
    if exact(&["copilot.exe", "githubcopilot.exe"]) || contains(&["copilot"]) {
        return result("ai_assistant", format!("ai_assistant:{}", name));
    }

    if exact(&[
        "code.exe", "cursor.exe", "windsurf.exe", "zed.exe", "idea64.exe", "devenv.exe",
        "rider64.exe", "clion64.exe", "pycharm64.exe", "webstorm64.exe", "phpstorm64.exe",
        "notepad++.exe", "sublime_text.exe",
    ]) {
        return result("ide", format!("exact:{}", name));
    }

    if exact(&[
        "chrome.exe", "firefox.exe", "msedge.exe", "brave.exe", "vivaldi.exe",
        "opera.exe", "arc.exe", "librewolf.exe",
    ]) {
        return result("browser", format!("exact:{}", name));
    }

    if exact(&["spotify.exe", "musicbee.exe", "foobar2000.exe", "aimp.exe", "tidal.exe", "itunes.exe", "applemusic.exe", "winamp.exe", "mediamonkey.exe"]) {
        return result("music", format!("exact:{}", name));
    }

    if exact(&["vlc.exe", "mpc-hc.exe", "mpc-be.exe", "mpv.exe", "wmplayer.exe", "potplayermini64.exe", "potplayer.exe", "kmplayer.exe"]) {
        return result("media", format!("exact:{}", name));
    }

    if name.ends_with("game") || exact(&["steam.exe", "epicgameslauncher.exe", "gog galaxy.exe", "playnite.desktop.exe"]) {
        return result("game", format!("game_rule:{}", name));
    }

    if exact(&[
        "ableton live.exe", "fl64.exe", "fl.exe", "bitwig.exe", "bitwig studio.exe",
        "reaper.exe", "reaper64.exe", "logic.exe", "studioone.exe", "cubase.exe",
        "cubase12.exe",
    ]) {
        return result("daw", format!("exact:{}", name));
    }

    if exact(&[
        "discord.exe", "slack.exe", "teams.exe", "zoom.exe", "skype.exe",
        "msteams.exe", "element.exe", "signal.exe",
    ]) {
        return result("chat", format!("exact:{}", name));
    }

    if exact(&["explorer.exe", "totalcmd.exe", "freecommander.exe"]) {
        return result("file_manager", format!("exact:{}", name));
    }

    if exact(&[
        "figma.exe", "photoshop.exe", "illustrator.exe", "indesign.exe", "xd.exe",
        "canva.exe", "inkscape.exe", "gimp.exe", "blender.exe",
        "affinity publisher.exe", "affinity designer.exe", "affinity photo.exe",
        "affpub.exe", "affdes.exe", "affphoto.exe", "sketch.exe", "penpot.exe", "lunacy.exe",
    ]) {
        return result("design", format!("exact:{}", name));
    }

    if exact(&[
        "obsidian.exe", "logseq.exe", "joplin.exe", "standardnotes.exe", "zettlr.exe",
        "marktext.exe", "typora.exe", "notable.exe", "evernote.exe", "notesnook.exe",
        "notion.exe", "onenote.exe",
    ]) {
        return result("notes", format!("exact:{}", name));
    }

    if exact(&[
        "winword.exe", "excel.exe", "powerpnt.exe", "soffice.exe", "keynote.exe",
        "sumatrapdf.exe", "acrord32.exe", "acrobat.exe", "foxitreader.exe", "evince.exe",
        "okular.exe", "calibre.exe", "kindle.exe", "drawboard pdf.exe",
    ]) {
        return result("document", format!("exact:{}", name));
    }

    if exact(&["7zfm.exe", "7z.exe", "winrar.exe", "bandizip.exe", "peazip.exe", "izarc.exe"]) {
        return result("archive_tool", format!("exact:{}", name));
    }

    if contains(&["setup", "installer", "install"]) || exact(&["msiexec.exe"]) {
        return result("installer", format!("installer_rule:{}", name));
    }

    if exact(&["cmd.exe", "powershell.exe", "pwsh.exe", "wt.exe", "windowsterminal.exe", "alacritty.exe", "hyper.exe", "mintty.exe"]) {
        return result("terminal", format!("exact:{}", name));
    }

    if exact(&["taskmgr.exe", "control.exe", "regedit.exe", "mmc.exe"]) {
        return result("system", format!("exact:{}", name));
    }

    ("unknown".to_string(), format!("no_rule_match:{}", name), "unknown".to_string())
}

// ──────────────────────────────────────────
// 権限設定 (フロントエンドから渡される)
// ──────────────────────────────────────────

#[derive(Debug, serde::Deserialize, Clone)]
pub struct PermissionConfig {
    pub level: u8,
    pub window_title_enabled: bool,
    pub folder_metadata_enabled: bool,
    pub filenames_enabled: bool,
    pub filename_samples_enabled: bool,
    pub filename_samples_max_count: usize,
    pub cloud_allowed: bool,
}

impl Default for PermissionConfig {
    fn default() -> Self {
        Self {
            level: 1,
            window_title_enabled: false,
            folder_metadata_enabled: true,
            filenames_enabled: false,
            filename_samples_enabled: false,
            filename_samples_max_count: 5,
            cloud_allowed: false,
        }
    }
}

// ──────────────────────────────────────────
// Windows 実装
// ──────────────────────────────────────────

#[cfg(target_os = "windows")]
mod windows_impl {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use windows_sys::Win32::{
        Foundation::{CloseHandle, GetLastError, SetLastError, HANDLE, MAX_PATH, RECT},
        Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST},
        System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
            PROCESS_QUERY_LIMITED_INFORMATION,
        },
        UI::{
            Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO},
            WindowsAndMessaging::{
                GetForegroundWindow, GetWindowRect, GetWindowTextLengthW,
                GetWindowTextW, GetWindowThreadProcessId,
            },
        },
    };

    fn wide_to_string(buf: &[u16]) -> String {
        let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
        OsString::from_wide(&buf[..end])
            .to_string_lossy()
            .into_owned()
    }

    pub fn get_idle_ms() -> u64 {
        unsafe {
            let mut info = LASTINPUTINFO {
                cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
                dwTime: 0,
            };
            if GetLastInputInfo(&mut info) != 0 {
                let tick = windows_sys::Win32::System::SystemInformation::GetTickCount64();
                tick.saturating_sub(info.dwTime as u64)
            } else {
                0
            }
        }
    }

    pub fn get_active_app() -> Option<(String, String, String, String)> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() { return None; }

            let mut pid: u32 = 0;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid == 0 { return None; }

            let handle: HANDLE = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if handle.is_null() { return None; }

            let mut buf = vec![0u16; MAX_PATH as usize];
            let mut size = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut size);
            CloseHandle(handle);

            if ok == 0 { return None; }

            let full_path = wide_to_string(&buf[..size as usize]);
            let process_name = std::path::Path::new(&full_path)
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_lowercase();

            let (category, classification_reason, classification_source) = super::classify_app(&process_name);
            Some((process_name, category, classification_reason, classification_source))
        }
    }

    pub fn get_window_title() -> Option<String> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() { return None; }
            let len = GetWindowTextLengthW(hwnd);
            if len <= 0 { return None; }
            let mut buf = vec![0u16; (len + 1) as usize];
            GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
            let title = wide_to_string(&buf);
            if title.is_empty() { None } else { Some(title) }
        }
    }

    pub fn is_fullscreen_likely() -> bool {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() { return false; }

            let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
            if monitor.is_null() { return false; }

            let mut mi = MONITORINFO {
                cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                rcMonitor: RECT { left: 0, top: 0, right: 0, bottom: 0 },
                rcWork: RECT { left: 0, top: 0, right: 0, bottom: 0 },
                dwFlags: 0,
            };
            if GetMonitorInfoW(monitor, &mut mi) == 0 { return false; }

            let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
            if GetWindowRect(hwnd, &mut rect) == 0 { return false; }

            let mon = mi.rcMonitor;
            rect.left <= mon.left
                && rect.top <= mon.top
                && rect.right >= mon.right
                && rect.bottom >= mon.bottom
        }
    }

    /// フォアグラウンドプロセス取得の各段階を詳細に返す
    /// TransparencyPage のデバッグパネル向け
    pub fn get_active_app_debug() -> super::ActiveAppDebugInfo {
        use super::ActiveAppDebugInfo;
        unsafe {
            // 直前のエラーをクリアして誤検出を防ぐ
            SetLastError(0);
            let err_before = GetLastError();

            let hwnd = GetForegroundWindow();
            let hwnd_raw = hwnd as u64;

            if hwnd.is_null() {
                let code = GetLastError();
                return ActiveAppDebugInfo {
                    platform: "windows".to_string(),
                    hwnd_available: false, hwnd_raw,
                    pid: 0, pid_available: false,
                    open_process_ok: false, query_name_ok: false,
                    process_name: String::new(), process_path_len: 0,
                    category: "unknown".to_string(),
                    classification_reason: "hwnd_null".to_string(),
                    classification_source: "system".to_string(),
                    error_stage: "hwnd_null".to_string(),
                    error_code: code, last_error_before: err_before,
                    is_self_app: false,
                };
            }

            let mut pid: u32 = 0;
            SetLastError(0);
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid == 0 {
                let code = GetLastError();
                return ActiveAppDebugInfo {
                    platform: "windows".to_string(),
                    hwnd_available: true, hwnd_raw,
                    pid: 0, pid_available: false,
                    open_process_ok: false, query_name_ok: false,
                    process_name: String::new(), process_path_len: 0,
                    category: "unknown".to_string(),
                    classification_reason: "pid_zero".to_string(),
                    classification_source: "system".to_string(),
                    error_stage: "pid_zero".to_string(),
                    error_code: code, last_error_before: err_before,
                    is_self_app: false,
                };
            }

            SetLastError(0);
            let handle: HANDLE = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if handle.is_null() {
                let code = GetLastError();
                return ActiveAppDebugInfo {
                    platform: "windows".to_string(),
                    hwnd_available: true, hwnd_raw,
                    pid, pid_available: true,
                    open_process_ok: false, query_name_ok: false,
                    process_name: String::new(), process_path_len: 0,
                    category: "unknown".to_string(),
                    classification_reason: "open_process_failed".to_string(),
                    classification_source: "system".to_string(),
                    error_stage: "open_process_failed".to_string(),
                    error_code: code, last_error_before: err_before,
                    is_self_app: false,
                };
            }

            let mut buf = vec![0u16; MAX_PATH as usize];
            let mut size = buf.len() as u32;
            SetLastError(0);
            let ok = QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut size);
            let code = if ok == 0 { GetLastError() } else { 0 };
            CloseHandle(handle);

            if ok == 0 {
                return ActiveAppDebugInfo {
                    platform: "windows".to_string(),
                    hwnd_available: true, hwnd_raw,
                    pid, pid_available: true,
                    open_process_ok: true, query_name_ok: false,
                    process_name: String::new(), process_path_len: 0,
                    category: "unknown".to_string(),
                    classification_reason: "query_name_failed".to_string(),
                    classification_source: "system".to_string(),
                    error_stage: "query_name_failed".to_string(),
                    error_code: code, last_error_before: err_before,
                    is_self_app: false,
                };
            }

            let full_path = wide_to_string(&buf[..size as usize]);
            let path_len = full_path.len();
            let process_name = std::path::Path::new(&full_path)
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_lowercase();

            let (category, classification_reason, classification_source) = super::classify_app(&process_name);
            let is_self = category == "self";

            ActiveAppDebugInfo {
                platform: "windows".to_string(),
                hwnd_available: true, hwnd_raw,
                pid, pid_available: true,
                open_process_ok: true, query_name_ok: true,
                process_name,
                process_path_len: path_len,
                category,
                classification_reason,
                classification_source,
                error_stage: "ok".to_string(),
                error_code: 0, last_error_before: err_before,
                is_self_app: is_self,
            }
        }
    }

}

// ──────────────────────────────────────────
// フォルダスキャン (クロスプラットフォーム)
// ──────────────────────────────────────────

fn build_filename_signals(
    ext_counts: &HashMap<String, usize>,
    file_names: &[String],
) -> (Vec<String>, bool, bool, bool, bool, bool, bool, bool) {
    let installer_exts = ["exe", "msi", "dmg", "pkg"];
    let installer_names = ["setup", "installer", "install"];
    let archive_exts = ["zip", "rar", "7z", "tar", "gz", "bz2"];
    let audio_export_exts = ["wav", "mp3", "flac", "aif", "aiff"];
    let audio_export_names = ["mix", "master", "render", "export", "bounce", "stem"];
    let image_export_exts = ["png", "jpg", "jpeg", "webp"];
    let image_export_names = ["screenshot", "screen", "export"];
    let daw_exts = ["bwproject", "als", "flp", "rpp", "logicx", "cpr"];
    let code_files = ["package.json", "tsconfig.json", "cargo.toml", "pyproject.toml"];
    let temp_exts = ["crdownload", "part", "tmp"];

    let ext_count = |exts: &[&str]| -> usize {
        exts.iter().map(|e| ext_counts.get(*e).copied().unwrap_or(0)).sum()
    };

    let name_has = |names: &[&str]| -> bool {
        file_names.iter().any(|n| names.iter().any(|p| n.contains(p)))
    };

    let installer_likely = ext_count(&installer_exts) > 0 || name_has(&installer_names);
    let archive_likely = ext_count(&archive_exts) > 3;
    let audio_export_likely = ext_count(&audio_export_exts) > 2 && name_has(&audio_export_names);
    let image_export_likely = ext_count(&image_export_exts) > 5 && name_has(&image_export_names);
    let daw_likely = ext_count(&daw_exts) > 0;
    let code_likely = file_names.iter().any(|n| code_files.iter().any(|c| n == c));
    let temp_likely = ext_count(&temp_exts) > 0;

    let mut signals = Vec::new();
    if installer_likely { signals.push("installer".to_string()); }
    if archive_likely { signals.push("archive".to_string()); }
    if audio_export_likely { signals.push("audio_export".to_string()); }
    if image_export_likely { signals.push("image_export".to_string()); }
    if daw_likely { signals.push("daw_project".to_string()); }
    if code_likely { signals.push("code_project".to_string()); }
    if temp_likely { signals.push("temp_download".to_string()); }

    (signals, installer_likely, archive_likely, audio_export_likely, image_export_likely, daw_likely, code_likely, temp_likely)
}

fn scan_folder(path: &std::path::Path, kind: &str, include_filename_samples: bool, sample_max_count: usize) -> Option<FolderSummary> {
    if !path.exists() { return None; }

    let mut file_count = 0usize;
    let mut dir_count = 0usize;
    let mut total_size = 0u64;
    let mut ext_counts: HashMap<String, usize> = HashMap::new();
    let mut recent_count = 0usize;
    let mut filename_samples: Vec<String> = Vec::new();
    let sample_limit = sample_max_count.clamp(0, 10);

    let cutoff = std::time::SystemTime::now()
        .checked_sub(std::time::Duration::from_secs(7 * 24 * 3600))
        .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

    // depth 1 のみスキャン (パフォーマンス保護)
    let Ok(entries) = std::fs::read_dir(path) else { return None; };

    let mut file_names_lower: Vec<String> = Vec::new();
    let mut count = 0;
    for entry in entries.flatten() {
        count += 1;
        if count > 2000 { break; } // 上限 2000 件

        let Ok(meta) = entry.metadata() else { continue };

        if meta.is_dir() {
            dir_count += 1;
            continue;
        }

        file_count += 1;
        total_size += meta.len();

        let name = entry.file_name();
        let name_lower = name.to_string_lossy().to_lowercase();
        let ext = name_lower.rsplit('.').next().unwrap_or("").to_string();
        *ext_counts.entry(ext).or_default() += 1;

        if file_names_lower.len() < 200 {
            file_names_lower.push(name_lower.to_string());
        }
        if include_filename_samples && filename_samples.len() < sample_limit {
            filename_samples.push(name.to_string_lossy().chars().take(120).collect());
        }

        if let Ok(modified) = meta.modified() {
            if modified > cutoff { recent_count += 1; }
        }
    }

    let img_exts = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];
    let screenshot_pile = ext_counts.get("png").copied().unwrap_or(0) > 10;
    let image_pile = img_exts.iter().map(|e| ext_counts.get(*e).copied().unwrap_or(0)).sum::<usize>() > 15;
    let audio_pile = ["mp3", "wav", "flac", "aac", "ogg"].iter()
        .map(|e| ext_counts.get(*e).copied().unwrap_or(0)).sum::<usize>() > 5;

    let (filename_signals, installer_pile_likely, archive_pile_likely, audio_export_likely, image_export_likely, daw_project_likely, code_project_likely, temp_download_likely) =
        build_filename_signals(&ext_counts, &file_names_lower);

    Some(FolderSummary {
        folder_kind: kind.to_string(),
        file_count,
        dir_count,
        total_size_bytes: total_size,
        extension_counts: ext_counts,
        recent_file_count: recent_count,
        screenshot_pile_likely: screenshot_pile,
        audio_pile_likely: audio_pile,
        image_pile_likely: image_pile,
        filename_samples,
        filename_signals,
        installer_pile_likely,
        archive_pile_likely,
        audio_export_likely,
        image_export_likely,
        daw_project_likely,
        code_project_likely,
        temp_download_likely,
    })
}

fn get_desktop_path() -> Option<std::path::PathBuf> {
    std::env::var("USERPROFILE").ok().map(|h| std::path::PathBuf::from(h).join("Desktop"))
}

fn get_downloads_path() -> Option<std::path::PathBuf> {
    std::env::var("USERPROFILE").ok().map(|h| std::path::PathBuf::from(h).join("Downloads"))
}

// ──────────────────────────────────────────
// スナップショット生成
// ──────────────────────────────────────────

pub fn build_snapshot(perms: &PermissionConfig) -> ObservationSnapshot {
    let timestamp = chrono_timestamp();

    // idle (level >= 1 で取得)
    let idle = if perms.level >= 1 {
        #[cfg(target_os = "windows")]
        {
            let ms = windows_impl::get_idle_ms();
            IdleInfo { idle_ms: ms, input_active_recently: ms < 5000 }
        }
        #[cfg(not(target_os = "windows"))]
        IdleInfo { idle_ms: 0, input_active_recently: true }
    } else {
        IdleInfo { idle_ms: 0, input_active_recently: true }
    };

    // active app (level >= 1)
    let active_app = if perms.level >= 1 {
        #[cfg(target_os = "windows")]
        {
            windows_impl::get_active_app().map(|(name, cat, reason, source)| ActiveAppInfo {
                process_name: name,
                category: cat,
                classification_reason: reason,
                classification_source: source,
            })
        }
        #[cfg(not(target_os = "windows"))]
        None
    } else {
        None
    };

    // window title (level >= 1 && window_title_enabled)
    let active_window = if perms.level >= 1 && perms.window_title_enabled {
        #[cfg(target_os = "windows")]
        {
            let title = windows_impl::get_window_title();
            Some(ActiveWindowInfo { title_redacted: title, included: true })
        }
        #[cfg(not(target_os = "windows"))]
        Some(ActiveWindowInfo { title_redacted: None, included: false })
    } else {
        Some(ActiveWindowInfo { title_redacted: None, included: false })
    };

    // fullscreen
    let fullscreen_likely = if perms.level >= 1 {
        #[cfg(target_os = "windows")]
        { windows_impl::is_fullscreen_likely() }
        #[cfg(not(target_os = "windows"))]
        { false }
    } else {
        false
    };

    // folders (level >= 1 && folder_metadata_enabled)
    let include_filename_samples = perms.level >= 2 && perms.filenames_enabled && perms.filename_samples_enabled;
    let folders = if perms.level >= 1 && perms.folder_metadata_enabled {
        let sample_max_count = perms.filename_samples_max_count.clamp(0, 10);
        let desktop = get_desktop_path().and_then(|p| scan_folder(&p, "desktop", include_filename_samples, sample_max_count));
        let downloads = get_downloads_path().and_then(|p| scan_folder(&p, "downloads", include_filename_samples, sample_max_count));
        FolderSnapshots { desktop, downloads }
    } else {
        FolderSnapshots { desktop: None, downloads: None }
    };

    // system (sysinfo)
    let system = Some(get_system_info());

    // media: アクティブカテゴリとフルスクリーン状態から推定
    let active_cat = active_app.as_ref().map(|a: &ActiveAppInfo| a.category.as_str()).unwrap_or("unknown");
    let media = Some(detect_media(active_cat, fullscreen_likely));

    ObservationSnapshot {
        timestamp,
        idle,
        active_app,
        active_window,
        fullscreen_likely,
        folders,
        system,
        media,
        privacy: PrivacyMeta {
            permission_level: perms.level,
            title_included: perms.window_title_enabled,
            filenames_included: include_filename_samples,
            filename_samples_included: include_filename_samples,
            content_included: false,
            cloud_allowed: perms.cloud_allowed,
        },
    }
}

/// フォアグラウンドプロセス取得デバッグ — TransparencyPage から invoke 経由で呼ばれる
pub fn get_active_app_debug_info() -> ActiveAppDebugInfo {
    #[cfg(target_os = "windows")]
    { windows_impl::get_active_app_debug() }
    #[cfg(not(target_os = "windows"))]
    {
        ActiveAppDebugInfo {
            platform: "non-windows".to_string(),
            hwnd_available: false, hwnd_raw: 0,
            pid: 0, pid_available: false,
            open_process_ok: false, query_name_ok: false,
            process_name: String::new(), process_path_len: 0,
            category: "unknown".to_string(),
            classification_reason: "unsupported_platform".to_string(),
            classification_source: "system".to_string(),
            error_stage: "unsupported_platform".to_string(),
            error_code: 0, last_error_before: 0,
            is_self_app: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{classify_app, scan_folder};

    #[test]
    fn app_classification_table_covers_v1_3_targets() {
        let cases = [
            ("chatgpt.exe", "ai_chat"),
            ("claude.exe", "ai_assistant"),
            ("perplexity.exe", "ai_search"),
            ("cursor.exe", "ide"),
            ("windsurf.exe", "ide"),
            ("zed.exe", "ide"),
            ("obsidian.exe", "notes"),
            ("logseq.exe", "notes"),
            ("figma.exe", "design"),
            ("photoshop.exe", "design"),
            ("illustrator.exe", "design"),
            ("blender.exe", "design"),
            ("7zfm.exe", "archive_tool"),
            ("winrar.exe", "archive_tool"),
            ("bandizip.exe", "archive_tool"),
            ("bitwig.exe", "daw"),
            ("ableton live.exe", "daw"),
            ("reaper.exe", "daw"),
            ("code.exe", "ide"),
            ("wt.exe", "terminal"),
            ("chrome.exe", "browser"),
            ("discord.exe", "chat"),
            ("sumatrapdf.exe", "document"),
        ];

        for (process, expected) in cases {
            let (category, reason, source) = classify_app(process);
            assert_eq!(category, expected, "{process}");
            assert!(!reason.is_empty(), "{process}");
            assert_eq!(source, "built_in", "{process}");
        }
    }

    #[test]
    fn unknown_process_returns_reason() {
        let (category, reason, source) = classify_app("unknown-tool.exe");
        assert_eq!(category, "unknown");
        assert_eq!(source, "unknown");
        assert!(reason.contains("no_rule_match"));
    }

    #[test]
    fn filename_samples_are_explicit_and_limited() {
        let dir = std::env::temp_dir().join(format!(
            "amispi-filename-samples-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("first-visible-name.wav"), b"x").unwrap();
        std::fs::write(dir.join("second-visible-name.zip"), b"x").unwrap();
        std::fs::write(dir.join("third-hidden-name.txt"), b"x").unwrap();

        let hidden = scan_folder(&dir, "downloads", false, 2).unwrap();
        assert!(hidden.filename_samples.is_empty());

        let visible = scan_folder(&dir, "downloads", true, 2).unwrap();
        assert_eq!(visible.filename_samples.len(), 2);
        assert!(visible.filename_samples.iter().all(|name| name.contains("visible-name") || name.contains("hidden-name")));

        let _ = std::fs::remove_dir_all(&dir);
    }
}

/// 起動中のメディアアプリを検出してメディアコンテキストを返す
/// active_category: 現在フォアグラウンドのアプリ種別
/// fullscreen: 全画面中か
fn detect_media(active_category: &str, fullscreen: bool) -> MediaContext {
    use sysinfo::{ProcessRefreshKind, RefreshKind, System};

    const MUSIC_APPS: &[&str] = &[
        "spotify.exe", "musicbee.exe", "foobar2000.exe",
        "winamp.exe", "itunes.exe", "applemusic.exe", "tidal.exe",
        "aimp.exe", "mediamonkey.exe",
    ];
    const VIDEO_APPS: &[&str] = &[
        "vlc.exe", "mpc-hc.exe", "mpc-be.exe", "mpv.exe",
        "wmplayer.exe", "potplayer.exe", "potplayermini64.exe",
        "kmplayer.exe",
    ];

    // フォアグラウンドアプリがすでに明確な場合は即返す
    if active_category == "daw" {
        return MediaContext {
            audio_likely_active: true,
            media_kind: "music".into(),
            source_category: "daw".into(),
        };
    }
    if active_category == "music" {
        return MediaContext {
            audio_likely_active: true,
            media_kind: "music".into(),
            source_category: "music_app".into(),
        };
    }
    if active_category == "media" {
        let kind = if fullscreen { "video" } else { "music" }.to_string();
        return MediaContext {
            audio_likely_active: true,
            media_kind: kind,
            source_category: "video_app".into(),
        };
    }
    if active_category == "browser" && fullscreen {
        return MediaContext {
            audio_likely_active: true,
            media_kind: "video".into(),
            source_category: "browser".into(),
        };
    }

    // バックグラウンドプロセスをスキャン
    let sys = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()),
    );

    for (_, process) in sys.processes() {
        let name = process.name().to_string_lossy().to_lowercase();
        if MUSIC_APPS.iter().any(|m| name.as_str() == *m) {
            return MediaContext {
                audio_likely_active: true,
                media_kind: "music".into(),
                source_category: "music_app".into(),
            };
        }
        if VIDEO_APPS.iter().any(|v| name.as_str() == *v) {
            return MediaContext {
                audio_likely_active: true,
                media_kind: "video".into(),
                source_category: "video_app".into(),
            };
        }
    }

    MediaContext {
        audio_likely_active: false,
        media_kind: "none".into(),
        source_category: "none".into(),
    }
}

fn get_system_info() -> SystemInfo {
    use sysinfo::System;
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpu = if sys.cpus().is_empty() {
        None
    } else {
        let avg = sys.cpus().iter().map(|c| c.cpu_usage()).sum::<f32>() / sys.cpus().len() as f32;
        Some(avg)
    };

    let mem = if sys.total_memory() > 0 {
        Some(sys.used_memory() as f32 / sys.total_memory() as f32 * 100.0)
    } else {
        None
    };

    SystemInfo { cpu_load: cpu, memory_load: mem }
}

fn chrono_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // ISO8601 の簡易実装 (chrono dep なし)
    let s = secs % 60;
    let m = (secs / 60) % 60;
    let h = (secs / 3600) % 24;
    let days = secs / 86400;
    // 2000-01-01 を基準にした簡易日付
    let epoch_days = 10957u64; // 1970-01-01 → 2000-01-01
    let d = days + epoch_days;
    let year = 2000 + d / 365;
    let yd = d % 365;
    let month = yd / 30 + 1;
    let day = yd % 30 + 1;
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month.min(12), day.min(31), h, m, s)
}
