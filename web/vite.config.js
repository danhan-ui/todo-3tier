import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 서버에서만 /api 요청을 API로 전달 (배포 때는 Nginx / Ingress가 이 역할)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.API_URL || 'http://localhost:3000',
    },
  },
});
