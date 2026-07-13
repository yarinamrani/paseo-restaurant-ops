import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  })
}

// Auto-update: whenever the app regains focus, compare the running build
// against the deployed one and reload if a newer version was published.
// Installed PWAs resume from memory and never reload on their own.
if (import.meta.env.PROD) {
  let reloading = false
  const checkVersion = async () => {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
      const j = await r.json()
      if (!reloading && j.build && j.build !== __BUILD_ID__) {
        reloading = true
        window.location.reload()
      }
    } catch {
      /* offline — try again next focus */
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkVersion()
  })
  window.addEventListener('focus', checkVersion)
  setInterval(checkVersion, 5 * 60 * 1000)
  checkVersion()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>
)
