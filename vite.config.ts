import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/
  base: process.env.GITHUB_PAGES ? '/paseo-restaurant-ops/' : '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
})
