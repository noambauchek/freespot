// src/services/firebase.js
// Firebase configuration and initialization for FreeSpot

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

// ─── IMPORTANT ────────────────────────────────────────────────────────────────
// Replace these values with your actual Firebase project credentials.
// You can find them in: Firebase Console → Project Settings → General → SDK setup
// ──────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyA8e7VWbr97C9JIwawEPIm9UsSJseAFnVc",
  authDomain: "parkingapp-4d329.firebaseapp.com",
  databaseURL: "https://parkingapp-4d329-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "parkingapp-4d329",
  storageBucket: "parkingapp-4d329.firebasestorage.app",
  messagingSenderId: "203233748891",
  appId: "1:203233748891:web:d246df2a9831bb4d29e33e",
  measurementId: "G-XG3J0ZNFWY",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export individual Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);           // Firestore – primary structured DB
export const rtdb = getDatabase(app);          // Realtime DB – live parking spots & alerts
export const storage = getStorage(app);        // Cloud Storage – profile photos
export const messaging = getMessaging(app);    // FCM – push notifications
export const functions = getFunctions(app, 'europe-west1'); // Cloud Functions
export const analytics = getAnalytics(app);    // Analytics

export default app;
