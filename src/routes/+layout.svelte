<script lang="ts">
	import '../app.css';
  import Notification from '$lib/components/Notification.svelte';
</script>
  
  <svelte:head>
    <title>PHP Digital Member User</title>
  </svelte:head>
  
  <main>
	<slot />
  </main>
  
  <Notification />
  