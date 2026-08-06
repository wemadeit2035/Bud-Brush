import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
  // ✅ Add this to ensure Tailwind is processed
  css: {
    postcss: "./postcss.config.js",
  },
});
