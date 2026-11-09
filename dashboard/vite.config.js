import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tailwind v3(PostCSS) 사용: v4의 네이티브 스캐너는 이 PC의 Windows 앱 제어 정책에 막힌다
export default defineConfig({
  plugins: [react()],
})
