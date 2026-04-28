import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Zap, History, Search, CheckCircle2, 
  ThumbsUp, ThumbsDown, Database, ShieldCheck, Activity, X, FileText
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
  const [antecedenteEncontrado, setAntecedenteEncontrado] = useState(null); // Ahora será un Array

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "customers", user.uid, "incidencias"), orderBy("fecha", "desc"));
      const unsubscribe = onSnapshot(q, (snaps) => {
        setIncidencias(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubscribe();
    }
  }, [user]);

  const renderText = (val) => {
    if (!val) return "No disponible";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.hipotesis || "Data técnica compleja";
    return String(val);
  };

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 5000);
  };

  // --- LÓGICA DE BÚSQUEDA MULTI-COINCIDENCIA ---
  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Error: Parámetros de entrada incompletos.");
    setLoading(true); setCategorias([]); setReporte(null); setAntecedenteEncontrado(null);
    
    const norm = (t) => t ? t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const pals = norm(sintomas).split(/\s+/).filter(p => p.length > 4);

    // Buscamos todas las coincidencias resueltas que compartan palabras clave
    const coincidencias = incidencias
      .filter(i => i.estado === 'resuelto' && pals.some(p => norm(`${i.titulo} ${i.descripcion}`).includes(p)))
      .slice(0, 3); // Limitamos a las 3 más recientes para el reporte

    if (coincidencias.length > 0) {
      setAntecedenteEncontrado(coincidencias);
    }

    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `UNIDAD: ${contexto}. SÍNTOMA: ${sintomas}.` })
      });
      const d = await res.json();
      if (d.categorias) setCategorias(d.categorias);
    } catch (e) { alert("Error en el servidor de análisis."); } finally { setLoading(false); }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `ANOMALÍA: ${sintomas}. RESPUESTAS: ${JSON.stringify(respuestas)}` })
      });
      const data = await res.json();
      setReporte(data);
      if (user) {
        await addDoc(collection(db, "customers", user.uid, "incidencias"), {
          titulo: `${contexto}`,
          descripcion: sintomas,
          solucion: data.hipotesis || "Pendiente",
          estado: "pendiente",
          fecha: serverTimestamp()
        });
      }
    } catch (e) { alert("Error al procesar el dictamen."); } finally { setLoading(false); }
  };

  const enviarFeedback = async (id, fueExitosa, solucionActual) => {
    try {
      const docRef = doc(db, "customers", user.uid, "incidencias", id);
      let final = fueExitosa ? renderText(solucionActual) : prompt("Especifique la resolución técnica aplicada:");
      if (!final) return;
      await updateDoc(docRef, {
        estado: "resuelto",
        solucion_final: final,
        ia_acerto: fueExitosa,
        fecha_resolucion: serverTimestamp()
      });
      mostrarAviso("Base de conocimientos actualizada.");
    } catch (e) { alert("Error en base de datos."); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-80 bg-[#0F172A] text-white p-8 flex flex-col border-r border-slate-800 shrink-0">
        <div className="flex flex-col gap-1 mb-14 px-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-1.5 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]"></div>
            <h1 className="text-3xl font-black tracking-tighter leading-none">
              ACR<span className="text-cyan-500 text-4xl">.</span>RADIX
            </h1>
          </div>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">
            Forensic Engineering System
          </p>
        </div>

        <nav className="space-y-2 flex-1">
          <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold transition-all ${tabActiva === 'inicio' ? 'bg-slate-800 text-cyan-400 border border-slate-700' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <LayoutDashboard size={18} /> Monitor de Activos
          </button>
          <button onClick={() => setTabActiva('nueva')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold transition-all ${tabActiva === 'nueva' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <Zap size={18} /> Protocolo de Auditoría
          </button>
          <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold transition-all ${tabActiva === 'bitacora' ? 'bg-slate-800 text-cyan-400 border border-slate-700' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <History size={18} /> Registro de Eventos
          </button>
        </nav>

        <div className="mt-auto border-t border-slate-800 pt-6">
          <AuthCorner />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 relative bg-[#F1F5F9]">
        {aviso && <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-2xl z-50 border-l-4 border-cyan-500 font-bold uppercase text-[10px] tracking-widest">{aviso}</div>}

        <div className="max-w-5xl mx-auto">
          {tabActiva === 'inicio' && (
            <div className="space-y-10">
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">Status Operacional</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Anomalías Mitigadas</p>
                  <p className="text-5xl font-black text-slate-800">{incidencias.filter(i=>i.estado==='resuelto').length}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Eventos en Análisis</p>
                  <p className="text-5xl font-black text-cyan-600">{incidencias.filter(i=>i.estado==='pendiente').length}</p>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'nueva' && (
            <div className="space-y-10 pb-24">
              {!categorias.length && !reporte && (
                <section className="bg-white p-16 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Apertura de Expediente Técnico</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Diagnóstico de Desviación de Activo</p>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Unidad Táctica / TAG</label>
                    <input className="w-full p-6 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-cyan-500 font-medium" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Ej: Turbocompresor K-101" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Descripción de la Anomalía</label>
                    <textarea className="w-full p-6 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-cyan-500 h-48 font-medium" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Describa síntomas y parámetros observados..." />
                  </div>
                  <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-8 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-cyan-600 transition-all shadow-xl">
                    {loading ? "Ejecutando Correlación..." : "Iniciar Protocolo de Auditoría"}
                  </button>
                </section>
              )}

              {categorias.length > 0 && !reporte && (
                <div className="space-y-8">
                  {/* --- BANNER DE MULTI-COINCIDENCIA --- */}
                  {antecedenteEncontrado && (
                    <div className="bg-[#0F172A] text-white p-10 rounded-[2.5rem] border-l-8 border-cyan-500 shadow-2xl">
                      <div className="flex items-center gap-3 mb-6 text-cyan-400">
                        <Database size={20} />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">
                          {antecedenteEncontrado.length} Correlaciones Históricas Detectadas
                        </span>
                      </div>
                      <div className="space-y-6">
                        {antecedenteEncontrado.map((coinc, idx) => (
                          <div key={idx} className="border-b border-white/5 pb-5 last:border-0 last:pb-0">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-[9px] font-black text-slate-500 uppercase">Caso #{idx+1} - {coinc.fecha?.toDate().toLocaleDateString()}</p>
                            </div>
                            <p className="text-slate-300 italic text-sm mb-2">"{renderText(coinc.descripcion)}"</p>
                            <p className="text-cyan-500 font-bold text-sm">Solución Aplicada: {renderText(coinc.solucion_final)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {categorias.map((cat, idx) => (
                    <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm">
                      <h4 className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.3em] border-b border-slate-100 pb-4">{cat.nombre}</h4>
                      {cat.preguntas.map((pre, pIdx) => (
                        <div key={pIdx} className="space-y-3">
                          <p className="font-bold text-slate-700 text-lg">{pre.texto}</p>
                          <input onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pIdx}`]: e.target.value})} className="w-full p-5 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none font-medium" placeholder="Ingrese dato de campo..." />
                        </div>
                      ))}
                    </div>
                  ))}
                  <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-cyan-600 text-white p-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-900 transition-all">
                    {loading ? "Procesando Dictamen..." : "Finalizar y Obtener Hipótesis ACR"}
                  </button>
                </div>
              )}

              {reporte && (
                <div className="bg-[#0F172A] text-white p-16 rounded-[4rem] space-y-8 shadow-2xl border border-white/5 animate-in zoom-in-95">
                  <div className="space-y-2">
                    <h2 className="text-xs font-black text-cyan-500 uppercase tracking-[0.5em]">Dictamen Presuntivo ACR</h2>
                    <h3 className="text-5xl font-black italic tracking-tighter">Hipótesis de Causa Raíz</h3>
                  </div>
                  <p className="text-3xl text-slate-300 italic leading-tight border-l-4 border-cyan-500 pl-8">
                    "{renderText(reporte.hipotesis)}"
                  </p>
                  <button onClick={() => {setReporte(null); setCategorias([]); setSintomas(''); setContexto('');}} className="text-cyan-500 font-black text-[10px] uppercase tracking-widest">Abrir Nuevo Expediente</button>
                </div>
              )}
            </div>
          )}

          {tabActiva === 'bitacora' && (
            <div className="space-y-10 pb-32">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">Registro de Eventos</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Base de Conocimiento Táctico</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Filtrar por TAG o descripción..." value={busqueda} onChange={(e)=>setBusqueda(e.target.value)} className="pl-12 pr-6 py-4 bg-white rounded-2xl border border-slate-200 text-sm outline-none shadow-sm focus:ring-2 focus:ring-cyan-500 w-80 transition-all" />
                </div>
              </div>

              <div className="grid gap-8">
                {incidencias.filter(i => (i.titulo || '').toLowerCase().includes(busqueda.toLowerCase())).map((item) => (
                  <div key={item.id} className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-cyan-600 uppercase tracking-[0.3em]">Registro ID-{item.id.substring(0,8)}</span>
                        <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter group-hover:text-cyan-600 transition-colors">{item.titulo}</h4>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border ${item.estado === 'resuelto' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {item.estado === 'resuelto' ? 'Estatus: Mitigado' : 'Estatus: Crítico'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                      <div className="space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Evidencia Reportada</p>
                        <p className="text-slate-600 text-sm border-l-2 border-slate-200 pl-4 font-medium italic italic">"{renderText(item.descripcion)}"</p>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest">Dictamen ACR</p>
                        <p className="text-slate-800 text-sm border-l-2 border-cyan-500 pl-4 font-bold italic italic">"{renderText(item.solucion)}"</p>
                      </div>
                    </div>

                    {item.estado !== 'resuelto' ? (
                      <div className="flex gap-4 pt-8 border-t border-slate-100">
                        <button onClick={() => enviarFeedback(item.id, true, item.solucion)} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-cyan-600 transition-all flex items-center justify-center gap-3">
                          <CheckCircle2 size={16} /> Validar Hallazgo
                        </button>
                        <button onClick={() => enviarFeedback(item.id, false, "")} className="flex-1 bg-white border border-slate-200 text-slate-500 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                          <X size={16} /> Desviación
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 flex flex-col items-center">
                        <p className="text-[9px] font-black text-emerald-600 uppercase mb-3 tracking-[0.3em]">Resolución Validada en Campo</p>
                        <p className="text-lg font-bold text-slate-700 italic text-center">"{renderText(item.solucion_final)}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
