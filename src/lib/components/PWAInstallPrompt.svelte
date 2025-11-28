<script lang="ts">
	import { installPromptVisible, installPWA, isInstalled } from '$lib/stores/pwa';
</script>

{#if $installPromptVisible && !$isInstalled}
	<div class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-96 rounded-lg bg-blue-600 text-white shadow-lg p-4 z-50">
		<div class="flex flex-col gap-3">
			<div>
				<h3 class="font-bold text-lg">Install Healthcare App</h3>
				<p class="text-sm text-blue-100">Install our app for faster access and offline support.</p>
			</div>
			<div class="flex gap-2">
				<button
					on:click={installPWA}
					class="flex-1 bg-white text-blue-600 font-semibold py-2 px-4 rounded hover:bg-blue-50 transition-colors"
				>
					Install
				</button>
				<button
					on:click={() => installPromptVisible.set(false)}
					class="flex-1 bg-blue-700 text-white font-semibold py-2 px-4 rounded hover:bg-blue-800 transition-colors"
				>
					Later
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* No additional styles needed - using Tailwind */
</style>
