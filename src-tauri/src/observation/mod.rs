// 観測サービス
// Windows API でローカル情報を取得し、権限に応じてフィルタした snapshot を返す。
// 生データをそのまま返さない。パス・タイトルは権限チェック後のみ含める。

use serde::Serialize;
use std::collections::HashMap;

// ──────────────────────────────────────────
// 型定義 (TypeScript 側の ObservationSnapshot と対応)
// ──────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct IdleInfo {
    pub idle_ms: u64,
    pub input_active_recently: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct ActiveAppInfo {
    pub process_name: String,
    pub category: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ActiveWindowInfo {
    pub title_redacted: Option<String>,
    pub included: bool,
}

#[derive(Debug, Serialize, Clone)]
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
}

#[derive(Debug, Serialize, Clone)]
pub struct FolderSnapshots {
    pub desktop: Option<FolderSummary>,
    pub downloads: Option<FolderSummary>,
}

#[derive(Debug, Serialize, Clone)]
pub struct SystemInfo {
    pub cpu_load: Option<f32>,
    pub memory_load: Option<f32>,
}

#[derive(Debug, Serialize, Clone)]
pub struct PrivacyMeta {
    pub permission_level: u8,
    pub title_included: bool,
    pub filenames_included: bool,
    pub content_included: bool,
    pub cloud_allowed: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct ObservationSnapshot {
    pub timestamp: String,
    pub idle: IdleInfo,
    pub active_app: Option<ActiveAppInfo>,
    pub active_window: Option<ActiveWindowInfo>,
    pub fullscreen_likely: bool,
    pub folders: FolderSnapshots,
    pub system: Option<SystemInfo>,
    pub privacy: PrivacyMeta,
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
    pub cloud_allowed: bool,
}

impl Default for PermissionConfig {
    fn default() -> Self {
        Self {
            level: 1,
            window_title_enabled: false,
            folder_metadata_enabled: true,
            filenames_enabled: false,
            cloud_allowed: false,
        }
    }
}

// ──────────────────────────────────────────
// Windows 実装
// ──────────────────────────────────────────

#[cfg(target_os = "windows")]
mod windows_impl {
    use super::*;
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use windows_sys::Win32::{
        Foundation::{CloseHandle, BOOL, HANDLE, MAX_PATH},
        Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST},
        System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
            PROCESS_QUERY_LIMITED_INFORMATION,
        },
        UI::WindowsAndMessaging::{
            GetForegroundWindow, GetLastInputInfo, GetWindowRect, GetWindowTextLengthW,
            GetWindowTextW, GetWindowThreadProcessId, LASTINPUTINFO,
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

    pub fn get_active_app() -> Option<(String, String)> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd == 0 { return None; }

            let mut pid: u32 = 0;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid == 0 { return None; }

            let handle: HANDLE = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if handle == 0 { return None; }

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

            let category = classify_app(&process_name);
            Some((process_name, category))
        }
    }

    pub fn get_window_title() -> Option<String> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd == 0 { return None; }
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
            if hwnd == 0 { return false; }

            let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
            if monitor == 0 { return false; }

            let mut mi = MONITORINFO {
                cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                rcMonitor: Default::default(),
                rcWork: Default::default(),
                dwFlags: 0,
            };
            if GetMonitorInfoW(monitor, &mut mi) == 0 { return false; }

            let mut rect: windows_sys::Win32::Foundation::RECT = Default::default();
            if GetWindowRect(hwnd, &mut rect) == 0 { return false; }

            let mon = mi.rcMonitor;
            rect.left <= mon.left
                && rect.top <= mon.top
                && rect.right >= mon.right
                && rect.bottom >= mon.bottom
        }
    }

    fn classify_app(name: &str) -> String {
        if ["code.exe", "cursor.exe", "idea64.exe", "devenv.exe", "rider64.exe", "clion64.exe", "pycharm64.exe", "webstorm64.exe", "phpstorm64.exe"].contains(&name) {
            return "ide".to_string();
        }
        if ["chrome.exe", "firefox.exe", "msedge.exe", "brave.exe", "vivaldi.exe", "opera.exe", "arc.exe"].contains(&name) {
            return "browser".to_string();
        }
        if ["vlc.exe", "mpc-hc.exe", "mpc-be.exe", "mpv.exe", "wmplayer.exe", "netflix.exe", "youtube.exe"].contains(&name) {
            return "media".to_string();
        }
        if name.ends_with("game") || ["steam.exe", "epicgameslauncher.exe", "gog galaxy.exe"].contains(&name) {
            return "game".to_string();
        }
        if ["ableton live.exe", "fl.exe", "bitwig.exe", "reaper.exe", "logic.exe"].contains(&name) {
            return "daw".to_string();
        }
        if ["winword.exe", "excel.exe", "powerpnt.exe", "soffice.exe", "keynote.exe"].contains(&name) {
            return "office".to_string();
        }
        if ["cmd.exe", "powershell.exe", "pwsh.exe", "wt.exe", "windowsterminal.exe", "alacritty.exe"].contains(&name) {
            return "terminal".to_string();
        }
        "unknown".to_string()
    }
}

// GetTickCount64 は SystemInformation feature が必要
#[cfg(target_os = "windows")]
impl windows_sys::Win32::System::SystemInformation::GetTickCount64 {}

// ──────────────────────────────────────────
// フォルダスキャン (クロスプラットフォーム)
// ──────────────────────────────────────────

fn scan_folder(path: &std::path::Path, kind: &str) -> Option<FolderSummary> {
    if !path.exists() { return None; }

    let mut file_count = 0usize;
    let mut dir_count = 0usize;
    let mut total_size = 0u64;
    let mut ext_counts: HashMap<String, usize> = HashMap::new();
    let mut recent_count = 0usize;

    let cutoff = std::time::SystemTime::now()
        .checked_sub(std::time::Duration::from_secs(7 * 24 * 3600))
        .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

    // depth 1 のみスキャン (パフォーマンス保護)
    let Ok(entries) = std::fs::read_dir(path) else { return None; };

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

        if let Ok(modified) = meta.modified() {
            if modified > cutoff { recent_count += 1; }
        }
    }

    let img_exts = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];
    let screenshot_pile = ext_counts.get("png").copied().unwrap_or(0) > 10;
    let image_pile = img_exts.iter().map(|e| ext_counts.get(*e).copied().unwrap_or(0)).sum::<usize>() > 15;
    let audio_pile = ["mp3", "wav", "flac", "aac", "ogg"].iter()
        .map(|e| ext_counts.get(*e).copied().unwrap_or(0)).sum::<usize>() > 5;

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
            windows_impl::get_active_app().map(|(name, cat)| ActiveAppInfo {
                process_name: name,
                category: cat,
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
    let folders = if perms.level >= 1 && perms.folder_metadata_enabled {
        let desktop = get_desktop_path().and_then(|p| scan_folder(&p, "desktop"));
        let downloads = get_downloads_path().and_then(|p| scan_folder(&p, "downloads"));
        FolderSnapshots { desktop, downloads }
    } else {
        FolderSnapshots { desktop: None, downloads: None }
    };

    // system (sysinfo)
    let system = Some(get_system_info());

    ObservationSnapshot {
        timestamp,
        idle,
        active_app,
        active_window,
        fullscreen_likely,
        folders,
        system,
        privacy: PrivacyMeta {
            permission_level: perms.level,
            title_included: perms.window_title_enabled,
            filenames_included: perms.filenames_enabled,
            content_included: false,
            cloud_allowed: perms.cloud_allowed,
        },
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

// Windows の SystemInformation を使うための feature 追加
#[cfg(target_os = "windows")]
mod sys_info_feature {
    use windows_sys::Win32::System::SystemInformation::GetTickCount64;
}
