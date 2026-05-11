use tauri::{Manager, Runtime};

// ウィンドウのクリックスルーを切り替えるコマンド
// 透明エリアでマウスイベントを無視するかどうかを制御する
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

// アプリケーションのバージョン情報を返す
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("companion").unwrap();

            // 開発モードではデバッグツールを開く
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
        ])
        .run(tauri::generate_context!())
        .expect("AmitySpirit Companion の起動に失敗しました");
}
