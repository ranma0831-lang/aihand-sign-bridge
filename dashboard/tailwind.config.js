/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Pretendard Variable"', 'Pretendard', 'system-ui', '-apple-system', 'sans-serif'] },
      colors: { ink: '#141416', paper: '#e7e7ea', mute: '#6b6b73', ok: '#2f8f5b', bad: '#d2453b' },
    },
  },
  plugins: [],
}
