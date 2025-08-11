import { dev } from '$app/environment';

export const env = {
    stripe: {
        publicKey: 'pk_test_51ROYIt4CJdTRk6W6EhJRpRn0mPxphCMUuWAvDABSB9xEoicfGdOf25JMx0JvrYUutyC8PtqA3H6L3mS6p6U1fDvS00j5UYhCa6'
    },
    firebaseConfig: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
    }
}; 