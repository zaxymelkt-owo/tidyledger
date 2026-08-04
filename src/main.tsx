import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/registerSW'
import { syncOfflineQueue } from './lib/syncOfflineQueue'
import { installGlobalErrorHandlers } from './lib/monitoring'

registerServiceWorker()
installGlobalErrorHandlers()

// Sync offline field actions when connectivity returns
window.addEventListener('online', () => {
  syncOfflineQueue().catch(console.warn)
})
// Attempt once on load
if (navigator.onLine) {
  syncOfflineQueue().catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
