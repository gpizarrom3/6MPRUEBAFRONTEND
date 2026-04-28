import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Info, AlertTriangle, 
  CheckCircle2, ChevronRight, Briefcase, Zap, ShieldCheck,
  LayoutDashboard, History, Search, ArrowLeft, ThumbsUp, ThumbsDown 
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, addDoc, 
  orderBy, serverTimestamp, doc, updateDoc 
} from "firebase/firestore";
import { db, auth } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  // --- ESTADOS DE NAVEGACIÓN Y BÚSQUEDA ---
  const [tabActiva, setTabActiva] = useState('inicio');
  const [busqueda, setBusqueda] = useState('');

  // --- ESTADOS DE LA APLICACIÓN (IA Y DATOS) ---
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]); 
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  const [aviso, setAviso] = useState(null); 
  const [incidencias, setIncidencias] = useState([]);

  // --- ESTADOS DE USUARIO ---
  const [user, setUser] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

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

  // 2. LISTENER DE BITÁCORA (Carga automática)
  useEffect(() => {
    if (user) {
      const q = query(collection(db, "customers", user.uid, "incidencias"), orderBy("fecha", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIncidencias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [user]);

  // --- MOTOR DE APRENDIZAJE Y FEEDBACK ---
  const enviarFeedback = async (id, fueExitosa, solucionAnterior) => {
    try {
      const docRef = doc(db, "customers", user.uid, "incidencias", id);
      let solucionDefinitiva = solucionAnterior;
      
      if (!fueExitosa) {
        const manual = prompt("La IA no acertó. ¿Cuál fue la solución real para guardar en memoria?");
        if (!manual) return;
        solucionDefinitiva = manual;
      }

      await updateDoc(docRef, {
        estado: "resuelto",
        ia_acerto: fueExitosa,
        solucion_final: solucionDefinitiva,
        fecha_resolucion: serverTimestamp()
      });
      mostrarAviso("🧠 Conocimiento guardado en memoria central.");
    } catch (e) { alert("Error al actualizar aprendizaje."); }
  };

  // --- FUNCIONES DE IA CON MEMORIA CONTEXTUAL ---
  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Describe el problema.");
    setLoading(true);
    setCategorias([]);
    setReporte(null);

    // BÚSQUEDA DE SIMILITUDES EN BITÁCORA
    const palabrasClave = sintomas.toLowerCase().split(' ').filter(p => p.length > 4);
    const coincidencia = incidencias.find(inc => 
      inc.estado === 'resuelto' && 
      palabrasClave.some(p => inc.titulo.toLowerCase().includes(p) || inc.descripcion.toLowerCase().includes(p))
    );

    const memoriaContexto = coincidencia 
      ? `[MEMORIA]: El ${coincidencia.fecha?.toDate().toLocaleDateString()} ocurrió algo similar. Solución validada: ${coincidencia.solucion_final}.`
      : "";

    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `${memoriaContexto} CONTEXTO: ${contexto}. SÍNTOMA: ${sintomas}.` 
        })
      });
      const data = await response.json();
      if (data.categorias) {
        setCategorias(data.categorias);
        if (coincidencia) mostrarAviso("🔍 Se detectó un caso similar en tu bitácora.");
      }
    } catch (e) { alert("Error de conexión"); } finally { setLoading(false); }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const promptACR = `SÍNTOMA: ${sintomas}. RESPUESTAS: ${JSON.stringify(respuestas)}`;
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
          estado: "pendiente",
          ia_acerto: null,
          solucion_final: "",
          fecha: serverTimestamp()
        });
      }
    } catch (e) { alert("Error ACR"); } finally { setLoading(false); }
  };

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 5000);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col h-full z-50 shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Activity size={24} /></div>
            <h1 className="text-xl font-black italic tracking-tighter italic">AUDITORÍA<span className="text-blue-600">6M</span></h1>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'inicio' ? 'bg-blue-600 shadow-xl shadow-blue-600/30 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              <LayoutDashboard size={18} /> Resumen
            </button>
            <button onClick={() => setTabActiva('nueva')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'nueva' ? 'bg-blue-600 shadow-xl shadow-blue-600/30 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              <Zap size={18} /> Nueva Auditoría
            </button>
            <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'bitacora' ? 'bg-blue-600 shadow-xl shadow-blue-600/30 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              <History size={18} /> Mi Bitácora
            </button>
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-white/5 bg-slate-950/50"><AuthCorner /></div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-10 relative">
        {aviso && (
          <div className="fixed bottom-10 right-10 z-[100] bg-slate-900 text-white p-6 rounded-3xl shadow-2xl flex items-start gap-4 animate-in slide-in-from-right-10 border-l-4 border-yellow-400 max-w-sm">
            <AlertTriangle className="text-yellow-400 shrink-0" size={20} />
            <p className="text-sm font-medium leading-relaxed">{aviso}</p>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {checkingSubscription ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="font-black text-slate-400 tracking-widest text-xs uppercase text-center">Sincronizando Cerebro Digital...</p>
            </div>
          ) : !user ? (
            <section className="text-center py-20 space-y-6">
              <h2 className="text-5xl font-black italic uppercase tracking-tighter">Acceso Restringido</h2>
              <p className="text-slate-500 text-xl font-medium">Inicia sesión para acceder a tu historial técnico.</p>
            </section>
          ) : (
            <>
              {/* VISTA RESUMEN */}
              {tabActiva === 'inicio' && (
                <div className="space-y-10 animate-in fade-in">
                  <header>
                    <h2 className="text-4xl font-black tracking-tight uppercase italic font-black uppercase tracking-tighter text-slate-800">Panel <span className="text-blue-600 italic font-black uppercase tracking-tighter">Senior</span></h2>
                    <p className="text-slate-500 font-medium">Resumen de inteligencia y activos.</p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 italic">Casos Resueltos</p>
                      <p className="text-5xl font-black text-green-500">{incidencias.filter(i => i.estado === 'resuelto').length}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 italic">Pendientes de Aprendizaje</p>
                      <p className="text-5xl font-black text-yellow-500">{incidencias.filter(i => i.estado === 'pendiente').length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA NUEVA AUDITORÍA */}
              {tabActiva === 'nueva' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-5">
                  {!categorias.length && !reporte && (
                    <section className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 space-y-8">
                      <div className="text-center">
                        <h2 className="text-4xl font-black tracking-tighter mb-2 italic uppercase">Nueva Auditoría Técnica</h2>
                        <p className="text-slate-400 font-medium italic">Motor de Diagnóstico 6M & ACR</p>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Ubicación del Activo</label>
                          <input className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600 outline-none text-lg font-medium transition-all" 
                                 value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Ej: Planta A, Motor 4..." />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción de Fallo</label>
                          <textarea className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600 outline-none text-lg font-medium h-40 transition-all" 
                                    value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="¿Qué síntomas presenta el equipo?" />
                        </div>
                        <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 hover:bg-blue-600 text-white p-6 rounded-[2rem] font-black text-xl transition-all shadow-2xl flex items-center justify-center gap-3">
                          {loading ? "PROCESANDO..." : "INICIAR ANÁLISIS"} <ChevronRight />
                        </button>
                      </div>
                    </section>
                  )}

                  {/* CUESTIONARIO DINÁMICO */}
                  {categorias.length > 0 && !reporte && (
                    <div className="space-y-12 pb-20 animate-in fade-in">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setCategorias([])} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-colors"><ArrowLeft size={20} /></button>
                        <h3 className="text-2xl font-black italic uppercase">Cuestionario 6M</h3>
                      </div>
                      {categorias.map((cat, idx) => (
                        <div key={idx} className="space-y-6">
                          <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-50 px-4 py-2 rounded-full border border-blue-100 inline-block shadow-sm">{cat.nombre}</h4>
                          <div className="grid gap-6">
                            {cat.preguntas.map((pre, pIdx) => (
                              <div key={pIdx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                                <p className="font-black text-slate-800 text-lg mb-4 leading-tight">{pre.texto}</p>
                                <input onFocus={() => mostrarAviso(pre.aviso)} onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pIdx}`]: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium" placeholder="Escribe observación técnica..." />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white p-8 rounded-[3rem] font-black text-2xl shadow-2xl transition-all">
                        {loading ? "GENERANDO ACR..." : "FINALIZAR DIAGNÓSTICO"}
                      </button>
                    </div>
                  )}

                  {/* REPORTE ACR FINAL */}
                  {reporte && (
                    <section className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl space-y-12 border-t-[16px] border-blue-600 animate-in zoom-in-95">
                      <div className="text-center space-y-4">
                        <CheckCircle2 className="mx-auto text-green-400" size={60} />
                        <h2 className="text-5xl font-black italic uppercase tracking-tighter italic">Análisis Final</h2>
                      </div>
                      <div className="bg-blue-600/20 p-10 rounded-[3rem] border border-blue-500/30">
                        <h5 className="font-black text-2xl mb-4 flex items-center gap-3 italic font-black uppercase tracking-tighter text-blue-400"><Info /> Hipótesis de Causa Raíz</h5>
                        <p className="text-blue-50 text-2xl font-medium leading-relaxed italic">"{reporte.hipotesis}"</p>
                      </div>
                      <button onClick={() => {setReporte(null); setCategorias([]); setContexto(''); setSintomas('');}} className="w-full py-6 text-slate-500 font-black uppercase hover:text-white transition-all italic tracking-widest text-sm">Realizar nueva auditoría</button>
                    </section>
                  )}
                </div>
              )}

              {/* VISTA BITÁCORA CON APRENDIZAJE */}
              {tabActiva === 'bitacora' && (
                <div className="space-y-8 animate-in fade-in pb-20">
                  <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-4xl font-black italic uppercase tracking-tighter italic">Mi <span className="text-blue-600 italic">Bitácora</span></h2>
                      <p className="text-slate-500 font-medium italic">Historial de soluciones validadas.</p>
                    </div>
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 outline-none shadow-sm transition-all text-sm" />
                    </div>
                  </header>

                  <div className="grid gap-8">
                    {incidencias
                      .filter(i => i.titulo?.toLowerCase().includes(busqueda.toLowerCase()) || i.descripcion?.toLowerCase().includes(busqueda.toLowerCase()))
                      .map((item) => (
                      <div key={item.id} className={`bg-white p-10 rounded-[3.5rem] border transition-all ${item.estado === 'resuelto' ? 'border-green-100 shadow-sm shadow-green-50' : 'border-slate-100 shadow-xl ring-1 ring-slate-200/50'}`}>
                        <div className="flex justify-between items-start mb-6">
                          <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${item.estado === 'resuelto' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700 animate-pulse'}`}>
                            {item.estado === 'resuelto' ? '✓ Caso Cerrado' : '⚠ Diagnóstico en Proceso'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-300 italic">{item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : 'Pendiente'}</span>
                        </div>
                        
                        <h4 className="text-2xl font-black mb-6 italic uppercase tracking-tight italic">{item.titulo}</h4>
                        
                        <div className="grid md:grid-cols-2 gap-6 mb-8 text-sm">
                          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2 italic tracking-widest">Descripción del Evento</p>
                            <p className="text-slate-600 leading-relaxed font-medium">{item.descripcion}</p>
                          </div>
                          <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                            <p className="text-[10px] font-black uppercase text-blue-600 mb-2 italic tracking-widest">Predicción del Sistema</p>
                            <p className="text-blue-900 font-bold italic leading-relaxed">"{item.solucion}"</p>
                          </div>
                        </div>

                        {item.estado !== 'resuelto' ? (
                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                            <p className="text-xs font-black text-slate-500 text-center uppercase tracking-widest mb-4">¿Sirvió esta recomendación?</p>
                            <div className="flex gap-4">
                              <button onClick={() => enviarFeedback(item.id, true, item.solucion)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2">
                                <ThumbsUp size={16} /> VALIDAR SOLUCIÓN
                              </button>
                              <button onClick={() => enviarFeedback(item.id, false, "")} className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                <ThumbsDown size={16} /> CORREGIR (OTRA CAUSA)
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-blue-600/30">
                            <p className="text-[10px] font-black uppercase text-blue-400 mb-2 italic tracking-[0.2em]">Conocimiento Validado</p>
                            <p className="text-lg font-bold text-white italic leading-relaxed">"{item.solucion_final}"</p>
                            {item.ia_acerto === false && (
                              <div className="inline-flex items-center gap-2 mt-4 text-[9px] font-black bg-red-500/20 text-red-400 px-3 py-1 rounded-full uppercase tracking-widest">
                                <AlertTriangle size={10} /> Entrenamiento Manual Aplicado
                              </div>
                            )}
                          </div>
                        )}
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
