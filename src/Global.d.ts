declare module '$lib/firebaseConfig' {
    import type { FirebaseApp } from 'firebase/app';
    import type { Firestore } from 'firebase/firestore';
    import type { Auth } from 'firebase/auth';
    import type { Analytics } from 'firebase/analytics';

    export const firebaseConfig: Record<string, unknown>;
    export const app: FirebaseApp | null;
    export const db: Firestore | null;
    export const auth: Auth | null;
    export const analytics: Analytics | null;
}