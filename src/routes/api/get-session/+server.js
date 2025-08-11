import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

// Initialize Stripe with your secret key from environment
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil'
});

export async function GET({ url }) {
  try {
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) {
      return json({ error: 'No session ID provided' }, { status: 400 });
    }

    console.log('Retrieving session:', sessionId); // Debug log

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Session data:', session); // Debug log

    if (!session.metadata?.appointmentId) {
      console.error('No appointment ID in session metadata:', session.metadata); // Debug log
      return json({ error: 'No appointment ID found in session' }, { status: 400 });
    }

    return json({ appointmentId: session.metadata.appointmentId });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error
    }, { status: 500 });
  }
} 