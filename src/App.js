import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Zap, History, Database, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
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

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Complete los campos.");
    setLoading(true); setCategorias([]); setReporte(null);

    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `SÍNTOMA: ${sintomas}. CONTEXTO: ${contexto}` })
      });
      
      const d = await res.json();
      const lista = d.categorias || d.categories || Object.values(d).find(v => Array.isArray(v)) || [];
      
      if (lista.length > 0) {
        setCategorias(lista);
      } else {
        alert("No se pudieron cargar las preguntas. Intente de nuevo.");
      }
    } catch (e) {
      alert("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `RESPUESTAS: ${JSON.stringify(respuestas)}` })
      });
      const data = await res.json();
      setReporte(data);
      if (user) {
        await addDoc(collection(db, "customers", user.uid, "incidencias"), {
          titulo: contexto, descripcion: sintomas, solucion: data.hipotesis || "Analizado",
          estado: "pendiente", fecha: serverTimestamp()
        });
      }
    } catch (e) { alert("Error al generar reporte."); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <aside className="w-80 bg-[#0F172A] text-white p-8 flex flex-col">
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
          {tabActiva === 'inicio' && (
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl border shadow-sm">
                <Clock className="text-cyan-500 mb-2" />
                <p className="text-3xl font-black text-slate-900">{incidencias.filter(i => i.estado === 'pendiente').length}</p>
                <p className="text-slate-500 text-xs font-bold uppercase">Pendientes</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border shadow-sm">
                <CheckCircle2 className="text-emerald-500 mb-2" />
                <p className="text-3xl font-black text-slate-900">{incidencias.filter(i => i.estado === 'resuelto').length}</p>
                <p className="text-slate-500 text-xs font-bold uppercase">Resueltos</p>
              </div>
            </div>
          )}

          {tabActiva === 'nueva' && (
            <div className="space-y-8">
              {!categorias.length && !reporte && (
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border space-y-6">
                  <h2 className="text-2xl font-black uppercase italic">Nueva Auditoría</h2>
                  <input className="w-full p-4 bg-slate-50 rounded-xl border" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="TAG del Equipo" />
                  <textarea className="w-full p-4 bg-slate-50 rounded-xl border h-32" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Descripción de la falla..." />
                  <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-5 rounded-xl font-black uppercase">{loading ? "Conectando..." : "Iniciar Protocolo"}</button>
                </div>
              )}

              {categorias.length > 0 && !reporte && (
                <div className="space-y-6">
                  {categorias.map((cat, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-3xl border shadow-sm">
                      <h4 className="font-black text-cyan-600 uppercase text-xs mb-4">{cat.nombre || cat.category}</h4>
                      {(cat.preguntas || cat.questions || []).map((pre, pIdx) => (
                        <div key={pIdx} className="mb-4">
                          <p className="font-bold text-slate-700 mb-2">{pre.texto || pre.question || pre}</p>
                          <input onChange={(e) => setRespuestas({...respuestas, [`${idx}-${pIdx}`]: e.target.value})} className="w-full p-3 bg-slate-50 rounded-lg border" placeholder="Respuesta..." />
                        </div>
                      ))}
                    </div>
                  ))}
                  <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-cyan-600 text-white p-6 rounded-3xl font-black uppercase">Obtener Dictamen</button>
                </div>
              )}

              {reporte && (
                <div className="bg-[#0F172A] text-white p-12 rounded-[3rem] shadow-2xl">
                  <h3 className="text-cyan-500 font-black text-xs uppercase mb-4 tracking-widest">Conclusión Técnica</h3>
                  <p className="text-3xl font-black italic border-l-4 border-cyan-500 pl-6">{reporte.hipotesis || reporte.conclusion || "Analizado con éxito"}</p>
                  <button onClick={() => {setReporte(null); setCategorias([]); setSintomas(''); setContexto('');}} className="mt-8 text-slate-400 text-xs font-bold uppercase hover:text-white underline">Nueva Auditoría</button>
                </div>
              )}
            </div>
          )}

          {tabActiva === 'bitacora' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase italic">Historial</h2>
              {incidencias.map((i) => (
                <div key={i.id} className="bg-white p-6 rounded-2xl border flex justify-between items-center shadow-sm">
                  <div>
                    <h4 className="font-black text-slate-800 uppercase">{i.titulo}</h4>
                    <p className="text-slate-500 text-sm">{i.descripcion}</p>
                  </div>
                  <span className="bg-amber-100 text-amber-600 px-4 py-1 rounded-full text-[10px] font-black uppercase">{i.estado}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ESTA LÍNEA ES LA QUE FALTABA Y CAUSABA EL ERROR EN VERCEL
export default App;
