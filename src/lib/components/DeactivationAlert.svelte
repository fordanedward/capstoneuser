<script lang="ts">
  import { deactivationAlert, hideDeactivationAlert } from '$lib/stores/deactivation';
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  let show = false;
  let message = '';

  deactivationAlert.subscribe(value => {
    show = value.show;
    message = value.message;
  });
</script>

{#if show}
  <!-- Overlay backdrop -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-4"
    transition:fade={{ duration: 300 }}
  >
    <!-- Alert Modal -->
    <div 
      class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      transition:scale={{ duration: 400, easing: quintOut, start: 0.9 }}
      role="alert"
      aria-live="assertive"
    >
      <!-- Header with icon -->
      <div class="bg-gradient-to-r from-red-500 to-red-600 px-6 py-8 text-center">
        <div class="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
          <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-white mb-2">Account Deactivated</h2>
      </div>

      <!-- Content -->
      <div class="px-6 py-6">
        <p class="text-gray-700 text-center mb-6 text-base leading-relaxed">
          {message}
        </p>
        <p class="text-gray-600 text-center mb-4 text-sm">
          Contact support for help.
        </p>
        
        <div class="space-y-3 mb-6">
          <a 
            href="mailto:customerservice@permanentehealthplan.org"
            class="flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <path d="m2 7 10 7 10-7"></path>
            </svg>
            <span>customerservice@permanentehealthplan.org</span>
          </a>
          <a 
            href="mailto:thepermanentehealthplancorpcs@gmail.com"
            class="flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <path d="m2 7 10 7 10-7"></path>
            </svg>
            <span>thepermanentehealthplancorpcs@gmail.com</span>
          </a>
        </div>

        <p class="text-xs text-gray-500 text-center italic">
          You will be signed out automatically in a few seconds...
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body.deactivation-alert-open) {
    overflow: hidden;
  }
</style>
