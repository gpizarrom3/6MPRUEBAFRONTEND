import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Briefcase, 
  Info, MessageSquare 
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db, auth, guardarReporteEnNube } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]); // Este es el estado vital
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [user, setUser] = useState(null);

  // --- LÓGICA DE USUARIO Y SUSCRIPCIÓN ---
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
      const q = query(
        collection(db, "customers", user.uid, "subscriptions"), 
        where("status", "in", ["trailing", "active"])
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsSubscribed(!snapshot.empty);
        setCheckingSubscription(false);
      }, () => setCheckingSubscription(false));
      return () => unsubscribe();
    }
  }, [user]);

  // --- LÓGICA DE PAGO (STRIPE) ---
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

  // --- LÓGICA DE IA (ESTO ES LO QUE ESTABA FALLANDO) ---
  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Por favor, describe el problema.");
    
    setLoading(true);
    setQuestions([]); // Limpiar pantalla antes de empezar
    setReporte(null);

    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify({ prompt: `SÍNTOMA: ${sintomas}. CONTEXTO: ${contexto}.` })
      });

      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      const data = await response.json();
      console.log("Datos capturados:", data);

      // Verificamos que 'preguntas' exista antes de actualizar el estado
      if (data && data.preguntas) {
        setQuestions(data.preguntas);
      } else {
        console.error("El servidor envió datos pero no la clave 'preguntas'", data);
      }

    } catch (error) { 
      console.error("Error en la llamada:", error);
      alert("La IA está tardando en responder. Revisa la consola.");
    } finally { 
      setLoading(false); 
    }
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
    } catch (error) { alert("Error al generar reporte"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <AuthCorner />
      
      <header className="bg-white border-b border-slate-200 p-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg"><Activity size={24} className="text-white" /></div>
          <h1 className="text-xl font-bold text-blue-900">Auditoría 6M</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 py-12">
        {checkingSubscription ? (
          <div className="text-center p-20 font-black text-slate-400">VERIFICANDO ACCESO...</div>
        ) : !user ? (
          <div className="text-center space-y-6 py-20">
            <h2 className="text-4xl font-black">Bienvenido al Sistema 6M</h2>
            <p className="text-slate-500">Inicia sesión arriba a la derecha para comenzar.</p>
          </div>
        ) : !isSubscribed ? (
          <div className="max-w-md mx-auto p-10 bg-white rounded-[40px] shadow-2xl border-2 border-blue-100 text-center space-y-6">
            <Briefcase size={48} className="text-blue-600 mx-auto" />
            <h2 className="text-3xl font-black">Acceso Premium</h2>
            <p>Necesitas una suscripción activa para usar la IA de Auditoría.</p>
            <button onClick={handleCheckout} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-xl">
              ACTIVAR PLAN SENIOR
            </button>
          </div>
        ) : (
          /* PANTALLA PRINCIPAL DE AUDITORÍA */
          <div className="space-y-12">
             <section className="space-y-8">
                <h2 className="text-3xl font-black text-center">¡Hola! <span className="text-blue-600">Iniciemos el análisis.</span></h2>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-4">
                  <input className="w-full p-4 bg-slate-50 rounded-xl" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="¿Dónde ocurre el fallo?" />
                  <textarea className="w-full p-4 bg-slate-50 rounded-xl h-24" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Describe el problema técnico..." />
                  <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">
                    {loading ? "LA IA ESTÁ PENSANDO..." : "EMPEZAR AUDITORÍA"}
                  </button>
                </div>
             </section>

             {/* BLOQUE DINÁMICO: ESTO ES LO QUE SE DIBUJA CUANDO LLEGAN LAS PREGUNTAS */}
             {questions.length > 0 && (
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 text-blue-900">
                    <ClipboardCheck size={28} />
                    <h3 className="text-2xl font-black">Cuestionario de Diagnóstico</h3>
                  </div>
                  <div className="grid gap-4">
                    {questions.map((q, index) => (
                      <div key={index} className="bg-white p-6 rounded-2xl shadow-md border-l-4 border-blue-600">
                        <p className="font-bold text-slate-800 mb-3">{q}</p>
                        <input 
                          className="w-full p-3 bg-slate-50 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Tu respuesta técnica..."
                          onChange={(e) => setRespuestas({...respuestas, [index]: e.target.value})}
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleGenerateACR} className="w-full bg-green-600 text-white p-5 rounded-2xl font-black text-xl hover:bg-green-700 shadow-xl transition-all">
                    GENERAR REPORTE ACR FINAL
                  </button>
                </section>
             )}

             {/* BLOQUE DEL REPORTE FINAL */}
             {reporte && (
                <section className="bg-blue-900 text-white p-8 rounded-[40px] shadow-2xl space-y-6">
                  <h3 className="text-2xl font-black flex items-center gap-2"><Info /> Diagnóstico ACR Generado</h3>
                  <div className="bg-white/10 p-6 rounded-2xl font-mono text-sm overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(reporte, null, 2)}</pre>
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
