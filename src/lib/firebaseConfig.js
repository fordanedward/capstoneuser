import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; 
import { browser } from '$app/environment';

const firebaseConfig = {
  apiKey: "AIzaSyDNGNakXXmB89nR5-JOYcMOMAEDCTS9WjE",
  authDomain: "integratedsystem-4040b.firebaseapp.com",
  projectId: "integratedsystem-4040b",
  storageBucket: "integratedsystem-4040b.firebasestorage.app",
  messagingSenderId: "529987505201",
  appId: "1:529987505201:web:e36fd3e66c584da48f1910",
  measurementId: "G-4QT0RK92C0"
};

// Initialize Firebase App only in browser
let app;
let db;
let auth;
let analytics;

if (browser) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    analytics = getAnalytics(app);
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
}

// Export the Firestore database, Auth, and Firebase config
export { db, auth, firebaseConfig };
