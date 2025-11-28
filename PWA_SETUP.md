# Progressive Web App (PWA) Setup Guide

Your application has been configured as a Progressive Web App (PWA). This enables users to install your app on their devices and use it offline with improved performance.

## What's Been Configured

### 1. **Service Worker** (`src/service-worker.ts`)
- Handles offline caching and network requests
- Implements cache-first strategy for assets
- Implements network-first strategy for pages
- Automatically caches Google Fonts and Firebase requests

### 2. **Web App Manifest** (`manifest.json`)
- Defines app metadata (name, icons, colors, etc.)
- Specifies app shortcuts for quick access
- Includes app screenshots for the installation prompt

### 3. **PWA Meta Tags** (in `src/app.html`)
- Apple iOS support meta tags
- Theme color and status bar styling
- Web app capability declarations

### 4. **Vite PWA Plugin** (in `vite.config.ts`)
- Automatic service worker generation and injection
- Workbox caching strategies
- PWA asset generation and optimization

### 5. **Install Prompt Component** (`src/lib/components/PWAInstallPrompt.svelte`)
- User-friendly installation prompt UI
- Appears when PWA can be installed
- Dismissible and non-intrusive

### 6. **PWA Store** (`src/lib/stores/pwa.ts`)
- Manages PWA installation state
- Handles install prompts
- Tracks if app is installed

## Installation & Testing

### Build for Production
```bash
npm run build
npm run preview
```

### Features Enabled

#### ✅ **Offline Support**
- App works offline after initial load
- Caches all static assets
- Caches recent Firebase requests

#### ✅ **App Installation**
- "Add to Home Screen" on Android
- "Add to Home Screen" on iOS
- Desktop web browsers (Chrome, Edge, etc.)

#### ✅ **App Shortcuts**
Users can quickly access:
- Appointments
- Messages
- Prescriptions

#### ✅ **Service Worker Auto-Update**
- Checks for updates on every page load
- Auto-updates in the background
- User gets notified of updates

#### ✅ **Responsive Design**
- Works on all screen sizes
- Optimized for mobile and desktop

#### ✅ **Network Caching**
- Static assets: Cache-first strategy
- Navigation: Network-first strategy
- Firebase: Optimized with timeouts
- External fonts: Cached for 1 year

## Customization

### Change App Icons
Replace or add icons in the `static/icons/` folder:
- `icon-192.png` - Android app icon (192x192)
- `icon-192-maskable.png` - Maskable icon for Android 12+
- `icon-512.png` - Large icon for splash screens (512x512)
- `icon-512-maskable.png` - Maskable large icon

### Change Theme Colors
Edit `manifest.json` and `vite.config.ts`:
```json
{
  "theme_color": "#1e40af",
  "background_color": "#ffffff"
}
```

### Add More App Shortcuts
Edit `manifest.json` shortcuts array to add more quick-access links.

### Adjust Caching Strategy
Edit `vite.config.ts` workbox configuration:
- Add new routes to `runtimeCaching`
- Change `handler` to 'CacheFirst' or 'NetworkFirst'
- Adjust expiration times as needed

## Testing in Development

1. **Run development server:**
   ```bash
   npm run dev
   ```

2. **Open DevTools** (F12)
   - Go to Application → Service Workers
   - Check "Update on reload" to test service worker changes

3. **Test offline:**
   - Enable offline in DevTools Network tab
   - App should still work with cached content

## Testing Installation Prompt

1. **On Android/Chrome:**
   - Build and serve the app
   - After 30 seconds, install prompt should appear
   - Click "Install" to add to home screen

2. **On iOS:**
   - Open in Safari
   - Tap Share → Add to Home Screen
   - App will open in standalone mode

3. **On Desktop (Chrome/Edge):**
   - Click the install icon in the address bar
   - Or go to Menu → "Install Healthcare App"

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full support |
| Edge | ✅ Full support |
| Firefox | ✅ Service Worker support (no install prompt) |
| Safari | ⚠️ Partial (iOS 16.4+) |
| Opera | ✅ Full support |

## Files Modified/Created

### New Files:
- `src/service-worker.ts` - Service worker logic
- `manifest.json` - Web app manifest
- `src/lib/stores/pwa.ts` - PWA state management
- `src/lib/components/PWAInstallPrompt.svelte` - Install UI
- `src/routes/+layout-head.svelte` - PWA head tags

### Modified Files:
- `vite.config.ts` - Added PWA plugin
- `src/app.html` - Added PWA meta tags
- `src/routes/+layout.svelte` - Added PWA initialization
- `package.json` - Added @vite-pwa/sveltekit dependency

## Next Steps

1. **Add proper icons** - Replace placeholder icons in `static/icons/`
2. **Add screenshots** - Add screenshots for the install prompt
3. **Test thoroughly** - Test on various devices and browsers
4. **Monitor performance** - Use Lighthouse to audit your PWA

## Lighthouse PWA Score

After building and deploying, run Lighthouse audit:
1. Open DevTools → Lighthouse
2. Select "PWA"
3. Run audit
4. Target score: 90+

## Additional Resources

- [MDN PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google PWA Checklist](https://web.dev/pwa-checklist/)
- [Vite PWA Plugin Docs](https://vite-pwa-org.netlify.app/)
- [Web App Manifest Spec](https://www.w3.org/TR/appmanifest/)
