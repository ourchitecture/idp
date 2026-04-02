import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const bffPort = Number.parseInt(process.env.OUR_IDP_API_PORT ?? "8000", 10);
const bffTargetPort = Number.isNaN(bffPort) ? 8000 : bffPort;
const bffTargetHost = process.env.OUR_IDP_API_HOST?.trim() || "127.0.0.1";
const defaultHost = process.env.OUR_IDP_WEB_HOST?.trim() || "127.0.0.1";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const HEALTH_RESPONSE = JSON.stringify({
  status: "pass",
  serviceId: "idp-web",
  description: "IDP Web Server",
});

function healthEndpointPlugin(): Plugin {
  return {
    name: "idp-health-endpoint",
    configureServer(server) {
      server.middlewares.use("/health", (_req, res) => {
        res.setHeader("Content-Type", "application/health+json; charset=utf-8");
        res.writeHead(200);
        res.end(HEALTH_RESPONSE);
      });
    },
  };
}

export default defineConfig({
  root: currentDir,
  plugins: [healthEndpointPlugin(), react()],
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
