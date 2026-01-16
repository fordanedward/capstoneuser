import { writable } from 'svelte/store';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
	interface Navigator {
		standalone?: boolean;
		app?: {
			installState?: string;
		};
	}
}

export const deferredPrompt = writable<BeforeInstallPromptEvent | null>(null);
export const installPromptVisible = writable(false);
export const isInstalled = writable(false);

export function initPWAInstallPrompt() {
	if (typeof window === 'undefined') return;

	// Check if already installed
	const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
	const isIOSStandalone = window.navigator.standalone === true;
	const isSamsungInstalled = window.navigator.app?.installState === 'installed';
	
	if (isStandalone || isIOSStandalone || isSamsungInstalled) {
		isInstalled.set(true);
		return;
	}

	window.addEventListener('beforeinstallprompt', (e: Event) => {
		e.preventDefault();
		deferredPrompt.set(e as BeforeInstallPromptEvent);
		installPromptVisible.set(true);
	});

	window.addEventListener('appinstalled', () => {
		isInstalled.set(true);
		installPromptVisible.set(false);
	});

	// For Samsung Internet, show custom prompt after delay if no native prompt
	setTimeout(() => {
		let hasPrompt = false;
		const unsubscribe = deferredPrompt.subscribe((value) => {
			hasPrompt = value !== null;
		});
		unsubscribe();

		// Samsung Internet may not fire beforeinstallprompt immediately
		// Show our custom UI if manifest is valid
		if (!hasPrompt && !isStandalone && !isIOSStandalone && !isSamsungInstalled) {
			installPromptVisible.set(true);
		}
	}, 2000);
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
