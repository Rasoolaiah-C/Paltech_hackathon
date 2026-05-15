import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDazwnnhSE0Ta7qdx_QRNW-nb-WT6AYeWM",
  authDomain: "habittracker-45f6d.firebaseapp.com",
  projectId: "habittracker-45f6d",
  storageBucket: "habittracker-45f6d.firebasestorage.app",
  messagingSenderId: "187676765863",
  appId: "1:187676765863:web:004236464e9790a0133582"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);