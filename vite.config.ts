import 'dotenv/config'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Match Express (`server/index.js` uses `process.env.PORT || 3001`). Override host with VITE_API_PROXY_TARGET. */
const apiTarget =
  process.env.VITE_API_PROXY_TARGET?.trim() ||
  `http://127.0.0.1:${process.env.PORT || '3001'}`

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  // Same as dev: without this, `vite preview` serves index.html for /api/* → JSON parse errors
  preview: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
})
