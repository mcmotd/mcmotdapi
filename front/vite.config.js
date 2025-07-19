import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../backend/dist'   // ← 改这里
  },
  server: {
    proxy: {
      // [核心改动] 定义代理规则
      // 键 '/api' 意味着拦截所有以 /api 开头的请求
      '/api': {
        // 目标是您的后端服务器地址
        target: 'http://localhost:3123',
        // 改变源，服务器收到的请求头中的host会是目标地址
        changeOrigin: true,
        // Vite 默认不会重写路径，所以请求 /api/status 会被转发到 http://localhost:3000/api/status
        // 这正好符合我们后端API的路径，所以无需重写(rewrite)
      }
    }
  }
})