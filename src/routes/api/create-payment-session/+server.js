import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

// Initialize Stripe with your secret key from environment
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil'
});

export async function POST({ request }) {
  try {
    const { appointmentId, amount, service } = await request.json();
    
    console.log('Creating payment session for:', { appointmentId, amount, service }); // Debug log

    if (!appointmentId) {
      throw new Error('Appointment ID is required');
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'php',
            product_data: {
              name: service || 'Dental Service',
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/payment-cancelled`,
      metadata: {
        appointmentId: appointmentId
      }
    });

    console.log('Session created:', session.id); // Debug log

    return json({ id: session.id });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error
    }, { status: 500 });
  }
} 