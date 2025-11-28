<script lang="ts">
	import '../app.css';
	import Notification from '$lib/components/Notification.svelte';
	import PWAInstallPrompt from '$lib/components/PWAInstallPrompt.svelte';
	import { onMount } from 'svelte';
	import { initPWAInstallPrompt } from '$lib/stores/pwa';

	onMount(() => {
		// Initialize PWA install prompt
		initPWAInstallPrompt();
	});
</script>
  
<svelte:head>
	<title>PHPGMP Member</title>
</svelte:head>
  
<main>
	<slot />
</main>
  
<Notification />
<PWAInstallPrompt />
  