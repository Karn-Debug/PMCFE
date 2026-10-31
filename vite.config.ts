import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: ["batting-drier-ambiguity.ngrok-free.dev"],
    proxy: { "/api": "http://127.0.0.1:4000" },
  },
  build: { chunkSizeWarningLimit: 800 },
});
