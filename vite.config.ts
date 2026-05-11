import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri の開発サーバー設定
// https://v2.tauri.app/reference/javascript/api/namespacepath/
export default defineConfig(async () => ({
  plugins: [react()],
  // Tauri CLI が使用するホスト/ポートを固定する
  server: {
    port: 1420,
    strictPort: true,
    host: "localhost",
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 1420,
    },
    watch: {
      // Tauri がウォッチするファイルをすべて対象にする
      ignored: ["**/src-tauri/**"],
    },
  },
}));
