
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// A robust check to ensure all necessary keys are present.
const isFirebaseConfigured =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

let app: FirebaseApp;
if (isFirebaseConfigured) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} else {
    console.warn("Firebase configuration is missing or incomplete. Firebase services will be disabled. Please provide all necessary keys in your .env file.");
}

const auth: Auth | null = isFirebaseConfigured ? getAuth(app!) : null;
const storage: FirebaseStorage | null = isFirebaseConfigured ? getStorage(app!) : null;

export { auth, storage, isFirebaseConfigured };
