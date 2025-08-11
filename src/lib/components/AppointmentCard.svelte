<script>
    // @ts-nocheck
    import { Button } from 'flowbite-svelte';
    import { createEventDispatcher } from 'svelte';
  
    /** @type {import('./types').Appointment || object} */ 
    export let appointment;
  
    /** @type {'upcoming' | 'past'} */
    export let type = 'upcoming'; 
  
    const dispatch = createEventDispatcher();
  
    function requestReschedule() {
      dispatch('requestReschedule', appointment.id);
    }
  
    function requestCancel() {
      dispatch('requestCancel', appointment.id);
    }
  </script>
  
  <div class="bg-white shadow-lg rounded-lg p-4 w-full max-w-sm border border-gray-300">
    <!-- Date, Time, Service -->
    <div class="mb-2">
      <p class="font-bold text-lg text-blue-600">{appointment.date}</p>
      <p class="font-bold text-lg text-blue-600">{appointment.time}</p>
      <p class="text-gray-700 font-semibold mt-1">{appointment.service}</p>
       {#if appointment.subServices && appointment.subServices.length > 0}
          <p class="text-gray-500 text-sm mt-1">Sub: {appointment.subServices.join(', ')}</p>
       {/if}
    </div>
  
    <!-- Status -->
    <div class="mb-3 min-h-[24px]"> 
      {#if appointment.cancellationStatus === 'requested'}
        <span class="text-yellow-600 font-semibold">Cancellation Requested</span>
      {:else if appointment.cancellationStatus === 'Approved'}
        <span class="text-red-600 font-semibold">Cancelled</span>
      {:else if appointment.cancellationStatus === 'decline'}
        <span class="text-red-600 font-semibold">Appointment Declined</span>
         {:else if appointment.status === 'Reschedule Requested'}
        <span class="text-purple-600 font-semibold">Reschedule Requested</span>
      {:else if appointment.status === 'Rescheduled'}
        <span class="text-blue-600 font-semibold">Reschedule Accepted</span>
      {:else if appointment.status === 'Completed: Need Follow-up'}
        <span class="text-blue-600 font-semibold">Completed: With Follow-up</span>
      {:else if appointment.status === 'Scheduled'}
          <span class="text-blue-600 font-semibold">Follow-up Appointment</span>
      {:else if appointment.status === 'Accepted'}
        <span class="text-green-600 font-semibold">Accepted</span>
      {:else if appointment.status === 'Completed'}
        <span class="text-blue-600 font-semibold">Completed</span>
      {:else if appointment.status === 'Missed'}
        <span class="text-orange-600 font-semibold">Missed</span>
      {:else if appointment.status === 'Decline'}
        <span class="text-red-600 font-semibold">Cancellation Declined</span>
      {:else if appointment.status === 'pending'}
        <span class="text-yellow-600 font-semibold">Pending</span>
      {:else if appointment.status === 'confirmed'}
        <span class="text-blue-600 font-semibold">Confirmed</span>
      {:else}
        <span class="text-gray-600 font-semibold">Unknown Status</span>
      {/if}
    </div>
 
    {#if type === 'upcoming'}
      <div class="flex justify-end gap-2 min-h-[30px]">
        <!-- Reschedule Button Logic -->
        {#if (appointment.status === 'Accepted' || appointment.status === 'confirmed' || appointment.status === 'Rescheduled') && appointment.cancellationStatus !== 'Approved' && appointment.cancellationStatus !== 'requested'}
            <Button size="xs" color="blue" on:click={requestReschedule}>
                Reschedule
            </Button>
        {/if}
  
        <!-- Cancel Button Logic -->
        {#if (appointment.status === 'pending' || appointment.status === 'Accepted' || appointment.status === 'Confirmed' || appointment.status === 'Rescheduled') && appointment.cancellationStatus !== 'requested' && appointment.cancellationStatus !== 'Approved'}
            <Button size="xs" color="red" on:click={requestCancel}>
                Cancel
            </Button>
        {/if}
      </div>
    {/if}
  </div>