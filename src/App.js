import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Zap, History, Database } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { db, auth } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  const [tabActiva, setTabActiva] = useState('inicio');
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]); 
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  const [incidencias, setIncidencias] = useState([]);
  const [user, setUser] = useState(null);
  const [antecedenteEncontrado, setAntecedenteEncontrado] = useState(null);

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
    if (!val) return "Info pendiente";
    if (typeof val === 'string') return val;
    return val.hipotesis || String(val);
  };

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Por favor complete los campos.");
    setLoading(true); setCategorias([]); setReporte(null);
    
    // Correlación de Antecedentes
    const norm = (t) => t ? t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const palabrasClave = norm(sintomas).split(/\s+/).filter(p => p.length > 4);
    const coincidencias = incidencias
      .filter(i => i.estado === 'resuelto' && palabrasClave.some(p => norm(`${i.titulo} ${i.descripcion}`).includes(p)))
      .slice(0, 3);

    setAntecedenteEncontrado(coincidencias.length > 0 ? coincidencias : null);

    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `SÍNTOMA: ${sintomas}. CONTEXTO: ${contexto}` })
      });
      const d = await res.json();
      if (d.categorias) setCategorias(d.categorias);
    } catch (e) { alert("Falla al conectar con el servidor."); } finally { setLoading(false); }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `ANOMALÍA: ${sintomas}. RESPUESTAS TÉCNICAS: ${JSON.stringify(respuestas)}` })
      });
      const data = await res.json();
      setReporte(data);
      if (user) {
        await addDoc(collection(db, "customers", user.uid, "incidencias"), {
          titulo: contexto, descripcion: sintomas, solucion: data.hipotesis || "Analizado",
          estado: "pendiente", fecha: serverTimestamp()
        });
      }
    } catch (e) { alert("Error al procesar dictamen."); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <aside className="w-80 bg-[#0F172A] text-white p-8 flex flex-col border-r border-slate-800">
        <h1 className="text-2xl font-black mb-10 text-cyan-500 tracking-tighter">ACR.RADIX</h1>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold ${tabActiva === 'inicio' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500'}`}><LayoutDashboard size={18} /> Monitor</button>
          <button onClick={() => {setTabActiva('nueva'); setCategorias([]); setReporte(null);}} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold ${tabActiva === 'nueva' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}><Zap size={18} /> Auditoría</button>
          <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold ${tabActiva === 'bitacora' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500'}`}><History size={18} /> Historial</button>
        </nav>
        <AuthCorner />
      </aside>

      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-4xl mx-auto">
          {tabActiva === 'nueva' && (
            <div className="space-y-8">
              {!categorias.length && !reporte && (
                <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 space-y-6">
                  <h2 className="text-2xl font-black uppercase italic">Nuevo Expediente</h2>
                  <input className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="TAG del Activo (Ej: BOMBA-01)" />
                  <textarea className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 h-32" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Describa la falla detectada..." />
                  <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-5 rounded-xl font-black uppercase tracking-widest hover:bg-cyan-600 transition-all">{loading ? "Analizando..." : "Iniciar Protocolo 6M"}</button>
                </div>
              )}

              {categorias.length > 0 && !reporte && (
                <div className="space-y-6">
                  {antecedenteEncontrado && (
                    <div className="bg-[#0F172A] text-white p-8 rounded-3xl border-l-8 border-cyan-500 shadow-xl">
                      <div className="flex items-center gap-2 mb-4 text-cyan-400 font-bold text-xs uppercase"><Database size={16}/> {antecedenteEncontrado.length} Antecedentes Relevantes</div>
                      {antecedenteEncontrado.map((c, i) => (
                        <div key={i} className="mb-4 last:mb-0 border-b border-white/5 pb-4 last:border-0">
                          <p className="text-slate-400 text-xs italic mb-1">"{renderText(c.descripcion)}"</p>
                          <p className="text-cyan-500 font-bold text-sm">Causa Raíz: {renderText(c.solucion)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {categorias.map((cat, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                      <h4 className="font-black text-cyan-600 uppercase text-xs mb-4">{cat.nombre}</h4>
                      {cat.preguntas.map((pre, pIdx) => (
                        <div key={pIdx} className="mb-4 last:mb-0">
                          <p className="font-bold text-slate-700 mb-2">{pre.texto}</p>
                          <input onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pIdx}`]: e.target.value})} className="w-full p-3 bg-slate-50 rounded-lg border-none ring-1 ring-slate-200" placeholder="Ingrese hallazgo..." />
                        </div>
                      ))}
                    </div>
                  ))}
                  <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-cyan-600 text-white p-6 rounded-3xl font-black uppercase shadow-lg hover:bg-slate-900 transition-all">{loading ? "Generando Dictamen..." : "Obtener Informe Final"}</button>
                </div>
              )}

              {reporte && (
                <div className="bg-[#0F172A] text-white p-12 rounded-[3rem] shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-cyan-500 font-black text-xs uppercase tracking-[0.3em] mb-4">Dictamen de Causa Raíz</h3>
                  <p className="text-3xl font-black italic border-l-4 border-cyan-500 pl-6 mb-8">"{renderText(reporte.hipotesis)}"</p>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                     {reporte.recomendaciones?.map((r, i) => (
                       <div key={i} className="p-4 bg-white/5 rounded-xl text-sm border border-white/10">✔️ {r}</div>
                     ))}
                  </div>
                  <button onClick={() => {setReporte(null); setCategorias([]); setSintomas(''); setContexto('');}} className="text-slate-400 text-xs font-bold uppercase hover:text-white underline underline-offset-8">Iniciar nueva auditoría</button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
