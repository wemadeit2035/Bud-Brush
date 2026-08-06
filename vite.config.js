import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: false,
    // ✅ Critical: Ensure assets are properly handled
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
  },
  // ✅ Add this to ensure proper MIME types
  server: {
    port: 5173,
    headers: {
      "Content-Type": "application/javascript",
    },
  },
});
