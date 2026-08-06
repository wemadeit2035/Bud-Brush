import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: false,
    // Ensure proper MIME types
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
  },
  // Add this to fix MIME types
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
