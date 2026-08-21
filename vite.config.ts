import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages needs the repository prefix in built assets. Keep the Vite
  // development server at / so Playwright and local development use the same
  // public-file URLs regardless of which CI environment launched them.
  base: command === 'build' && process.env.GITHUB_ACTIONS ? '/huddle/' : '/',
}))
