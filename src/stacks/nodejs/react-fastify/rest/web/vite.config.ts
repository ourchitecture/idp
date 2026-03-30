import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const bffPort = Number.parseInt(process.env.OUR_IDP_API_PORT ?? "8000", 10);
const bffTargetPort = Number.isNaN(bffPort) ? 8000 : bffPort;
const bffTargetHost = process.env.OUR_IDP_API_HOST?.trim() || "127.0.0.1";
const defaultHost = process.env.OUR_IDP_WEB_HOST?.trim() || "127.0.0.1";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

export default defineConfig({
  root: currentDir,
  plugins: [react()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }

          if (id.includes("node_modules/react-router")) {
            return "vendor-router";
          }

          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
        },
      },
    },
  },
  server: {
    host: defaultHost,
    proxy: {
      "/api": {
        target: `http://${bffTargetHost}:${bffTargetPort}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: defaultHost,
  },
});
