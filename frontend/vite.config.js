import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 開發時代理到後端（本機開發用）
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000'
    }
  },
  // 打包輸出到 backend/public，讓 Express 直接提供
  build: {
    outDir: '../backend/public',
    emptyOutDir: true
  }
})
