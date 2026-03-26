import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import httpProxy from "http-proxy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function dotProxyToColyseus(): Plugin {
  return {
    name: "dot-proxy-to-colyseus",
    enforce: "pre",
    configureServer(server) {
      const proxy = httpProxy.createProxyServer({
        target: "http://127.0.0.1:2567",
        ws: true,
        changeOrigin: true,
      });

      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/.proxy")) {
          return next();
        }
        req.url = url.replace(/^\/\.proxy/, "") || "/";
        proxy.web(req, res, {}, (err) => {
          if (err) next(err);
        });
      });

      const httpServer = server.httpServer;
      if (httpServer) {
        httpServer.prependListener("upgrade", (req, socket, head) => {
          const url = req.url ?? "";
          if (!url.startsWith("/.proxy")) {
            return;
          }
          req.url = url.replace(/^\/\.proxy/, "") || "/";
          proxy.ws(req, socket, head);
        });
      }
    },
  };
}

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  plugins: [react(), dotProxyToColyseus()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:2567",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:2567",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  envPrefix: "VITE_",
});
