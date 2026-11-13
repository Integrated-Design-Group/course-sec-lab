import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发期：前端 5173 通过 Vite 代理访问后端 /api，避免跨域与硬编码地址。
// 生产期：由 Nginx 同源反代 /api 到后端容器。
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
