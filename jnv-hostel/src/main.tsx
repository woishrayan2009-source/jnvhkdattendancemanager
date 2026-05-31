import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// ─── Register PWA service worker ──────────────────────────────────────────────
const updateSW = registerSW({
  onNeedRefresh() {
    console.info('[PWA] New content available, updating…')
    updateSW(true)
  },
  onOfflineReady() {
    console.info('[PWA] App ready to work fully offline.')
  },
  onRegistered(registration: ServiceWorkerRegistration | undefined) {
    console.info('[PWA] Service Worker registered:', registration?.scope)
  },
  onRegisterError(error: unknown) {
    console.error('[PWA] Service Worker registration failed:', error)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
