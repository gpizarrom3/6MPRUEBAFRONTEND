import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// Tu configuración (se mantiene usando variables de entorno)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

// Función para guardar auditorías en la nube
export const guardarReporteEnNube = async (userId, userEmail, contexto, sintomas, reporte) => {
  try {
    const docRef = await addDoc(collection(db, "auditorias"), {
      uid: userId,
      email: userEmail,
      lugar_equipo: contexto,
      descripcion_problema: sintomas,
      resultado_acr: reporte, // Aquí se guarda el JSON de Gemini
      fecha_creacion: serverTimestamp()
    });
    console.log("Auditoría protegida en Firestore con ID: ", docRef.id);
  } catch (error) {
    console.error("Error al respaldar en la nube: ", error);
  }
};

// Funciones de Auth
export const loginConGoogle = () => signInWithPopup(auth, provider);
export const cerrarSesion = () => signOut(auth);
