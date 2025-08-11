<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { initializeApp, getApps } from 'firebase/app';
  import { getFirestore, doc, updateDoc } from 'firebase/firestore';
  import { getAuth } from 'firebase/auth';
  import { getAnalytics } from 'firebase/analytics';
  import Swal from 'sweetalert2';

  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDNGNakXXmB89nR5-JOYcMOMAEDCTS9WjE",
    authDomain: "integratedsystem-4040b.firebaseapp.com",
    projectId: "integratedsystem-4040b",
    storageBucket: "integratedsystem-4040b.firebasestorage.app",
    messagingSenderId: "529987505201",
    appId: "1:529987505201:web:e36fd3e66c584da48f1910",
    measurementId: "G-4QT0RK92C0"
  };

  let app;
  let db;
  let auth;
  let analytics;

  onMount(async () => {
    try {
      // Initialize Firebase only if not already initialized
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }
      
      db = getFirestore(app);
      auth = getAuth(app);
      analytics = getAnalytics(app);

      // Get session ID from URL
      const sessionId = $page.url.searchParams.get('session_id');
      if (!sessionId) {
        throw new Error('No session ID found');
      }

      // Get session data from your backend
      const response = await fetch(`/api/get-session?session_id=${sessionId}`);
      const data = await response.json();

      if (!data.appointmentId) {
        throw new Error('No appointment ID found in session');
      }

      // Show success message first
      await Swal.fire({
        icon: 'success',
        title: 'Payment Successful!',
        text: 'Your appointment has been confirmed.',
        confirmButtonText: 'View Appointments'
      });

      // Try to update Firestore after showing success message
      try {
        const appointmentRef = doc(db, 'appointments', data.appointmentId);
        await updateDoc(appointmentRef, {
          paymentStatus: 'paid',
          updatedAt: new Date()
        });
      } catch (firestoreError) {
        console.warn('Firestore update failed:', firestoreError);
        // Continue with redirect even if Firestore update fails
      }

      // Redirect to appointments page
      window.location.href = '/auth/appointment';
    } catch (error) {
      console.error('Error in payment process:', error);
      Swal.fire({
        icon: 'error',
        title: 'Payment Error',
        text: error instanceof Error ? error.message : 'There was an error confirming your payment.',
        confirmButtonText: 'Return to Appointments'
      }).then(() => {
        window.location.href = '/auth/appointment';
      });
    }
  });
</script>

<div class="payment-success">
  <h1>Processing Payment...</h1>
  <p>Please wait while we confirm your payment.</p>
</div>

<style>
  .payment-success {
    text-align: center;
    padding: 2rem;
  }
</style> 