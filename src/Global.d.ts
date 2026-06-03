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

declare module 'svelte' {
    export function onMount(fn: () => void | (() => void) | Promise<void | (() => void)>): void;
}

declare module 'svelte/transition' {
    export type EasingFunction = (t: number) => number;
    export type TransitionConfig = {
        delay?: number;
        duration?: number;
        easing?: EasingFunction;
        css?: (t: number, u: number) => string;
        tick?: (t: number, u: number) => void;
    };

    export function fade(node: Element, params?: Record<string, unknown>): TransitionConfig;
    export function scale(node: Element, params?: Record<string, unknown>): TransitionConfig;
}

declare module 'svelte/easing' {
    export function elasticOut(t: number): number;
}