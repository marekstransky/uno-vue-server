import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@model': path.resolve(__dirname, 'src/model'),
      '@bots': path.resolve(__dirname, 'src/bots'),
      '@workers': path.resolve(__dirname, 'src/workers'),
      '@utils': path.resolve(__dirname, 'src/utils')
    }
  },
  worker: {
    format: 'es'
  },
  server: {
    port: 5173
  }
})
