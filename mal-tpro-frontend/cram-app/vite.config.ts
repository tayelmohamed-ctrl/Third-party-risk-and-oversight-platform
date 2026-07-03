import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const partnerEntry = path.resolve(__dirname, 'partner/Mal_ThirdParty_Risk_Oversight_Platform.jsx')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@partner": partnerEntry,
    },
  },
  optimizeDeps: {
    include: ["recharts", "xlsx"],
  },
  server: {
    port: 5174,
    strictPort: true,
    open: false,
    fs: { allow: [repoRoot, path.resolve(__dirname, "./partner")] },
    proxy: {
      "/api": { target: "http://localhost:3010", changeOrigin: true },
      "/tpro-api": { target: "http://localhost:3001", changeOrigin: true, rewrite: (p) => p.replace(/^\/tpro-api/, "/api") },
    },
  },
})
