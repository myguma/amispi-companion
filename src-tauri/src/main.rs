// Windows リリースビルドでコンソールウィンドウを非表示にする
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    amispi_companion_lib::run()
}
