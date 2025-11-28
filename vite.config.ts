import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			manifest: {
				name: 'Healthcare Patient Portal',
				short_name: 'Healthcare',
				description: 'A comprehensive healthcare patient management and communication platform',
				theme_color: '#1e40af',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'portrait-primary',
				scope: '/',
				start_url: '/'
			},
			injectRegister: 'auto',
			pwaAssets: {
				disabled: true
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,html,wasm,json}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 20,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							}
						}
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'gstatic-fonts-cache',
							expiration: {
								maxEntries: 20,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							}
						}
					},
					{
						urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'firestore-cache',
							networkTimeoutSeconds: 5,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 // 1 day
							}
						}
					}
				]
			},
			devOptions: {
				enabled: true,
				suppressWarnings: true,
				navigateFallback: '/'
			}
		})
	]
});
