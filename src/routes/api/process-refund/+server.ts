import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { getFirestore, doc, getDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// Initialize Stripe with your secret key from environment
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil'
});

// Initialize Firebase
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
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
db = getFirestore(app);

export async function POST({ request }) {
  try {
    const { appointmentId } = await request.json();

    if (!appointmentId) {
      return json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Get appointment details
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);

    if (!appointmentDoc.exists()) {
      return json({ error: 'Appointment not found' }, { status: 404 });
    }

    const appointment = appointmentDoc.data();

    // Check if appointment is paid and cancelled
    if (appointment.paymentStatus !== 'paid' || appointment.cancellationStatus !== 'Approved') {
      return json({ error: 'Appointment must be paid and cancelled to request refund' }, { status: 400 });
    }

    // Get the payment session ID from the appointment
    const sessionId = appointment.paymentSessionId;
    if (!sessionId) {
      return json({ error: 'No payment session found for this appointment' }, { status: 400 });
    }

    // Retrieve the session to get the payment intent
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntentId = session.payment_intent;

    if (!paymentIntentId) {
      return json({ error: 'No payment intent found for this session' }, { status: 400 });
    }

    // Process the refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId.toString(),
      reason: 'requested_by_customer'
    });

    // Update appointment status
    await updateDoc(appointmentRef, {
      paymentStatus: 'refunded',
      refundDate: new Date(),
      refundId: refund.id
    });

    return json({ 
      success: true,
      refundId: refund.id
    });

  } catch (error) {
    console.error('Refund error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error
    }, { status: 500 });
  }
} 