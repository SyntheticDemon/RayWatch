import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const apiTarget = process.env.RAYWATCH_API_PROXY ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: apiProxy(),
  },
  preview: {
    proxy: apiProxy(),
  },
});

function apiProxy() {
  return {
    "/api": {
      target: apiTarget,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/api/, ""),
    },
    "/ws": {
      target: apiTarget,
      changeOrigin: true,
      ws: true,
    },
  };
}
