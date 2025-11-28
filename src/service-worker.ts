/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => {
			cache.addAll(ASSETS);
		})
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE) {
					await caches.delete(key);
				}
			}
			self.clients.claim();
		})
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') {
		return;
	}

	const url = new URL(event.request.url);

	// Skip same-site requests that don't start with /build/
	const isAsset = ASSETS.includes(url.pathname);
	const isHttp = url.protocol.startsWith('http');
	const isSameOrigin = url.origin === self.location.origin;

	if (isHttp && isSameOrigin && !isAsset && !url.pathname.startsWith('/api')) {
		event.respondWith(networkFirst(event.request));
		return;
	}

	if (isAsset || (isHttp && isSameOrigin)) {
		event.respondWith(cacheFirst(event.request));
		return;
	}
});

async function cacheFirst(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	const cached = await cache.match(request);

	if (cached) {
		return cached;
	}

	try {
		const response = await fetch(request);

		if (response.ok) {
			cache.put(request, response.clone());
		}

		return response;
	} catch {
		return new Response('Offline - Unable to fetch resource', {
			status: 503,
			statusText: 'Service Unavailable',
			headers: new Headers({
				'Content-Type': 'text/plain'
			})
		});
	}
}

async function networkFirst(request: Request): Promise<Response> {
	try {
		const response = await fetch(request);

		if (response.ok) {
			const cache = await caches.open(CACHE);
			cache.put(request, response.clone());
		}

		return response;
	} catch {
		const cache = await caches.open(CACHE);
		const cached = await cache.match(request);

		if (cached) {
			return cached;
		}

		return new Response('Offline - Unable to fetch resource', {
			status: 503,
			statusText: 'Service Unavailable',
			headers: new Headers({
				'Content-Type': 'text/plain'
			})
		});
	}
}
