import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Info, AlertTriangle, 
  CheckCircle2, ChevronRight, Zap, History, LayoutDashboard, 
  Search, ArrowLeft, ThumbsUp, ThumbsDown, Database, Lightbulb, FileText, X
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
  const [antecedenteEncontrado, setAntecedenteEncontrado] = useState(null);
  
  // NUEVO ESTADO: Para ver el detalle de un informe viejo
  const [verDetalle, setVerDetalle] = useState(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => { setUser(u); if (!u) setIsSubscribed(false); });
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

  // --- LÓGICA DE GUARDADO COMPLETO ---
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
        // AHORA GUARDAMOS EL OBJETO data COMPLETO (que trae los items de las 6M)
        await addDoc(collection(db, "customers", user.uid, "incidencias"), {
          titulo: `Evento en ${contexto}`,
          descripcion: sintomas,
          informe_completo: data, // <-- Aquí guardamos todo el JSON de la IA
          estado: "pendiente",
          fecha: serverTimestamp()
        });
      }
    } catch (e) { alert("Error"); } finally { setLoading(false); }
  };

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Faltan datos");
    setLoading(true); setCategorias([]); setReporte(null); setAntecedenteEncontrado(null);
    const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const pals = norm(sintomas).split(/\s+/).filter(p => p.length > 3);
    const coinc = incidencias.find(i => i.estado === 'resuelto' && pals.some(p => norm(`${i.titulo} ${i.descripcion}`).includes(p)));
    if (coinc) setAntecedenteEncontrado(coinc);
    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `[ANTECEDENTE]: ${coinc?.solucion_final || ''}. CONTEXTO: ${contexto}. SÍNTOMA: ${sintomas}` })
      });
      const d = await res.json();
      if (d.categorias) setCategorias(d.categorias);
    } catch (e) { alert("Error"); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden">
      {/* SIDEBAR (Igual que antes) */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col h-full z-50">
        <div className="p-8">
            <h1 className="text-xl font-black italic tracking-tighter uppercase mb-10">AUDITORÍA<span className="text-blue-600">6M</span></h1>
            <nav className="space-y-2">
                <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tabActiva === 'inicio' ? 'bg-blue-600' : 'text-slate-400'}`}><LayoutDashboard size={18}/> Resumen</button>
                <button onClick={() => setTabActiva('nueva')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tabActiva === 'nueva' ? 'bg-blue-600' : 'text-slate-400'}`}><Zap size={18}/> Nueva Auditoría</button>
                <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tabActiva === 'bitacora' ? 'bg-blue-600' : 'text-slate-400'}`}><History size={18}/> Mi Bitácora</button>
            </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10 relative">
        <div className="max-w-4xl mx-auto">
          {/* TAB: NUEVA AUDITORÍA (Se mantiene igual con el Banner) */}
          {tabActiva === 'nueva' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-5">
              {!categorias.length && !reporte && (
                <section className="bg-white p-12 rounded-[3.5rem] shadow-xl space-y-8">
                  <h2 className="text-4xl font-black italic uppercase text-center">Diagnóstico IA</h2>
                  <input className="w-full p-5 bg-slate-50 rounded-3xl outline-none ring-1 ring-slate-200" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Ubicación..." />
                  <textarea className="w-full p-5 bg-slate-50 rounded-3xl outline-none ring-1 ring-slate-200 h-40" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Síntomas..." />
                  <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black">{loading ? "PROCESANDO..." : "INICIAR ANÁLISIS"}</button>
                </section>
              )}
              {/* Aquí iría el cuestionario y el banner que ya tienes... */}
              {reporte && (
                <div className="bg-slate-900 text-white p-10 rounded-[3rem] space-y-6">
                    <h2 className="text-3xl font-black italic">Informe Generado</h2>
                    <p className="text-blue-400 font-bold">Hipótesis: {reporte.hipotesis}</p>
                    <button onClick={()=>setTabActiva('bitacora')} className="text-white underline">Ver en bitácora</button>
                </div>
              )}
            </div>
          )}

          {/* TAB: BITÁCORA CON BOTÓN DE "VER INFORME" */}
          {tabActiva === 'bitacora' && (
            <div className="space-y-8">
              <h2 className="text-4xl font-black italic uppercase">Mi Bitácora</h2>
              <div className="grid gap-6">
                {incidencias.map((item) => (
                  <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase px-3 py-1 bg-slate-100 rounded-full">{item.fecha?.toDate().toLocaleDateString()}</span>
                        {item.informe_completo && (
                            <button 
                                onClick={() => setVerDetalle(item)} 
                                className="flex items-center gap-2 text-blue-600 font-black text-xs hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                            >
                                <FileText size={16} /> VER INFORME COMPLETO
                            </button>
                        )}
                    </div>
                    <h4 className="text-xl font-black italic uppercase tracking-tighter">{item.titulo}</h4>
                    <p className="text-slate-500 text-sm line-clamp-2">{item.descripcion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL / PANEL DE DETALLE TÉCNICO */}
        {verDetalle && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-end">
            <div className="bg-white h-full w-full max-w-2xl shadow-2xl overflow-y-auto animate-in slide-in-from-right">
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-center">
                    <button onClick={() => setVerDetalle(null)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Técnico ACR</span>
                </div>

                <header className="space-y-2">
                    <h2 className="text-3xl font-black italic uppercase leading-none">{verDetalle.titulo}</h2>
                    <p className="text-slate-400 font-medium">Fecha de emisión: {verDetalle.fecha?.toDate().toLocaleDateString()}</p>
                </header>

                <div className="space-y-6">
                    {/* RESUMEN 6M */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">Análisis de Factores (6M)</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {verDetalle.informe_completo.analisis_6m?.map((m, idx) => (
                                <div key={idx} className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase text-slate-400">{m.categoria}</p>
                                    <p className="font-bold text-slate-700 italic">"{m.resumen}"</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* HIPÓTESIS */}
                    <section className="bg-slate-900 text-white p-8 rounded-[2rem] border-l-8 border-blue-500">
                        <div className="flex items-center gap-2 text-blue-400 mb-2">
                            <Info size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Hipótesis Causa Raíz</span>
                        </div>
                        <p className="text-xl font-black italic">"{verDetalle.informe_completo.hipotesis}"</p>
                    </section>

                    {/* RECOMENDACIONES */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-green-600 uppercase tracking-widest border-b pb-2">Recomendaciones de Seguridad y Mantenimiento</h3>
                        <ul className="space-y-3">
                            {verDetalle.informe_completo.recomendaciones?.map((r, idx) => (
                                <li key={idx} className="flex gap-3 items-start bg-green-50 p-4 rounded-2xl text-green-900 font-medium">
                                    <CheckCircle2 className="shrink-0 mt-1" size={16} />
                                    <span>{r}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
                
                <button onClick={() => window.print()} className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all">
                    IMPRIMIR REPORTE
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
