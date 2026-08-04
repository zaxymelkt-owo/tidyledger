# Mobile shell (beyond PWA)

TidyLedger already ships as a **PWA** (`public/manifest.webmanifest`, `sw.js`).  
For store-style packaging (home-screen icon, splash, optional native APIs), use **Capacitor** as a thin native shell around the same Vite build.

## Why Capacitor (not a rewrite)

- One React codebase  
- Reuse Supabase auth, field camera, geolocation  
- Optional native push later  

## One-time setup

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init TidyLedger com.tidyledger.app --web-dir dist
```

`capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tidyledger.app',
  appName: 'TidyLedger',
  webDir: 'dist',
  server: {
    // Production: load GitHub Pages (or custom domain)
    url: 'https://tidyledger.github.io/tidyledger/',
    cleartext: false,
  },
}

export default config
```

### Local native project

```bash
npm run build
npx cap add ios      # macOS + Xcode
npx cap add android  # Android Studio
npx cap sync
npx cap open ios
# or
npx cap open android
```

For **local dev** against Vite:

```ts
server: {
  url: 'http://YOUR_LAN_IP:5173/tidyledger/',
  cleartext: true,
}
```

## Field features in a shell

| Feature | Web / PWA | Native shell |
|---------|-----------|--------------|
| Camera job photos | `getUserMedia` | Same, or `@capacitor/camera` |
| GPS check-in | Geolocation API | Same, or `@capacitor/geolocation` |
| Offline queue | IndexedDB (existing) | Same |
| Push job alerts | — | Future: FCM / APNs |

## App store notes

- Privacy policy URL: `/privacy`  
- Account deletion / data export: `/data-export`  
- SMS reminders require TCPA-style consent (`customers.sms_opt_in`)  

## Recommendation

Ship the **PWA** for most staff; add Capacitor only if you need App Store / Play presence or push notifications. Keep `base: '/tidyledger/'` in Vite when hosting on GitHub Pages; use a custom domain + `base: '/'` for a cleaner native `server.url`.
