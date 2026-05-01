import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { doc, getDocFromServer } from 'firebase/firestore';

// Configure based on environment variables (best for automated deployments like Netlify)
// Note: In Vite, we use import.meta.env.VITE_*
const firebaseAppConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
};

// If API key is missing from env vars, try to load from the AI Studio generated config
if (!firebaseAppConfig.apiKey) {
  try {
    // Using a dynamic import so it doesn't fail the build if the file is missing
    const config = await import('../../firebase-applet-config.json');
    Object.assign(firebaseAppConfig, config.default || config);
  } catch (e) {
    console.warn("Firebase config not found in environment or local file. Please set VITE_FIREBASE_* env vars.");
  }
}

const app = initializeApp(firebaseAppConfig);
export const db = getFirestore(app, firebaseAppConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Test connection strictly as per guidelines
async function testConnection() {
  try {
    // We use a dummy path just to verify connectivity
    await getDocFromServer(doc(db, 'system', 'connection_test'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonError);
  throw new Error(jsonError);
}
