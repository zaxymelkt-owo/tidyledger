/** Register the PWA service worker (production / preview only works best over HTTPS) */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const base = import.meta.env.BASE_URL || '/'
  const swUrl = `${base}sw.js`

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl, { scope: base }).catch((err) => {
      console.warn('Service worker registration failed:', err)
    })
  })
}
