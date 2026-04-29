import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Tus credenciales reales extraídas de tu captura
const firebaseConfig = {
  apiKey: "AIzaSyAUh9aLqIcjsODagU_0XSGnczWJgK5iGUU",
  authDomain: "gen-lang-client-0190458729.firebaseapp.com",
  projectId: "gen-lang-client-0190458729",
  storageBucket: "gen-lang-client-0190458729.firebasestorage.app",
  messagingSenderId: "198510499865",
  appId: "1:198510499865:web:bdb03240bc67a4de957288",
  measurementId: "G-NX17L5RMMS"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos los servicios que el Dashboard (App.js) necesita
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
