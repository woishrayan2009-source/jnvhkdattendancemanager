import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SyncService } from './services/SyncService'
import { registerSW } from 'virtual:pwa-register'

// Register service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    // Could show a toast "New version available, refresh?"
    console.log('[PWA] New content available, will update on next reload.')
    updateSW(true)
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work offline.')
  },
})

// Bootstrap SyncService — registers online/offline listeners (idempotent, safe to call once here)
SyncService.init()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
