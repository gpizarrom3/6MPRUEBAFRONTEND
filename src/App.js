import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Info, AlertTriangle, 
  CheckCircle2, ChevronRight, Briefcase, Zap, ShieldCheck,
  LayoutDashboard, History, Search, ArrowLeft
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { db, auth } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [tabActiva, setTabActiva] = useState('inicio');
  const [busqueda, setBusqueda] = useState('');

  // --- ESTADOS DE LA APLICACIÓN (Lógica de IA) ---
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]); 
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  const [aviso, setAviso] = useState(null); 
  const [incidencias, setIncidencias] = useState([]);

  // --- ESTADOS DE USUARIO ---
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [user, setUser] = useState(null);

  // 1. GESTIÓN DE SESIÓN Y SUSCRIPCIÓN
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) { setIsSubscribed(false); setCheckingSubscription(false); }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "customers", user.uid, "subscriptions"), where("status", "in", ["trailing", "active"]));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsSubscribed(!snapshot.empty);
        setCheckingSubscription(false);
      }, () => setCheckingSubscription(false));
      return () => unsubscribe();
    }
  }, [user]);

  // 2. CARGAR BITÁCORA
  useEffect(() => {
    if (user && tabActiva === 'bitacora') {
      const q = query(collection(db, "customers", user.uid, "incidencias"), orderBy("fecha", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIncidencias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [user, tabActiva]);

  // --- FUNCIONES ---
  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 5000);
  };

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Por favor, describe el contexto y el síntoma.");
    setLoading(true);
    setCategorias([]);
    setReporte(null);
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `CONTEXTO: ${contexto}. SÍNTOMA: ${sintomas}.` })
      });
      const data = await response.json();
      if (data.categorias) setCategorias(data.categorias);
    } catch (e) { alert("Error de conexión con la IA."); } finally { setLoading(false); }
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
      
      if (user) {
        await addDoc(collection(db, "customers", user.uid, "incidencias"), {
          titulo: `Análisis: ${contexto}`,
          descripcion: sintomas,
          solucion: data.hipotesis,
          tags: ["IA-6M", "ACR-Generado"],
          fecha: serverTimestamp()
        });
        mostrarAviso("✅ Reporte guardado en bitácora.");
      }
    } catch (e) { alert("Error al generar reporte."); } finally { setLoading(false); }
  };

  const resetearAuditoria = () => {
    setCategorias([]);
    setReporte(null);
    setContexto('');
    setSintomas('');
    setRespuestas({});
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col h-full z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Activity size={24} /></div>
            <h1 className="text-xl font-black tracking-tighter italic">AUDITORÍA<span className="text-blue-600">6M</span></h1>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'inicio' ? 'bg-blue-600 shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <LayoutDashboard size={18} /> Resumen
            </button>
            <button onClick={() => setTabActiva('nueva')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'nueva' ? 'bg-blue-600 shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <Zap size={18} /> Nueva Auditoría
            </button>
            <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'bitacora' ? 'bg-blue-600 shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <History size={18} /> Mi Bitácora
            </button>
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-white/5 bg-slate-950/50">
          <AuthCorner />
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL CON SCROLL PROPIO */}
      <main className="flex-1 overflow-y-auto relative p-10">
        
        {/* NOTIFICACIÓN FLOTANTE */}
        {aviso && (
          <div className="fixed bottom-10 right-10 z-[100] bg-slate-900 text-white p-6 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 border-l-4 border-yellow-400">
            <AlertTriangle className="text-yellow-400" size={20} />
            <p className="text-sm font-medium">{aviso}</p>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {checkingSubscription ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-xs font-black text-slate-400 tracking-widest uppercase">Sincronizando sistema...</p>
            </div>
          ) : !user ? (
            <section className="text-center py-20 space-y-6">
              <h2 className="text-5xl font-black">Acceso Restringido</h2>
              <p className="text-slate-500 text-xl">Por favor inicia sesión para usar el motor de IA.</p>
            </section>
          ) : (
            <>
              {/* VISTA RESUMEN */}
              {tabActiva === 'inicio' && (
                <div className="space-y-8 animate-in fade-in">
                  <h2 className="text-4xl font-black italic">Dashboard</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Auditorías Guardadas</p>
                      <p className="text-4xl font-black mt-1">{incidencias.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA NUEVA AUDITORÍA (Aquí ocurre el flujo de IA) */}
              {tabActiva === 'nueva' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-5">
                  
                  {/* PASO 1: FORMULARIO */}
                  {!categorias.length && !reporte && (
                    <section className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 space-y-8">
                      <div className="text-center">
                        <h2 className="text-3xl font-black">Diagnóstico Inicial</h2>
                        <p className="text-slate-400 italic">Analizador de Fallos 6M</p>
                      </div>
                      <div className="space-y-6">
                        <input className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all" 
                               value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="¿Dónde está el problema? (Ej: Prensa 5)" />
                        <textarea className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all h-32" 
                                  value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Describe los síntomas técnicos..." />
                        <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black text-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                          {loading ? "PROCESANDO..." : "INICIAR ANÁLISIS"} <ChevronRight />
                        </button>
                      </div>
                    </section>
                  )}

                  {/* PASO 2: PREGUNTAS (Aquí estaba el fallo) */}
                  {categorias.length > 0 && !reporte && (
                    <div className="space-y-12">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setCategorias([])} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-colors">
                          <ArrowLeft size={20} />
                        </button>
                        <h3 className="text-2xl font-black">Cuestionario de Auditoría</h3>
                      </div>
                      
                      <div className="space-y-16">
                        {categorias.map((cat, idx) => (
                          <div key={idx} className="space-y-6">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-50 px-4 py-2 rounded-full inline-block">{cat.nombre}</h4>
                            <div className="grid gap-6">
                              {cat.preguntas.map((pre, pIdx) => (
                                <div key={pIdx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:border-blue-200">
                                  <p className="font-black text-slate-800 text-lg mb-4">{pre.texto}</p>
                                  <input 
                                    onFocus={() => pre.aviso && mostrarAviso(pre.aviso)}
                                    onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pIdx}`]: e.target.value})}
                                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                                    placeholder="Respuesta técnica..."
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-green-600 text-white p-8 rounded-[3rem] font-black text-2xl shadow-2xl hover:bg-green-700 transition-all">
                        {loading ? "GENERANDO INFORME..." : "FINALIZAR ANÁLISIS"}
                      </button>
                    </div>
                  )}

                  {/* PASO 3: REPORTE */}
                  {reporte && (
                    <section className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl space-y-10 animate-in zoom-in-95 duration-500">
                      <div className="text-center space-y-4">
                        <CheckCircle2 className="mx-auto text-green-400" size={60} />
                        <h2 className="text-5xl font-black">Informe Generado</h2>
                      </div>
                      <div className="bg-blue-600/20 border border-blue-500/30 p-8 rounded-[3rem]">
                        <h5 className="font-black text-xl mb-4 flex items-center gap-2 text-blue-400 uppercase"><Info size={18} /> Hipótesis Sugerida</h5>
                        <p className="text-2xl font-medium italic">"{reporte.hipotesis}"</p>
                      </div>
                      <button onClick={resetearAuditoria} className="w-full py-6 text-slate-500 font-black uppercase hover:text-white transition-colors">
                        Iniciar Nueva Auditoría
                      </button>
                    </section>
                  )}
                </div>
              )}

              {/* VISTA BITÁCORA */}
              {tabActiva === 'bitacora' && (
                <div className="space-y-8 animate-in fade-in">
                  <header className="flex justify-between items-center">
                    <h2 className="text-4xl font-black italic">Bitácora</h2>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e)=>setBusqueda(e.target.value)} 
                             className="pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 text-sm w-64" />
                    </div>
                  </header>
                  <div className="grid gap-6 pb-20">
                    {incidencias
                      .filter(i => i.titulo?.toLowerCase().includes(busqueda.toLowerCase()))
                      .map((item) => (
                        <div key={item.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase mb-4 inline-block">
                            {item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : 'Reciente'}
                          </span>
                          <h4 className="text-xl font-black mb-4">{item.titulo}</h4>
                          <div className="bg-slate-50 p-5 rounded-2xl text-sm italic text-slate-600">
                             "{item.solucion}"
                          </div>
                        </div>
                      ))}
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
