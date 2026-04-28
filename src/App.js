import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Info, AlertTriangle, 
  CheckCircle2, ChevronRight, Briefcase, Zap, ShieldCheck,
  LayoutDashboard, History, Search, ArrowLeft, ThumbsUp, ThumbsDown,
  Database, Lightbulb
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, addDoc, 
  orderBy, serverTimestamp, doc, updateDoc 
} from "firebase/firestore";
import { db, auth } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  const [tabActiva, setTabActiva] = useState('inicio');
  const [busqueda, setBusqueda] = useState('');
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]); 
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  const [aviso, setAviso] = useState(null); 
  const [incidencias, setIncidencias] = useState([]);
  const [user, setUser] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  
  // NUEVO ESTADO: Para guardar el antecedente encontrado y mostrarlo en la UI
  const [antecedenteEncontrado, setAntecedenteEncontrado] = useState(null);

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

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "customers", user.uid, "incidencias"), orderBy("fecha", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIncidencias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [user]);

  const enviarFeedback = async (id, fueExitosa, solucionIA) => {
    try {
      const docRef = doc(db, "customers", user.uid, "incidencias", id);
      let solucionDefinitiva = solucionIA;
      if (!fueExitosa) {
        const manual = prompt("Indica la solución real aplicada:");
        if (!manual) return;
        solucionDefinitiva = manual;
      }
      await updateDoc(docRef, {
        estado: "resuelto",
        ia_acerto: fueExitosa,
        solucion_final: solucionDefinitiva,
        fecha_resolucion: serverTimestamp()
      });
      mostrarAviso("Registro actualizado.");
    } catch (e) { alert("Error al actualizar."); }
  };

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Completa los campos.");
    setLoading(true);
    setCategorias([]);
    setReporte(null);
    setAntecedenteEncontrado(null); // Limpiar antecedentes previos

    const normalizar = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const palabras = normalizar(sintomas).split(/\s+/).filter(p => p.length > 3);
    
    const coincidencia = incidencias.find(inc => 
      inc.estado === 'resuelto' && 
      palabras.some(p => normalizar(`${inc.titulo} ${inc.descripcion}`).includes(p))
    );

    let promptContextual = `CONTEXTO: ${contexto}. SÍNTOMA: ${sintomas}.`;
    if (coincidencia) {
      setAntecedenteEncontrado(coincidencia); // Guardamos para la UI
      promptContextual = `[ANTECEDENTE]: El ${coincidencia.fecha?.toDate().toLocaleDateString()} se solucionó un caso similar ("${coincidencia.descripcion}") con: "${coincidencia.solucion_final}". Úsalo como referencia. ${promptContextual}`;
    }

    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptContextual })
      });
      const data = await response.json();
      if (data.categorias) setCategorias(data.categorias);
    } catch (e) { alert("Error de conexión."); } finally { setLoading(false); }
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
          titulo: `Evento en ${contexto}`,
          descripcion: sintomas,
          solucion: data.hipotesis,
          estado: "pendiente",
          fecha: serverTimestamp()
        });
      }
    } catch (e) { alert("Error."); } finally { setLoading(false); }
  };

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 5000);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      <aside className="w-72 bg-slate-900 text-white flex flex-col h-full z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Activity size={24} /></div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase tracking-widest">AUDITORÍA<span className="text-blue-600">6M</span></h1>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'inicio' ? 'bg-blue-600' : 'text-slate-400 hover:bg-white/5'}`}><LayoutDashboard size={18} /> Resumen</button>
            <button onClick={() => {setTabActiva('nueva'); setCategorias([]); setReporte(null); setAntecedenteEncontrado(null);}} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'nueva' ? 'bg-blue-600' : 'text-slate-400 hover:bg-white/5'}`}><Zap size={18} /> Nueva Auditoría</button>
            <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'bitacora' ? 'bg-blue-600' : 'text-slate-400 hover:bg-white/5'}`}><History size={18} /> Mi Bitácora</button>
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-white/5 bg-slate-950/20"><AuthCorner /></div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10 relative">
        <div className="max-w-4xl mx-auto">
          {user && isSubscribed && (
            <>
              {tabActiva === 'inicio' && (
                <div className="space-y-8 animate-in fade-in">
                  <h2 className="text-4xl font-black italic uppercase">Dashboard</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Casos Resueltos</p><p className="text-5xl font-black mt-2 text-green-600">{incidencias.filter(i => i.estado === 'resuelto').length}</p></div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Por Validar</p><p className="text-5xl font-black mt-2 text-yellow-500">{incidencias.filter(i => i.estado === 'pendiente').length}</p></div>
                  </div>
                </div>
              )}

              {tabActiva === 'nueva' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-5">
                  {!categorias.length && !reporte && (
                    <section className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 space-y-8 animate-in zoom-in-95">
                      <div className="text-center"><h2 className="text-4xl font-black italic uppercase mb-2">Diagnóstico IA</h2><p className="text-slate-400 font-medium italic">Análisis de Causa Raíz con Memoria Técnica</p></div>
                      <div className="space-y-6">
                        <input className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Localización del equipo..." />
                        <textarea className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all h-40 font-medium" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Describe los síntomas técnicos..." />
                        <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 hover:bg-blue-600 text-white p-6 rounded-[2rem] font-black text-xl transition-all shadow-2xl flex items-center justify-center gap-3">
                          {loading ? "PROCESANDO..." : "INICIAR ANÁLISIS"} <ChevronRight />
                        </button>
                      </div>
                    </section>
                  )}

                  {/* VISTA CUESTIONARIO CON BANNER DE ANTECEDENTE DESTACADO */}
                  {categorias.length > 0 && !reporte && (
                    <div className="space-y-12 pb-20 animate-in fade-in">
                      
                      {/* BANNER DE ANTECEDENTE (Si existe coincidencia) */}
                      {antecedenteEncontrado && (
                        <div className="bg-blue-600 text-white rounded-[3rem] p-8 shadow-2xl shadow-blue-200 relative overflow-hidden border-b-8 border-blue-800">
                          <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12"><Database size={150} /></div>
                          <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex items-center gap-2 bg-white/20 w-fit px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                              <Lightbulb size={14} /> Antecedente Técnico Encontrado
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                              <div>
                                <p className="text-[10px] font-black uppercase text-blue-200 mb-1 italic">Caso similar anterior (${antecedenteEncontrado.fecha?.toDate().toLocaleDateString()})</p>
                                <p className="text-lg font-bold leading-tight line-clamp-3">"{antecedenteEncontrado.descripcion}"</p>
                              </div>
                              <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10">
                                <p className="text-[10px] font-black uppercase text-blue-200 mb-1 italic">Solución Aplicada</p>
                                <p className="text-lg font-black italic">"{antecedenteEncontrado.solucion_final}"</p>
                              </div>
                            </div>
                            <p className="text-[9px] font-bold text-blue-100 opacity-80 mt-2">* Este dato es una referencia histórica para guiar tu diagnóstico actual.</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4"><button onClick={() => {setCategorias([]); setAntecedenteEncontrado(null);}} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50"><ArrowLeft size={20} /></button><h3 className="text-3xl font-black italic uppercase tracking-tighter">Protocolo 6M</h3></div>
                      
                      {categorias.map((cat, idx) => (
                        <div key={idx} className="space-y-8">
                          <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-50 px-6 py-2 rounded-full border border-blue-100 inline-block">{cat.nombre}</h4>
                          <div className="grid gap-6">
                            {cat.preguntas.map((pre, pIdx) => (
                              <div key={pIdx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl">
                                <p className="font-black text-slate-800 text-lg mb-4">{pre.texto}</p>
                                <input onFocus={() => pre.aviso && mostrarAviso(pre.aviso)} onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pIdx}`]: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium border-none ring-1 ring-slate-200" placeholder="Respuesta..." />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-green-600 text-white p-8 rounded-[3rem] font-black text-2xl shadow-2xl shadow-green-100 hover:bg-green-700 transition-all">
                        {loading ? "GENERANDO INFORME..." : "GENERAR REPORTE ACR"}
                      </button>
                    </div>
                  )}

                  {reporte && (
                    <section className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl space-y-12 border-t-[16px] border-blue-600 animate-in zoom-in-95">
                      <div className="text-center space-y-4"><CheckCircle2 className="mx-auto text-green-400" size={60} /><h2 className="text-5xl font-black italic uppercase tracking-tighter italic">Resultados</h2></div>
                      <div className="bg-blue-600/20 p-10 rounded-[3rem] border border-blue-500/30">
                        <h5 className="font-black text-2xl mb-4 flex items-center gap-3 text-blue-400 uppercase italic tracking-tighter"><Info /> Hipótesis de Causa Raíz</h5>
                        <p className="text-blue-50 text-2xl font-medium italic leading-relaxed">"{reporte.hipotesis}"</p>
                      </div>
                      <button onClick={() => {setReporte(null); setCategorias([]); setContexto(''); setSintomas(''); setAntecedenteEncontrado(null);}} className="w-full py-6 text-slate-500 font-black uppercase hover:text-white transition-all italic tracking-widest text-sm text-center">Nueva Auditoría Técnica</button>
                    </section>
                  )}
                </div>
              )}

              {tabActiva === 'bitacora' && (
                <div className="space-y-8 animate-in fade-in pb-20">
                  <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div><h2 className="text-4xl font-black italic uppercase">Mi <span className="text-blue-600 italic">Bitácora</span></h2><p className="text-slate-500 font-medium italic">Historial de soluciones y antecedentes.</p></div>
                    <div className="relative w-full md:w-72"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 outline-none text-sm shadow-sm" /></div>
                  </header>
                  <div className="grid gap-8">
                    {incidencias.filter(i => i.titulo?.toLowerCase().includes(busqueda.toLowerCase()) || i.descripcion?.toLowerCase().includes(busqueda.toLowerCase())).map((item) => (
                      <div key={item.id} className={`bg-white p-10 rounded-[3.5rem] border transition-all ${item.estado === 'resuelto' ? 'border-green-100 shadow-sm' : 'border-slate-100 shadow-xl'}`}>
                        <div className="flex justify-between items-start mb-6 text-[10px] font-black uppercase tracking-widest">
                          <span className={`px-4 py-1.5 rounded-full ${item.estado === 'resuelto' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {item.estado === 'resuelto' ? '✓ Resuelto' : '⚠ Pendiente'}
                          </span>
                          <span className="text-slate-300 italic">{item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : 'Reciente'}</span>
                        </div>
                        <h4 className="text-2xl font-black mb-6 uppercase italic tracking-tighter">{item.titulo}</h4>
                        <div className="grid md:grid-cols-2 gap-6 mb-8 text-sm italic">
                          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-slate-600 leading-relaxed font-medium">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2 italic tracking-widest">Síntoma</p>
                            {item.descripcion}
                          </div>
                          <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 text-blue-900 font-bold leading-relaxed">
                            <p className="text-[10px] font-black uppercase text-blue-600 mb-2 italic tracking-widest">Predicción IA</p>
                            "{item.solucion}"
                          </div>
                        </div>
                        {item.estado !== 'resuelto' ? (
                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-dashed border-slate-300">
                            <p className="text-xs font-black text-slate-500 text-center uppercase tracking-widest mb-4 italic">¿Fue útil el antecedente proporcionado?</p>
                            <div className="flex gap-4">
                              <button onClick={() => enviarFeedback(item.id, true, item.solucion)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"><ThumbsUp size={16} /> CONFIRMAR CAUSA</button>
                              <button onClick={() => enviarFeedback(item.id, false, "")} className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><ThumbsDown size={16} /> CORREGIR</button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-blue-600/30 animate-in fade-in">
                            <p className="text-[10px] font-black uppercase text-blue-400 mb-2 italic tracking-[0.2em]">Antecedente Validado</p>
                            <p className="text-lg font-bold text-white italic leading-relaxed">"{item.solucion_final}"</p>
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
