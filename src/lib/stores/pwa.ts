import { writable } from 'svelte/store';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
	interface Navigator {
		standalone?: boolean;
	}
}

export const deferredPrompt = writable<BeforeInstallPromptEvent | null>(null);
export const installPromptVisible = writable(false);
export const isInstalled = writable(false);

export function initPWAInstallPrompt() {
	if (typeof window === 'undefined') return;

	window.addEventListener('beforeinstallprompt', (e: Event) => {
		e.preventDefault();
		deferredPrompt.set(e as BeforeInstallPromptEvent);
		installPromptVisible.set(true);
	});

	window.addEventListener('appinstalled', () => {
		isInstalled.set(true);
		installPromptVisible.set(false);
	});

	// Check if already installed (PWA mode)
	if (window.navigator.standalone === true) {
		isInstalled.set(true);
	}
}

export async function installPWA() {
	let currentPrompt: BeforeInstallPromptEvent | null | undefined;
	const unsubscribe = deferredPrompt.subscribe((value) => {
		currentPrompt = value;
	});
	unsubscribe();

	if (!currentPrompt) return;

	await currentPrompt.prompt();
	const { outcome } = await currentPrompt.userChoice;

	if (outcome === 'accepted') {
		isInstalled.set(true);
	}

	deferredPrompt.set(null);
	installPromptVisible.set(false);
}

export function resetInstallPrompt() {
	installPromptVisible.set(true);
}

export function hideInstallPrompt() {
	installPromptVisible.set(false);
}
