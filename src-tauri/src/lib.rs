use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_updater::UpdaterExt;

mod observation;
mod settings;

// ──────────────────────────────────────────────────────────
// クリックスルー制御
// ──────────────────────────────────────────────────────────

#[cfg(windows)]
fn cursor_pos() -> Option<(i32, i32)> {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut pt = POINT { x: 0, y: 0 };
    unsafe {
        if GetCursorPos(&mut pt) != 0 { Some((pt.x, pt.y)) } else { None }
    }
}

#[cfg(windows)]
fn start_hit_test_thread(window: tauri::WebviewWindow) {
    std::thread::spawn(move || {
        let mut last_ignore = true;
        loop {
            std::thread::sleep(std::time::Duration::from_millis(16));
            let Some((cx, cy)) = cursor_pos() else { continue };
            let Ok(pos) = window.outer_position() else { continue };
            let Ok(size) = window.outer_size() else { continue };
            let in_window = cx >= pos.x
                && cx < pos.x + size.width as i32
                && cy >= pos.y
                && cy < pos.y + size.height as i32;
            let ignore = !in_window;
            if ignore != last_ignore {
                let _ = window.set_ignore_cursor_events(ignore);
                last_ignore = ignore;
            }
        }
    });
}

#[tauri::command]
fn set_ignore_cursor_events<R: Runtime>(
    window: tauri::Window<R>,
    ignore: bool,
) -> Result<(), String> {
    window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())
}

#[tauri::command]
fn move_window<R: Runtime>(
    window: tauri::Window<R>,
    x: i32,
    y: i32,
) -> Result<(), String> {
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

fn toggle_window_visibility(window: &tauri::WebviewWindow) {
    let visible = window.is_visible().unwrap_or(false);
    if visible { let _ = window.hide(); }
    else { let _ = window.show(); let _ = window.set_focus(); }
}

// ──────────────────────────────────────────────────────────
// 設定ウィンドウ
// ──────────────────────────────────────────────────────────

#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }
    tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("index.html?page=settings".into()),
    )
    .title("AmitySpirit 設定")
    .inner_size(520.0, 640.0)
    .resizable(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ──────────────────────────────────────────────────────────
// 自動起動
// ──────────────────────────────────────────────────────────

#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let al = app.autolaunch();
    if enabled { al.enable().map_err(|e| e.to_string()) }
    else { al.disable().map_err(|e| e.to_string()) }
}

#[tauri::command]
fn is_autostart_enabled(app: tauri::AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

// ──────────────────────────────────────────────────────────
// アップデーター
// ──────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub body: Option<String>,
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Option<UpdateInfo> {
    let updater = app.updater_builder().build().ok()?;
    let update = updater.check().await.ok()??;
    Some(UpdateInfo { version: update.version.clone(), body: update.body.clone() })
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater_builder().build().map_err(|e| e.to_string())?;
    let Some(update) = updater.check().await.map_err(|e| e.to_string())? else {
        return Ok(());
    };
    update.download_and_install(|_chunk, _total| {}, || {}).await.map_err(|e| e.to_string())?;
    app.restart();
}

// ──────────────────────────────────────────────────────────
// 観測 API
// ──────────────────────────────────────────────────────────

#[tauri::command]
async fn get_observation_snapshot(
    perms: observation::PermissionConfig,
) -> observation::ObservationSnapshot {
    // ファイルスキャンは blocking なので spawn_blocking を使う
    tokio::task::spawn_blocking(move || observation::build_snapshot(&perms))
        .await
        .unwrap_or_else(|_| observation::build_snapshot(&observation::PermissionConfig::default()))
}

// ──────────────────────────────────────────────────────────
// 設定の保存・読み込み
// ──────────────────────────────────────────────────────────

#[tauri::command]
fn load_settings(app: tauri::AppHandle) -> settings::PersistedSettings {
    settings::load_settings(&app)
}

#[tauri::command]
fn save_settings_cmd(
    app: tauri::AppHandle,
    s: settings::PersistedSettings,
) -> Result<(), String> {
    settings::save_settings(&app, &s)
}

#[tauri::command]
fn save_window_position(app: tauri::AppHandle, x: i32, y: i32) -> Result<(), String> {
    let mut s = settings::load_settings(&app);
    s.window_x = Some(x);
    s.window_y = Some(y);
    settings::save_settings(&app, &s)
}

// ──────────────────────────────────────────────────────────
// エントリーポイント
// ──────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let window = app.get_webview_window("companion").unwrap();

            #[cfg(debug_assertions)]
            window.open_devtools();

            // 初期位置: 保存済み位置があれば復元、なければ右下隅
            let saved = settings::load_settings(app);
            let restored = if let (Some(sx), Some(sy)) = (saved.window_x, saved.window_y) {
                // 画面外補正: 明らかにおかしな値は無視
                if sx > -500 && sy > -500 && sx < 10_000 && sy < 10_000 {
                    let _ = window.set_position(tauri::Position::Physical(
                        tauri::PhysicalPosition { x: sx, y: sy },
                    ));
                    true
                } else {
                    false
                }
            } else {
                false
            };

            if !restored {
                if let Some(monitor) = window.current_monitor().ok().flatten() {
                    let screen = monitor.size();
                    let win = window.outer_size().unwrap_or(tauri::PhysicalSize { width: 200, height: 300 });
                    let margin = 20i32;
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                        x: screen.width as i32 - win.width as i32 - margin,
                        y: screen.height as i32 - win.height as i32 - margin,
                    }));
                }
            }

            let _ = window.set_ignore_cursor_events(true);
            #[cfg(windows)]
            start_hit_test_thread(window.clone());

            // 初回スタートアップ登録
            let al = app.autolaunch();
            if !al.is_enabled().unwrap_or(true) { let _ = al.enable(); }

            // グローバルショートカット
            let shortcut_window = window.clone();
            app.global_shortcut().on_shortcut("ctrl+shift+space", move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    toggle_window_visibility(&shortcut_window);
                }
            })?;

            // システムトレイ
            let toggle_item = MenuItem::with_id(app, "toggle", "表示 / 非表示", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "設定...", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&toggle_item, &settings_item, &quit_item])?;

            let tray_window = window.clone();
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("AmitySpirit")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(move |_tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        toggle_window_visibility(&tray_window);
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(w) = app.get_webview_window("companion") {
                            toggle_window_visibility(&w);
                        }
                    }
                    "settings" => {
                        let app2 = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = open_settings_window(app2).await;
                        });
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_ignore_cursor_events,
            move_window,
            get_app_version,
            quit_app,
            set_autostart,
            is_autostart_enabled,
            check_for_updates,
            install_update,
            get_observation_snapshot,
            open_settings_window,
            load_settings,
            save_settings_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("AmitySpirit Companion startup failed");
}
