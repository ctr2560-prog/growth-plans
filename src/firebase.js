import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBqDltyYSkZMWQiBRegJQF_oZwIOVHfxzY",
  authDomain: "data-visualiser-4af2c.firebaseapp.com",
  projectId: "data-visualiser-4af2c",
  storageBucket: "data-visualiser-4af2c.firebasestorage.app",
  messagingSenderId: "762953581413",
  appId: "1:762953581413:web:eb988c68e5bc34e57bd78c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
