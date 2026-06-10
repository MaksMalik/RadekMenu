import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string) || 'AIzaSyDDghJYWtr_WEXptOF1t5CB8Rvj0tAVuLY',
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'studio-4570303735-1a1b7.firebaseapp.com',
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string) || 'studio-4570303735-1a1b7',
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'studio-4570303735-1a1b7.firebasestorage.app',
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '364237142982',
  appId: (env.VITE_FIREBASE_APP_ID as string) || '1:364237142982:web:9f7f916cfbc7db1e6050c7',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
