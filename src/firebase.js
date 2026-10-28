import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function cleanEnv(val, fallback = '') {
  if (!val) return fallback;
  return String(val).trim().replace(/[\r\n\t]+/g, '').replace(/^["']|["']$/g, '').trim();
}

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

export const missingFirebaseVars = requiredEnvVars.filter(
  key => !import.meta.env[key] || cleanEnv(import.meta.env[key]) === 'your_firebase_web_api_key_here'
);

if (missingFirebaseVars.length > 0) {
  console.warn(
    `[SmartSchedule] Missing Firebase environment variables: ${missingFirebaseVars.join(', ')}. Local demo mode active.`
  );
}

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'demo-api-key'),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'bustrack-d929f.firebaseapp.com'),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'bustrack-d929f'),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'bustrack-d929f.firebasestorage.app'),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, '610161394232'),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID, '1:610161394232:web:725731d93f12d751721ccd'),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'demo-api-key' &&
  firebaseConfig.apiKey !== 'your_firebase_web_api_key_here'
);

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
