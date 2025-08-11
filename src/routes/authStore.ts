import { writable } from "svelte/store";
import type { User } from "firebase/auth"; // Type-only import
import { onAuthStateChanged } from "firebase/auth";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "$lib/firebaseConfig";
import { initializeApp } from "firebase/app";

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
export const currentUser = writable<User | null>(null);

onAuthStateChanged(getAuth(app), (user) => {
  currentUser.set(user);
});
