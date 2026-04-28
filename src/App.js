import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Info, AlertTriangle, 
  CheckCircle2, ChevronRight, Briefcase, Zap, ShieldCheck,
  LayoutDashboard, History, Settings, LogOut
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db, auth, guardarReporteEnNube } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [tabActiva, setTabActiva] = useState('inicio');

  // --- ESTADOS DE LA APLICACIÓN ORIGINAL ---
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

  // --- LÓGICA DE NEGOCIO (Tus funciones originales) ---
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
    } catch (e) { alert("Error al conectar con la pasarela de pagos."); }
  };

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 5000);
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
      if (data.categorias) {
        setCategorias(data.categorias);
      }
    } catch (e) { alert("Error al conectar con el servidor de IA."); } finally { setLoading(false); }
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
      if (user) await guardarReporteEnNube(user.uid, user.email, contexto, sintomas, data);
    } catch (e) { alert("Error al generar el informe final."); } finally { setLoading(false); }
  };

  // --- RENDERIZADO PRINCIPAL ---
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100">
      
      {/* SIDEBAR FIJO */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col sticky top-0 h-screen z-50 shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Activity className="text-white" size={24} /></div>
            <h1 className="text-xl font-black tracking-tighter italic">AUDITORÍA<span className="text-blue-600">6M</span></h1>
          </div>
          
          <nav className="space-y-3">
            <button 
              onClick={() => setTabActiva('inicio')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm ${tabActiva === 'inicio' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <LayoutDashboard size={18} /> Resumen
            </button>
            <button 
              onClick={() => setTabActiva('nueva')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm ${tabActiva === 'nueva' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Zap size={18} /> Nueva Auditoría
            </button>
            <button 
              onClick={() => setTabActiva('bitacora')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm ${tabActiva === 'bitacora' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <History size={18} /> Mi Bitácora
            </button>
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5 bg-slate-950/50">
          <AuthCorner />
          {user && isSubscribed && (
            <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-green-400 bg-green-400/5 p-3 rounded-xl border border-green-400/20">
              <ShieldCheck size={14}/> PLAN SENIOR ACTIVO
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto relative">
        
        {/* AVISOS TÉCNICOS */}
        {aviso && (
          <div className="fixed bottom-10 right-10 z-[100] bg-slate-900/95 backdrop-blur-xl text-white p-6 rounded-[2rem] shadow-2xl flex items-start gap-4 animate-in slide-in-from-right-10 border-l-4 border-yellow-400 max-w-sm">
            <AlertTriangle className="text-yellow-400 shrink-0" size={20} />
            <p className="text-sm font-medium leading-relaxed">{aviso}</p>
          </div>
        )}

        <div className="p-10 max-w-5xl mx-auto">
          {checkingSubscription ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="font-black text-slate-400 tracking-widest text-xs uppercase">Sincronizando sistema...</p>
            </div>
          ) : !user ? (
            <section className="text-center py-20 space-y-8">
              <div className="inline-block bg-blue-50 p-6 rounded-[2.5rem] mb-4"><Zap className="text-blue-600" size={50} /></div>
              <h2 className="text-6xl font-black tracking-tight leading-tight">Inteligencia Industrial <br/><span className="text-blue-600">al alcance de tu mano.</span></h2>
              <p className="text-slate-500 max-w-lg mx-auto text-xl">Inicia sesión para acceder al motor de diagnóstico y bitácora técnica.</p>
            </section>
          ) : !isSubscribed ? (
            <section className="max-w-md mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 text-center space-y-8 mt-10">
              <Briefcase size={60} className="text-blue-600 mx-auto" />
              <h2 className="text-3xl font-black">Activar Plan Senior</h2>
              <p className="text-slate-500">Desbloquea el historial ilimitado y el motor de diagnóstico IA.</p>
              <button onClick={handleCheckout} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-3xl font-black text-xl transition-all shadow-xl shadow-blue-200">
                COMENZAR AHORA
              </button>
            </section>
          ) : (
            <>
              {/* VISTA: INICIO / RESUMEN */}
              {tabActiva === 'inicio' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <header>
                    <h2 className="text-4xl font-black tracking-tight">Panel de <span className="text-blue-600 italic">Control</span></h2>
                    <p className="text-slate-500 font-medium">Resumen general de tus activos y auditorías.</p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Auditorías</p>
                      <p className="text-4xl font-black">12</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Causas Identificadas</p>
                      <p className="text-4xl font-black text-blue-600">85%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA: NUEVA AUDITORÍA (Tu aplicación actual) */}
              {tabActiva === 'nueva' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-5 duration-500">
                  <section className="bg-white p-2 rounded-[3.5rem] shadow-xl border border-slate-100">
                    <div className="bg-slate-50/50 p-10 md:p-14 rounded-[3rem] border border-white space-y-10">
                      <div className="text-center">
                        <h2 className="text-4xl font-black tracking-tight">Nueva Auditoría 6M</h2>
                        <p className="text-slate-500 italic text-lg mt-2">"Encuentra la causa, detén el fallo."</p>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Localización</label>
                          <input className="w-full p-5 bg-white rounded-3xl border border-slate-200 outline-none text-lg font-medium" 
                            value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Ej: Planta de Energía, Turbina 4..." />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Síntomas Observados</label>
                          <textarea className="w-full p-5 bg-white rounded-3xl border border-slate-200 outline-none text-lg font-medium h-40" 
                            value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Describe la anomalía técnica..." />
                        </div>
                        <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 hover:bg-blue-600 text-white p-6 rounded-[2rem] font-black text-xl transition-all flex items-center justify-center gap-3">
                          {loading ? "PROCESANDO..." : "INICIAR DIAGNÓSTICO"} <ChevronRight />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* CUESTIONARIO Y REPORTE (Se mantienen igual) */}
                  {categorias.length > 0 && (
                    <div className="mt-20 space-y-10">
                       {/* ... Aquí va tu mapeo de categorías actual ... */}
                    </div>
                  )}
                  {reporte && (
                    <div className="mt-20">
                       {/* ... Aquí va tu sección de reporte actual ... */}
                    </div>
                  )}
                </div>
              )}

              {/* VISTA: BITÁCORA (Historial) */}
              {tabActiva === 'bitacora' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <header>
                    <h2 className="text-4xl font-black tracking-tight">Mi <span className="text-blue-600 italic">Bitácora</span></h2>
                    <p className="text-slate-500 font-medium">Historial técnico de fallos y soluciones aplicadas.</p>
                  </header>
                  <div className="bg-white p-10 rounded-[3rem] border border-dashed border-slate-300 text-center text-slate-400">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold tracking-tight">No hay registros pasados aún.</p>
                    <p className="text-sm">Completa una auditoría para verla reflejada aquí.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
