import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const buildId = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/
  base: process.env.GITHUB_PAGES ? '/paseo-restaurant-ops/' : '/',
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'emit-version-json',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: buildId }) })
      },
    },
  ],
  server: { port: 5173 },
})
