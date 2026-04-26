import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Briefcase, 
  Info, ChevronRight, MessageSquare, MapPin 
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db, auth, guardarReporteEnNube } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [user, setUser] = useState(null);

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

  useEffect(() => {
    if (user) {
      setCheckingSubscription(true);
      const subscriptionsRef = collection(db, "customers", user.uid, "subscriptions");
      const q = query(subscriptionsRef, where("status", "in", ["trailing", "active"]));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsSubscribed(!snapshot.empty);
        setCheckingSubscription(false);
      }, (error) => {
        setCheckingSubscription(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleCheckout = async () => {
    try {
      const docRef = await addDoc(collection(db, "customers", user.uid, "checkout_sessions"), {
        price: "price_1TQTdWLEgsq59JtN45ekCQxT", 
        success_url: window.location.origin,
        cancel_url: window.location.origin,
      });
      onSnapshot(docRef, (snap) => {
        const { url } = snap.data() || {};
        if (url) window.location.assign(url);
      });
    } catch (e) { alert("Error con Stripe"); }
  };

  // --- LÓGICA DE IA CORREGIDA ---
  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Completa los campos");
    setLoading(true);
    setQuestions([]);
    setReporte(null);
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `SÍNTOMA: ${sintomas}. CONTEXTO: ${contexto}.` })
      });
      const data = await response.json();
      console.log("Datos recibidos:", data);

      // AQUÍ ESTABA EL ERROR: Usamos 'preguntas' que es lo que manda el server
      if (data.preguntas) {
        setQuestions(data.preguntas);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            prompt: `SÍNTOMA: ${sintomas}. RESPUESTAS: ${JSON.stringify(respuestas)}`,
            systemPrompt: "Genera un reporte ACR final detallado." 
        })
      });
      const data = await response.json();
      setReporte(data);
      if (user) await guardarReporteEnNube(user.uid, user.email, contexto, sintomas, data);
    } catch (error) { alert("Error en reporte"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <AuthCorner />
      <header className="bg-white border-b border-slate-200 p-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg"><Activity size={24} className="text-white" /></div>
          <h1 className="text-xl font-bold text-blue-900">Auditoría 6M - SpA</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 py-12">
        {checkingSubscription ? (
          <div className="text-center p-20 font-black text-slate-400">VERIFICANDO ACCESO...</div>
        ) : !user ? (
          <div className="text-center space-y-6">
            <h2 className="text-4xl font-black">Bienvenido al Sistema 6M</h2>
            <p className="text-slate-500">Inicia sesión para comenzar.</p>
          </div>
        ) : !isSubscribed ? (
          <div className="max-w-md mx-auto p-10 bg-white rounded-[40px] shadow-2xl border-2 border-blue-100 text-center space-y-6">
            <Briefcase size={48} className="text-blue-600 mx-auto" />
            <h2 className="text-3xl font-black">Plan Profesional</h2>
            <button onClick={handleCheckout} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-xl">
              ACTIVAR PLAN SENIOR
            </button>
          </div>
        ) : (
          <div className="space-y-12">
             <section className="space-y-8">
                <h2 className="text-3xl font-black text-center">¡Hola! <span className="text-blue-600">Nueva Auditoría.</span></h2>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-4">
                  <input className="w-full p-4 bg-slate-50 rounded-xl" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="¿Dónde ocurre? (Ej: Planta 1)" />
                  <textarea className="w-full p-4 bg-slate-50 rounded-xl h-24" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="¿Cuál es el problema técnico?" />
                  <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">
                    {loading ? "GENERANDO..." : "EMPEZAR AUDITORÍA"}
                  </button>
                </div>
             </section>

             {/* ESTO ES LO QUE TE FALTABA: EL MAPEO DE PREGUNTAS */}
             {questions.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-blue-900">
                    <ClipboardCheck size={28} />
                    <h3 className="text-2xl font-black">Cuestionario 6M</h3>
                  </div>
                  <div className="grid gap-4">
                    {questions.map((q, index) => (
                      <div key={index} className="bg-white p-6 rounded-2xl shadow-md border border-slate-100">
                        <p className="font-bold text-slate-800 mb-3">{q}</p>
                        <input 
                          className="w-full p-3 bg-slate-50 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Tu respuesta..."
                          onChange={(e) => setRespuestas({...respuestas, [index]: e.target.value})}
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleGenerateACR} className="w-full bg-green-600 text-white p-5 rounded-2xl font-black text-xl">
                    GENERAR REPORTE FINAL
                  </button>
                </section>
             )}

             {reporte && (
                <section className="bg-blue-900 text-white p-8 rounded-[40px] shadow-2xl">
                  <h3 className="text-2xl font-black mb-4 flex items-center gap-2"><Info /> Resultado</h3>
                  <div className="bg-white/10 p-6 rounded-2xl text-lg">
                    {typeof reporte === 'object' ? JSON.stringify(reporte, null, 2) : reporte}
                  </div>
                </section>
             )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
