import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDDghJYWtr_WEXptOF1t5CB8Rvj0tAVuLY',
  authDomain: 'studio-4570303735-1a1b7.firebaseapp.com',
  projectId: 'studio-4570303735-1a1b7',
  storageBucket: 'studio-4570303735-1a1b7.firebasestorage.app',
  messagingSenderId: '364237142982',
  appId: '1:364237142982:web:9f7f916cfbc7db1e6050c7',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
