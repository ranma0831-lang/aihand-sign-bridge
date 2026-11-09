import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tailwind v3(PostCSS) 사용: v4의 네이티브 스캐너는 이 PC의 Windows 앱 제어 정책에 막힌다
// base './': GitHub Pages(하위 경로)와 Vercel(루트) 어디에 올려도 파일 경로가 맞도록 상대 경로로 빌드
export default defineConfig({
  base: './',
  plugins: [react()],
})
