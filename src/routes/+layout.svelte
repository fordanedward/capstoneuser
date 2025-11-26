<script lang="ts">
	import '../app.css';
  import Notification from '$lib/components/Notification.svelte';
</script>
  
  <svelte:head>
    <title>PHPGMP Member</title>
  </svelte:head>
  
  <main>
	<slot />
  </main>
  
  <Notification />
  