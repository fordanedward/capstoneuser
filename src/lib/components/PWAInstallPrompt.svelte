<script lang="ts">
	import { installPromptVisible, installPWA, isInstalled, hideInstallPrompt, deferredPrompt } from '$lib/stores/pwa';
	import { page } from '$app/stores';
	
	async function handleInstall() {
		// Try native install first
		let currentPrompt: any;
		const unsubscribe = deferredPrompt.subscribe((value) => {
			currentPrompt = value;
		});
		unsubscribe();
		
		if (currentPrompt) {
			await installPWA();
		} else {
			// For Samsung Internet without native prompt
			// Show instructions
			alert('To install this app:\n\n1. Tap the menu button (⋮)\n2. Select "Add page to"\n3. Choose "Home screen"\n\nThis will install the app on your device.');
			hideInstallPrompt();
		}
	}
</script>


{#if $installPromptVisible && !$isInstalled && $page.url.pathname === '/'}
	<div class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-96 rounded-lg bg-[#0b2d56] text-white shadow-lg p-4 z-50 animate-fadeInUp">
		<div class="flex gap-3">
			<div class="flex-shrink-0">
				<img src="/images/digital member portal.png" alt="Permanente Logo" class="w-16 h-16 object-contain" />
			</div>
			<div class="flex flex-col gap-3 flex-1">
				<div>
					<h3 class="font-bold text-lg">Install PHPDGMP Member App</h3>
					<p class="text-sm text-blue-100">We provide health solutions so we can achieve healthy, happy and productive lives.</p>
				</div>
				<div class="flex gap-2">
					<button
						on:click={handleInstall}
						class="flex-1 bg-white text-[#0b2d56] font-semibold py-2 px-4 rounded hover:bg-blue-50 transition-colors"
					>
						Install
					</button>
					<button
						on:click={hideInstallPrompt}
						class="flex-1 bg-[#123a6e] text-white font-semibold py-2 px-4 rounded hover:bg-blue-800 transition-colors"
					>
						Later
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fadeInUp {
		0% {
			opacity: 0;
			transform: translateY(40px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-fadeInUp {
		animation: fadeInUp 0.8s cubic-bezier(.68,-0.55,.27,1.55);
	}
</style>
