<script>
  import { onMount } from 'svelte';
  import Swal from 'sweetalert2';

  onMount(() => {
    Swal.fire({
      icon: 'info',
      title: 'Payment Cancelled',
      text: 'Your payment was cancelled. You can try again later.',
      confirmButtonText: 'Return to Appointments'
    }).then(() => {
      window.location.href = '/auth/appointment';
    });
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="text-center p-8">
    <div class="text-red-500 text-6xl mb-4">
      <i class="fas fa-times-circle"></i>
    </div>
    <h2 class="text-xl font-semibold text-gray-700">Payment Cancelled</h2>
    <p class="mt-2 text-gray-500">Redirecting you back to appointments...</p>
  </div>
</div> 