import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

export const missingFirebaseVars = requiredEnvVars.filter(
  key => !import.meta.env[key] || import.meta.env[key] === 'your_firebase_web_api_key_here'
);

if (missingFirebaseVars.length > 0) {
  console.warn(
    `[SmartSchedule] Missing Firebase environment variables: ${missingFirebaseVars.join(', ')}. Local demo mode active.`
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '0000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:0000000000:web:0000000000',
};

export const isFirebaseConfigured = missingFirebaseVars.length === 0;

let app;
let auth;
let db;
let secondaryAuth;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);

  const SECONDARY_APP_NAME = 'smartschedule-secondary';
  const secondaryApp = getApps().find(a => a.name === SECONDARY_APP_NAME) 
    ? getApp(SECONDARY_APP_NAME)
    : initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  secondaryAuth = getAuth(secondaryApp);
} catch (err) {
  console.error('[SmartSchedule] Firebase initialization error:', err);
}

export { auth, db, secondaryAuth };
export default app;
