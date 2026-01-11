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
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p class="text-sm text-blue-800 font-semibold mb-3 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            Contact Support
          </p>
          <div class="space-y-2">
            <a 
              href="mailto:customerservice@permanentehealthplan.org"
              class="flex items-center text-sm text-blue-700 hover:text-blue-900 transition-colors group"
            >
              <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="m2 7 10 7 10-7"></path>
              </svg>
              <span class="group-hover:underline break-all">customerservice@permanentehealthplan.org</span>
            </a>
            <a 
              href="mailto:thepermanentehealthplancorpcs@gmail.com"
              class="flex items-center text-sm text-blue-700 hover:text-blue-900 transition-colors group"
            >
              <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="m2 7 10 7 10-7"></path>
              </svg>
              <span class="group-hover:underline break-all">thepermanentehealthplancorpcs@gmail.com</span>
            </a>
          </div>
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
