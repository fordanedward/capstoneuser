<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { notifications } from '$lib/stores/notifications';
  import { notificationActions } from '$lib/stores/notifications';
  import { derived } from 'svelte/store';

  type Notification = {
    id: string;
    title?: string;
    body: string;
    type?: string;
  };

  const list = notifications;

  function close(id: string) {
    notificationActions.dismiss(id);
  }
</script>

<style>
  .notif-container {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 360px;
    width: calc(100% - 2rem);
  }

  .notif {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 6px 18px rgba(2,6,23,0.15);
    align-items: start;
    color: white;
  }

  .title {
    font-weight: 600;
  }

  .body {
    font-size: 0.9rem;
    opacity: 0.95;
  }

  .info { background: #3b82f6; }
  .success { background: #10b981; }
  .error { background: #ef4444; }
  .warning { background: #f59e0b; }

  .close {
    margin-left: auto;
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.9);
    cursor: pointer;
    font-weight: 700;
  }
</style>

<div class="notif-container" aria-live="polite" aria-atomic="true">
  {#each $list as n (n.id)}
    <div
      class="notif {n.type ?? 'info'}"
      in:fly={{ x: 200, duration: 300 }}
      out:fly={{ x: 200, duration: 250 }}
      role="status"
      aria-label={n.title ?? n.body}
    >
      <div>
        {#if n.title}
          <div class="title">{n.title}</div>
        {/if}
        <div class="body">{n.body}</div>
      </div>

      <button class="close" on:click={() => close(n.id)} aria-label="Dismiss">×</button>
    </div>
  {/each}
</div>
