import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Info, AlertTriangle, 
  CheckCircle2, ChevronRight, Briefcase, Zap, ShieldCheck
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db, auth, guardarReporteEnNube } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  // --- ESTADOS DE LA APLICACIÓN ---
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]); 
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  const [aviso, setAviso] = useState(null); 

  // --- ESTADOS DE USUARIO Y SUSCRIPCIÓN ---
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [user, setUser] = useState(null);

  // 1. ESCUCHAR AUTENTICACIÓN
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

  // 2. ESCUCHAR SUSCRIPCIÓN EN FIREBASE (Stripe Extension)
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

  // 3. PASARELA DE PAGO STRIPE
  const handleCheckout = async () => {
    try {
      const docRef = await addDoc(collection(db, "customers", user.uid, "checkout_sessions"), {
        price: "price_1TQTdWLEgsq59JtN45ekCQxT", // Tu ID de producto en Stripe
        success_url: window.location.origin,
        cancel_url: window.location.origin,
      });
      onSnapshot(docRef, (snap) => {
        const { url } = snap.data() || {};
        if (url) window.location.assign(url);
      });
    } catch (e) { alert("Error al conectar con la pasarela de pagos."); }
  };

  // --- LÓGICA DE INTERACCIÓN ---

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 5000); // El pop-up desaparece en 5 segundos
  };

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Por favor, describe el contexto y el síntoma.");
    setLoading(true);
    setCategorias([]);
    setReporte(null);
    setRespuestas({});

    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `CONTEXTO: ${contexto}. SÍNTOMA: ${sintomas}.` })
      });
      const data = await response.json();
      
      // Validamos que la IA nos devuelva las categorías 6M
      if (data.categorias) {
        setCategorias(data.categorias);
        window.scrollTo({ top: 600, behavior: 'smooth' });
      }
    } catch (e) { 
      console.error(e);
      alert("Error al conectar con el servidor de IA.");
    } finally { setLoading(false); }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const promptACR = `SÍNTOMA ORIGINAL: ${sintomas}. RESPUESTAS DE AUDITORÍA: ${JSON.stringify(respuestas)}`;
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptACR })
      });
      const data = await response.json();
      setReporte(data);
      
      // Guardar automáticamente en la nube si hay usuario
      if (user) await guardarReporteEnNube(user.uid, user.email, contexto, sintomas, data);
      
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 500);
    } catch (e) { alert("Error al generar el informe final."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24 selection:bg-blue-100">
      <AuthCorner />
      
      {/* POP-UP TÉCNICO (Toast Notification) */}
      {aviso && (
        <div className="fixed bottom-10 right-5 md:right-10 z-[100] bg-slate-900/95 backdrop-blur-xl text-white p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-start gap-4 animate-in slide-in-from-right-10 border-l-4 border-yellow-400 max-w-sm">
          <div className="bg-yellow-400/20 p-2 rounded-xl">
            <AlertTriangle className="text-yellow-400" size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 mb-1">Nota de Seguridad</p>
            <p className="text-sm font-medium leading-relaxed">{aviso}</p>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 p-5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-2xl shadow-lg shadow-blue-200"><Activity className="text-white" /></div>
            <h1 className="text-2xl font-black tracking-tighter italic">AUDITORÍA<span className="text-blue-600">6M</span></h1>
          </div>
          {user && isSubscribed && (
            <span className="hidden md:flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-xs font-black border border-green-100">
              <ShieldCheck size={14}/> PLAN SENIOR ACTIVO
            </span>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 mt-10">
        
        {checkingSubscription ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="font-black text-slate-400 tracking-widest text-xs uppercase">Sincronizando con la nube...</p>
          </div>
        ) : !user ? (
          /* PANTALLA BIENVENIDA */
          <section className="text-center py-20 space-y-8 animate-in fade-in duration-1000">
            <div className="inline-block bg-blue-50 p-4 rounded-3xl mb-4"><Zap className="text-blue-600" size={40} /></div>
            <h2 className="text-5xl font-black tracking-tight">Inteligencia Industrial <br/><span className="text-blue-600">al alcance de tu mano.</span></h2>
            <p className="text-slate-500 max-w-lg mx-auto text-lg">Inicia sesión para acceder al motor de diagnóstico 6M y generar reportes ACR profesionales.</p>
          </section>
        ) : !isSubscribed ? (
          /* MURO DE PAGO (PAYWALL) */
          <section className="max-w-md mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 text-center space-y-8 mt-10 animate-in zoom-in duration-500">
            <Briefcase size={60} className="text-blue-600 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight">Plan Senior</h2>
              <p className="text-slate-500 text-sm">Desbloquea el análisis ilimitado por IA, almacenamiento en la nube y exportación de reportes.</p>
            </div>
            <button onClick={handleCheckout} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-3xl font-black text-xl transition-all shadow-xl shadow-blue-100">
              ACTIVAR SUSCRIPCIÓN
            </button>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pago seguro vía Stripe</p>
          </section>
        ) : (
          /* APLICACIÓN PRINCIPAL */
          <div className="space-y-20 animate-in fade-in duration-700">
            
            {/* HERO & INPUTS */}
            <section className="bg-white p-2 rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] border border-slate-100">
              <div className="bg-slate-50/50 p-10 md:p-14 rounded-[3rem] border border-white space-y-10">
                <div className="text-center space-y-2">
                  <h2 className="text-4xl font-black tracking-tight">Nueva Auditoría</h2>
                  <p className="text-slate-500 font-medium italic text-lg">"Encuentra la causa, detén el fallo."</p>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Localización del Evento</label>
                    <input 
                      className="w-full p-5 bg-white rounded-3xl shadow-sm border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg font-medium" 
                      value={contexto} onChange={(e)=>setContexto(e.target.value)} 
                      placeholder="Ej: Planta de Energía, Turbina 4..." 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción de la Anomalía</label>
                    <textarea 
                      className="w-full p-5 bg-white rounded-3xl shadow-sm border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg font-medium h-40" 
                      value={sintomas} onChange={(e)=>setSintomas(e.target.value)} 
                      placeholder="Describe los síntomas técnicos observados..." 
                    />
                  </div>
                  <button 
                    onClick={handleGenerateEntrevista} 
                    disabled={loading} 
                    className="w-full bg-slate-900 hover:bg-blue-600 text-white p-6 rounded-[2rem] font-black text-xl transition-all shadow-2xl flex items-center justify-center gap-3 group"
                  >
                    {loading ? "ANALIZANDO ESCENARIO..." : <>INICIAR PROCESO 6M <ChevronRight className="group-hover:translate-x-2 transition-transform" /></>}
                  </button>
                </div>
              </div>
            </section>

            {/* CUESTIONARIO DINÁMICO */}
            {categorias.length > 0 && (
              <section className="space-y-12 pb-20">
                <div className="flex flex-col items-center gap-2 text-center">
                  <ClipboardCheck size={40} className="text-blue-600" />
                  <h3 className="text-3xl font-black tracking-tight">Protocolo de Recolección</h3>
                  <p className="text-slate-500">Responde las siguientes categorías para profundizar en el ACR.</p>
                </div>

                <div className="space-y-16">
                  {categorias.map((cat, idx) => (
                    <div key={idx} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="h-[2px] flex-grow bg-slate-200"></div>
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-50 px-4 py-2 rounded-full border border-blue-100">{cat.nombre}</h4>
                        <div className="h-[2px] flex-grow bg-slate-200"></div>
                      </div>

                      <div className="grid gap-6">
                        {cat.preguntas.map((pre, pIdx) => (
                          <div key={pIdx} className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <p className="font-black text-slate-800 text-lg mb-4 leading-tight">{pre.texto}</p>
                            <input 
                              onFocus={() => mostrarAviso(pre.aviso)}
                              onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pIdx}`]: e.target.value})}
                              className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                              placeholder="Ingresa observación técnica..."
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleGenerateACR} 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white p-8 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-green-100 transition-all hover:scale-[1.02] active:scale-95"
                >
                  {loading ? "GENERANDO INFORME..." : "FINALIZAR Y GENERAR REPORTE ACR"}
                </button>
              </section>
            )}

            {/* REPORTE ACR FINAL (PREMIUM DARK) */}
            {reporte && (
              <section className="bg-slate-900 text-white p-10 md:p-16 rounded-[4rem] shadow-2xl space-y-12 border-t-[16px] border-blue-600 animate-in zoom-in duration-700">
                <div className="text-center space-y-4">
                  <CheckCircle2 className="mx-auto text-green-400" size={60} />
                  <h2 className="text-5xl font-black tracking-tighter">Informe de Ingeniería</h2>
                  <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {Object.entries(reporte.resumen_6m || {}).map(([key, val]) => (
                    <div key={key} className="bg-white/5 p-6 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors">
                      <h5 className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-2">{key}</h5>
                      <p className="text-slate-300 text-sm leading-relaxed">{val}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-[3rem] shadow-xl">
                  <h5 className="font-black text-2xl mb-4 flex items-center gap-3 italic"><Info /> Hipótesis de Causa Raíz</h5>
                  <p className="text-blue-50 text-xl font-medium leading-relaxed italic">"{reporte.hipotesis}"</p>
                </div>

                <div className="space-y-6">
                  <h5 className="font-black text-xl ml-4">Contramedidas Sugeridas</h5>
                  <div className="space-y-3">
                    {reporte.recomendaciones?.map((rec, i) => (
                      <div key={i} className="flex gap-5 bg-white/5 p-6 rounded-3xl border border-white/5 items-center">
                        <div className="bg-blue-600 h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-black text-sm">{i+1}</div>
                        <p className="text-slate-200 font-medium">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => window.print()} 
                  className="w-full py-4 text-slate-500 font-bold text-xs uppercase tracking-[0.3em] border border-slate-800 rounded-full hover:bg-white/5 transition-all"
                >
                  Click para exportar documento PDF
                </button>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

export default App;
