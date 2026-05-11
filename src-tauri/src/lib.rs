use tauri::{Manager, Runtime};
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
// アップデーター
// ネットワークエラー・設定未完了の場合は None を返してサイレントに失敗する
// ──────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, Clone)]
pub struct UpdateInfo {
    /// 利用可能な新バージョン文字列 (例: "0.2.0")
    pub version: String,
    /// リリースノート (Markdown 可)
    pub body: Option<String>,
}

/// アップデートがあれば UpdateInfo を返す。なければ None。
/// エラー時もサイレントに None を返す（オフライン時でもアプリが動くように）。
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
/// 失敗してもエラーを無視してアプリは継続する。
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
        .download_and_install(
            |_chunk, _total| { /* 進捗は将来 Tauri イベントで通知する */ },
            || { /* ダウンロード完了コールバック */ },
        )
        .await
        .map_err(|e| e.to_string())?;

    // Windows NSIS passive モード: インストール完了後にアプリを再起動
    app.restart();
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let window = app.get_webview_window("companion").unwrap();

            #[cfg(debug_assertions)]
            window.open_devtools();

            // 初期位置: 右下隅に配置
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

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_ignore_cursor_events,
            move_window,
            get_app_version,
            check_for_updates,
            install_update,
        ])
        .run(tauri::generate_context!())
        .expect("AmitySpirit Companion の起動に失敗しました");
}
