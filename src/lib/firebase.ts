import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDAlVjKP9lUwNT5aeoUuBAqw-BbxEGsHio",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kynetik-1c177.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kynetik-1c177",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kynetik-1c177.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "889635765305",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:889635765305:web:1f044c60fa5ca85099a1e8",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
