use std::sync::atomic::{AtomicBool, Ordering};
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
// ウィンドウリサイズ (吹き出し表示/非表示で動的変更)
// ──────────────────────────────────────────────────────────

/// キャラクター領域の論理ピクセル高さ (吹き出し非表示時のウィンドウ高さ)。
/// 160px スプライト + 状態アニメーションの上下余白 + 下端パディングを収める。
const CHAR_WINDOW_H_LOGICAL: f64 = 280.0;
/// 吹き出し領域の論理ピクセル高さ
const BUBBLE_WINDOW_H_LOGICAL: f64 = 130.0;
const COMPANION_WINDOW_W_LOGICAL: f64 = 200.0;
const MIN_SIZE_SCALE: f64 = 0.75;
const MAX_SIZE_SCALE: f64 = 1.5;
#[cfg(windows)]
const CHARACTER_SPRITE_W_LOGICAL: f64 = 160.0;
#[cfg(windows)]
const CHARACTER_SPRITE_H_LOGICAL: f64 = 160.0;
#[cfg(windows)]
const CHARACTER_BOTTOM_PAD_LOGICAL: f64 = 24.0;
#[cfg(windows)]
const SPEECH_BUBBLE_GAP_LOGICAL: f64 = 8.0;
#[cfg(windows)]
const SPEECH_BUBBLE_HIT_H_LOGICAL: f64 = 96.0;
#[cfg(windows)]
const UPDATE_BADGE_GAP_LOGICAL: f64 = 4.0;
#[cfg(windows)]
const UPDATE_BADGE_HIT_W_LOGICAL: f64 = 96.0;
#[cfg(windows)]
const UPDATE_BADGE_HIT_H_LOGICAL: f64 = 28.0;

static CONTEXT_MENU_VISIBLE: AtomicBool = AtomicBool::new(false);
static UPDATE_BADGE_VISIBLE: AtomicBool = AtomicBool::new(false);

fn normalized_size_scale(value: Option<f64>) -> f64 {
    let n = value.unwrap_or(1.0);
    if n.is_finite() {
        n.clamp(MIN_SIZE_SCALE, MAX_SIZE_SCALE)
    } else {
        1.0
    }
}

fn clamp_position_to_work_area(
    window: &tauri::WebviewWindow,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> (i32, i32) {
    let Some(monitor) = window.current_monitor().ok().flatten() else {
        return (x.max(0), y.max(0));
    };
    let area = monitor.work_area();
    let min_x = area.position.x;
    let min_y = area.position.y;
    let max_x = (area.position.x + area.size.width as i32 - width as i32).max(min_x);
    let max_y = (area.position.y + area.size.height as i32 - height as i32).max(min_y);
    (x.clamp(min_x, max_x), y.clamp(min_y, max_y))
}

#[cfg(debug_assertions)]
fn log_resize_companion(
    phase: &str,
    window: &tauri::WebviewWindow,
    speech_visible: bool,
    size_scale: Option<f64>,
    target_w: u32,
    target_h: u32,
    char_bottom: i32,
    new_x: i32,
    new_y: i32,
) {
    eprintln!(
        "[resize_companion:{phase}] speech_visible={speech_visible} size_scale={size_scale:?} scale_factor={:?} outer_pos={:?} outer_size={:?} inner_pos={:?} inner_size={:?} target=({target_w},{target_h}) char_bottom={char_bottom} new=({new_x},{new_y})",
        window.scale_factor(),
        window.outer_position(),
        window.outer_size(),
        window.inner_position(),
        window.inner_size(),
    );
}

/// 吹き出し表示状態に応じてウィンドウをリサイズする
/// scale_factor() で論理→物理ピクセルを変換してから設定するため DPI に対応する
/// キャラクター底辺の位置を固定してリサイズするため、画面上の位置が維持される
#[tauri::command]
async fn resize_companion(
    app: tauri::AppHandle,
    speech_visible: bool,
    size_scale: Option<f64>,
) -> Result<(), String> {
    let window = app
        .get_webview_window("companion")
        .ok_or_else(|| "companion window not found".to_string())?;
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;
    let scale = window.scale_factor().unwrap_or(1.0);
    let ui_scale = normalized_size_scale(size_scale);

    let target_w = (COMPANION_WINDOW_W_LOGICAL * ui_scale * scale).round() as u32;
    let char_h = (CHAR_WINDOW_H_LOGICAL * ui_scale * scale).round() as u32;
    let bubble_h = (BUBBLE_WINDOW_H_LOGICAL * ui_scale * scale).round() as u32;
    let target_h = if speech_visible {
        char_h + bubble_h
    } else {
        char_h
    };

    // キャラクター底辺 (= ウィンドウ下端) を画面上で固定する。
    // その後 work_area 内に clamp し、旧バージョンで保存された小さいwindow用の座標でも
    // 下端が画面外へ沈まないようにする。
    let char_bottom = pos.y + size.height as i32;
    let (new_x, new_y) = clamp_position_to_work_area(
        &window,
        pos.x,
        char_bottom - target_h as i32,
        target_w,
        target_h,
    );

    #[cfg(debug_assertions)]
    log_resize_companion(
        "before",
        &window,
        speech_visible,
        size_scale,
        target_w,
        target_h,
        char_bottom,
        new_x,
        new_y,
    );

    let target_size = tauri::Size::Physical(tauri::PhysicalSize {
        width: target_w,
        height: target_h,
    });
    let target_pos = tauri::Position::Physical(tauri::PhysicalPosition { x: new_x, y: new_y });

    if target_h > size.height {
        // 拡大時に先に size を変えると、一瞬 window bottom が下へ伸びてキャラが沈む。
        // top-left を先に上へ移動してから拡大し、visual bottom を固定する。
        window.set_position(target_pos).map_err(|e| e.to_string())?;
        window.set_size(target_size).map_err(|e| e.to_string())?;
    } else {
        // 縮小時は先に小さくしてから位置を戻す方が、上側の吹き出し領域を自然に畳める。
        window.set_size(target_size).map_err(|e| e.to_string())?;
        window.set_position(target_pos).map_err(|e| e.to_string())?;
    }

    #[cfg(debug_assertions)]
    log_resize_companion(
        "after",
        &window,
        speech_visible,
        size_scale,
        target_w,
        target_h,
        char_bottom,
        new_x,
        new_y,
    );
    Ok(())
}

// ──────────────────────────────────────────────────────────
// Ollama ローカルAPI プロキシ (CORS回避のため Rust 側から HTTP)
// ──────────────────────────────────────────────────────────

/// Ollama /api/tags を Rust 側から叩いてモデル一覧 JSON を返す
/// WebView2 の CORS 制限を回避するためにサーバーサイドリクエストとして実行する
#[tauri::command]
async fn ollama_list_models(base_url: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let url = format!("{}/api/tags", base_url.trim_end_matches('/'));
        let resp = ureq::get(&url)
            .timeout(std::time::Duration::from_secs(6))
            .call()
            .map_err(|e| e.to_string())?;
        resp.into_string().map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Ollama /api/chat を Rust 側から叩いてレスポンス JSON を返す
/// system / user メッセージと model を受け取り、stream=false で POST する
#[tauri::command]
async fn ollama_chat(
    base_url: String,
    model: String,
    system: String,
    user: String,
    timeout_ms: u64,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let url = format!("{}/api/chat", base_url.trim_end_matches('/'));
        let body = serde_json::json!({
            "model": model,
            "stream": false,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user",   "content": user   }
            ],
            "options": { "temperature": 0.5, "num_predict": 60 }
        });
        let resp = ureq::post(&url)
            .timeout(std::time::Duration::from_millis(timeout_ms))
            .send_json(body)
            .map_err(|e| e.to_string())?;
        resp.into_string().map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

// ──────────────────────────────────────────────────────────
// Active App デバッグ
// ──────────────────────────────────────────────────────────

#[tauri::command]
async fn get_active_app_debug() -> observation::ActiveAppDebugInfo {
    tokio::task::spawn_blocking(observation::get_active_app_debug_info)
        .await
        .unwrap_or_else(|_| observation::get_active_app_debug_info())
}

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

            // 透明な WebView 矩形全体ではなく、実際に触れる UI 付近だけを有効化する。
            // これによりキャラ画像の透明余白や上部の透明領域では背面をクリックできる。
            let in_window = cx >= pos.x
                && cx < pos.x + size.width as i32
                && cy >= pos.y
                && cy < pos.y + size.height as i32;
            let interactive = if in_window {
                if CONTEXT_MENU_VISIBLE.load(Ordering::Relaxed) {
                    true
                } else {
                    let scale = window.scale_factor().unwrap_or(1.0);
                    let ui_scale = (size.width as f64 / (COMPANION_WINDOW_W_LOGICAL * scale))
                        .clamp(MIN_SIZE_SCALE, MAX_SIZE_SCALE);
                    let lx = (cx - pos.x) as f64;
                    let ly = (cy - pos.y) as f64;
                    let char_h = CHAR_WINDOW_H_LOGICAL * ui_scale * scale;
                    let sprite_w = CHARACTER_SPRITE_W_LOGICAL * ui_scale * scale;
                    let sprite_h = CHARACTER_SPRITE_H_LOGICAL * ui_scale * scale;
                    let bottom_pad = CHARACTER_BOTTOM_PAD_LOGICAL * ui_scale * scale;
                    let bubble_gap = SPEECH_BUBBLE_GAP_LOGICAL * ui_scale * scale;
                    let bubble_hit_h = SPEECH_BUBBLE_HIT_H_LOGICAL * ui_scale * scale;
                    let update_badge_gap = UPDATE_BADGE_GAP_LOGICAL * ui_scale * scale;
                    let update_badge_w = UPDATE_BADGE_HIT_W_LOGICAL * ui_scale * scale;
                    let update_badge_h = UPDATE_BADGE_HIT_H_LOGICAL * ui_scale * scale;
                    let unit = ui_scale * scale;
                    let speech_visible = size.height as f64 > char_h + (8.0 * unit);

                    let char_top = size.height as f64 - bottom_pad - sprite_h;
                    let center_x = (COMPANION_WINDOW_W_LOGICAL * ui_scale * scale) / 2.0;

                    let bubble_bottom = char_top - bubble_gap;
                    let bubble_top = (bubble_bottom - bubble_hit_h).max(0.0);
                    let bubble_hit = speech_visible
                        && ly >= bubble_top
                        && ly <= bubble_bottom + (10.0 * unit)
                        && lx >= 8.0 * unit
                        && lx <= size.width as f64 - 8.0 * unit;

                    let update_badge_bottom = char_top - update_badge_gap;
                    let update_badge_top = update_badge_bottom - update_badge_h;
                    let update_badge_left = center_x - update_badge_w / 2.0;
                    let update_badge_right = center_x + update_badge_w / 2.0;
                    let update_badge_hit = UPDATE_BADGE_VISIBLE.load(Ordering::Relaxed)
                        && ly >= update_badge_top
                        && ly <= update_badge_bottom
                        && lx >= update_badge_left
                        && lx <= update_badge_right;

                    let center_y = char_top + sprite_h * 0.52;
                    let rx = sprite_w * 0.39;
                    let ry = sprite_h * 0.46;
                    let dx = (lx - center_x) / rx;
                    let dy = (ly - center_y) / ry;
                    let character_hit = dx * dx + dy * dy <= 1.0;

                    bubble_hit || character_hit || update_badge_hit
                }
            } else {
                false
            };
            let ignore = !interactive;
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
fn set_context_menu_visible(visible: bool) {
    CONTEXT_MENU_VISIBLE.store(visible, Ordering::Relaxed);
}

#[tauri::command]
fn set_update_badge_visible(visible: bool) {
    UPDATE_BADGE_VISIBLE.store(visible, Ordering::Relaxed);
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
    let (save_x, save_y) = if let Some(window) = app.get_webview_window("companion") {
        let size = window.outer_size().unwrap_or(tauri::PhysicalSize { width: 200, height: 280 });
        let clamped = clamp_position_to_work_area(&window, x, y, size.width, size.height);
        if clamped != (x, y) {
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: clamped.0,
                y: clamped.1,
            }));
        }
        clamped
    } else {
        (x, y)
    };
    s.window_x = Some(save_x);
    s.window_y = Some(save_y);
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
            let saved = settings::load_settings(&app.handle());
            let restored = if let (Some(sx), Some(sy)) = (saved.window_x, saved.window_y) {
                // 画面外補正: 明らかにおかしな値は無視
                if sx > -500 && sy > -500 && sx < 10_000 && sy < 10_000 {
                    let size = window.outer_size().unwrap_or(tauri::PhysicalSize { width: 200, height: 280 });
                    let (rx, ry) = clamp_position_to_work_area(&window, sx, sy, size.width, size.height);
                    let _ = window.set_position(tauri::Position::Physical(
                        tauri::PhysicalPosition { x: rx, y: ry },
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
                    let area = monitor.work_area();
                    let win = window.outer_size().unwrap_or(tauri::PhysicalSize { width: 200, height: 280 });
                    let margin = 20i32;
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                        x: area.position.x + area.size.width as i32 - win.width as i32 - margin,
                        y: area.position.y + area.size.height as i32 - win.height as i32 - margin,
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
            set_context_menu_visible,
            set_update_badge_visible,
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
            save_window_position,
            resize_companion,
            ollama_list_models,
            ollama_chat,
            get_active_app_debug,
        ])
        .run(tauri::generate_context!())
        .expect("AmitySpirit Companion startup failed");
}
