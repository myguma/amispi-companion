use tauri::{Manager, Runtime};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_updater::UpdaterExt;

// ウィンドウのクリックスルーを切り替えるコマンド
#[tauri::command]
fn set_ignore_cursor_events<R: Runtime>(
    window: tauri::Window<R>,
    ignore: bool,
) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

// ウィンドウを指定座標に移動する
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

// アプリバージョンを返す
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ──────────────────────────────────────────────────────────
// 自動起動
// ──────────────────────────────────────────────────────────

/// Windows スタートアップへの登録を切り替える
#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let autolaunch = app.autolaunch();
    if enabled {
        autolaunch.enable().map_err(|e| e.to_string())
    } else {
        autolaunch.disable().map_err(|e| e.to_string())
    }
}

/// 自動起動が有効かどうかを返す
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

/// アップデートがあれば UpdateInfo を返す。なければ None。
#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Option<UpdateInfo> {
    let updater = app.updater_builder().build().ok()?;
    let update = updater.check().await.ok()??;
    Some(UpdateInfo {
        version: update.version.clone(),
        body: update.body.clone(),
    })
}

/// アップデートをダウンロードしてインストールし、アプリを再起動する。
#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app
        .updater_builder()
        .build()
        .map_err(|e| e.to_string())?;

    let Some(update) = updater.check().await.map_err(|e| e.to_string())? else {
        return Ok(());
    };

    update
        .download_and_install(|_chunk, _total| {}, || {})
        .await
        .map_err(|e| e.to_string())?;

    app.restart();
}

// ──────────────────────────────────────────────────────────
// アプリエントリーポイント
// ──────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            // macOS 用設定。Windows では無視されるが引数として必要
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let window = app.get_webview_window("companion").unwrap();

            #[cfg(debug_assertions)]
            window.open_devtools();

            // 初期位置: 右下隅
            if let Some(monitor) = window.current_monitor().ok().flatten() {
                let screen_size = monitor.size();
                let window_size = window.outer_size().unwrap_or(tauri::PhysicalSize {
                    width: 200,
                    height: 300,
                });
                let margin = 20i32;
                let x = (screen_size.width as i32) - (window_size.width as i32) - margin;
                let y = (screen_size.height as i32) - (window_size.height as i32) - margin;
                let _ = window.set_position(tauri::Position::Physical(
                    tauri::PhysicalPosition { x, y },
                ));
            }

            // 初回インストール時にスタートアップ登録を有効にする
            // すでに登録済みの場合は何もしない
            let autolaunch = app.autolaunch();
            if !autolaunch.is_enabled().unwrap_or(true) {
                let _ = autolaunch.enable();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_ignore_cursor_events,
            move_window,
            get_app_version,
            set_autostart,
            is_autostart_enabled,
            check_for_updates,
            install_update,
        ])
        .run(tauri::generate_context!())
        .expect("AmitySpirit Companion startup failed");
}
