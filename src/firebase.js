import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQwszrwEyZkGgh3Ym2yEKYgbgk0kGTn5E",
  authDomain: "auditoria-6m-pro.firebaseapp.com",
  projectId: "auditoria-6m-pro",
  storageBucket: "auditoria-6m-pro.firebasestorage.app",
  messagingSenderId: "739778301047",
  appId: "1:739778301047:web:8eef0abab974a1be8d4a72",
  measurementId: "G-7D0FPPE849"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
