import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// --- TUS NUEVAS LLAVES PERSONALES ---
const firebaseConfig = {
  apiKey: "AIzaSyDqj3mSagZg6OJ_4OpZCAWPQ2k-SjZ4UeA",
  authDomain: "auditoria-6m-pro.firebaseapp.com",
  projectId: "auditoria-6m-pro",
  storageBucket: "auditoria-6m-pro.firebasestorage.app",
  messagingSenderId: "739778301047",
  appId: "1:739778301047:web:8eef0abab974a1be8d4a72",
  measurementId: "G-7D0FPPE849"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios para tu App
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

// Función para guardar auditorías (ahora en tu cuenta personal)
export const guardarReporteEnNube = async (userId, userEmail, contexto, sintomas, reporte) => {
  try {
    const docRef = await addDoc(collection(db, "auditorias"), {
      uid: userId,
      email: userEmail,
      lugar_equipo: contexto,
      descripcion_problema: sintomas,
      resultado_acr: reporte,
      fecha_creacion: serverTimestamp()
    });
    console.log("Auditoría protegida en tu cuenta personal. ID: ", docRef.id);
  } catch (error) {
    console.error("Error al respaldar: ", error);
  }
};

export const loginConGoogle = () => signInWithPopup(auth, provider);
export const cerrarSesion = () => signOut(auth);
