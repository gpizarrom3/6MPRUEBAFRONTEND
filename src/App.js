import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Briefcase, 
  Info, ChevronRight, MessageSquare, MapPin 
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db, auth, guardarReporteEnNube } from './firebase'; // Asegúrate de que guardarReporteEnNube esté en tu firebase.js
import AuthCorner from './AuthCorner';

function App() {
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  
  // Estados de Suscripción
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [user, setUser] = useState(null);

  // 1. ESCUCHAR CAMBIOS DE USUARIO
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsSubscribed(false);
        setCheckingSubscription(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. ESCUCHAR SUSCRIPCIÓN (Solo si hay usuario)
  useEffect(() => {
    if (user) {
      setCheckingSubscription(true);
      const subscriptionsRef = collection(db, "customers", user.uid, "subscriptions");
      const q = query(subscriptionsRef, where("status", "in", ["trailing", "active"]));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsSubscribed(!snapshot.empty);
        setCheckingSubscription(false);
      }, (error) => {
        console.log("Error o sin suscripción aún", error);
        setCheckingSubscription(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // 3. LÓGICA DE PAGO
  const handleCheckout = async () => {
    try {
      const userId = user.uid;
      const checkoutSessionsRef = collection(db, "customers", userId, "checkout_sessions");
      
      const docRef = await addDoc(checkoutSessionsRef, {
        price: "TU_CODIGO_PRICE_AQUI", // <--- PEGA AQUÍ TU price_...
        success_url: window.location.origin,
        cancel_url: window.location.origin,
      });

      onSnapshot(docRef, (snap) => {
        const { url } = snap.data() || {};
        if (url) window.location.assign(url);
      });
    } catch (e) {
      alert("Error al conectar con Stripe");
    }
  };

  // --- LÓGICA DE IA (Tus funciones de siempre) ---
  const handleGenerateEntrevista = async () => {
    setLoading(true);
    setQuestions([]);
    setReporte(null);
    setRespuestas({});
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `SÍNTOMA: ${sintomas}. CONTEXTO: ${contexto}.`,
          systemPrompt: `Eres un Consultor Senior de Mantenimiento...`
        })
      });
      const data = await response.json();
      setQuestions(data.categorias || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const promptACR = `SÍNTOMA: ${sintomas}. RESPUESTAS: ${JSON.stringify(respuestas)}`;
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptACR,
          systemPrompt: `Eres un Experto en ACR...`
        })
      });
      const data = await response.json();
      setReporte(data);
      if (user) await guardarReporteEnNube(user.uid, user.email, contexto, sintomas, data);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (error) { alert("Error"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* EL LOGIN SIEMPRE DISPONIBLE */}
      <AuthCorner />

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 p-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg"><Activity size={24} className="text-white" /></div>
            <h1 className="text-xl font-bold text-blue-900">Auditoría 6M</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 py-12">
        {checkingSubscription ? (
          <div className="text-center p-20 font-black text-slate-400">VERIFICANDO ACCESO...</div>
        ) : !user ? (
          /* PANTALLA INICIAL (Sin login) */
          <div className="text-center space-y-6">
            <h2 className="text-4xl font-black">Bienvenido al Sistema 6M</h2>
            <p className="text-slate-500">Por favor, inicia sesión para comenzar el diagnóstico.</p>
          </div>
        ) : !isSubscribed ? (
          /* MURO DE PAGO */
          <div className="max-w-md mx-auto p-10 bg-white rounded-[40px] shadow-2xl border-2 border-blue-100 text-center space-y-6">
            <Briefcase size={48} className="text-blue-600 mx-auto" />
            <h2 className="text-3xl font-black">Acceso Profesional</h2>
            <p>Hola <strong>{user.displayName}</strong>, activa tu plan para usar la IA.</p>
            <button onClick={handleCheckout} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-xl">
              ACTIVAR PLAN SENIOR
            </button>
          </div>
        ) : (
          /* APP COMPLETA (Cuando ya pagó) */
          <div className="space-y-12">
             {/* Aquí va todo tu contenido de inputs, preguntas y reporte final... */}
             <section className="space-y-8">
                <h2 className="text-3xl font-black text-center">¡Hola! <span className="text-blue-600">Cuéntanos tu problema.</span></h2>
                {/* ... Resto de tus inputs de siempre ... */}
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-4">
                  <input className="w-full p-4 bg-slate-50 rounded-xl" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="¿Dónde ocurre?" />
                  <textarea className="w-full p-4 bg-slate-50 rounded-xl h-24" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="¿Qué ocurre?" />
                  <button onClick={handleGenerateEntrevista} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">EMPEZAR</button>
                </div>
             </section>
             {/* (No olvides incluir el mapeo de questions y el reporte final aquí) */}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
