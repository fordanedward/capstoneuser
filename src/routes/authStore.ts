import { writable } from "svelte/store";
import type { User } from "firebase/auth"; // Type-only import
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "$lib/firebaseConfig";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, onSnapshot, Unsubscribe } from "firebase/firestore";

// Initialize Firebase app (guard against double initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export const currentUser = writable<User | null>(null);

// Keep a live listener for the currently signed-in user's Firestore document
let userDocUnsub: Unsubscribe | null = null;

onAuthStateChanged(auth, async (user) => {
  // Clean up any previous listener when auth state changes
  if (userDocUnsub) {
    try {
      userDocUnsub();
    } catch (e) {
      // ignore
    }
    userDocUnsub = null;
  }

  if (!user) {
    currentUser.set(null);
    return;
  }

  // Set the auth user into the store immediately
  currentUser.set(user);

  try {
    const userRef = doc(db, 'users', user.uid);

    // Attach a real-time listener so admin-side changes (isArchived/status) are enforced immediately
    userDocUnsub = onSnapshot(userRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const isArchived = Boolean(data.isArchived ?? data.archived ?? false);
      const status = (data.status || '').toString().toLowerCase();

      if (isArchived || status === 'inactive') {
        try {
          await signOut(auth);
        } catch (e) {
          console.error('Error signing out inactive user:', e);
        }
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('accountDeactivated', 'true');
            window.location.replace('/loginPatient');
          } catch (e) {
            console.error('Error redirecting after deactivation:', e);
          }
        }
        currentUser.set(null);
      }
    });
  } catch (error) {
    console.error('Error attaching user doc listener:', error);
  }
});
