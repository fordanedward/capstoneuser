import { dev } from '$app/environment';

const STRIPE_SECRET_KEY = import.meta.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY && !dev) {
  throw new Error('STRIPE_SECRET_KEY is not defined in production');
}

export const serverConfig = {
    stripe: {
        secretKey: dev ? 'sk_test_your_secret_key' : STRIPE_SECRET_KEY
    }
};
