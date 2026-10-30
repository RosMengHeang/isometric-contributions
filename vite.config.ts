import { defineConfig, type ProxyOptions } from "vite"
import react from "@vitejs/plugin-react"

const githubProxy: Record<string, ProxyOptions> = {
  "/api/github": {
    target: "https://github.com",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/github/, "/users"),
    configure: (proxy) => {
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.setHeader("user-agent", "isometric-contributions")
        proxyReq.setHeader("accept", "text/html")
      })
    },
  },
}

export default defineConfig({
  plugins: [react()],
  // dist/ holds the published library build.
  build: { outDir: "demo-dist" },
  server: { port: 5173, proxy: githubProxy },
  preview: { port: 4173, proxy: githubProxy },
})
