import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Zap, History, Clock, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
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

  // Si no hay usuario, forzamos el login antes de mostrar nada
  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0F172A] text-white">
        <h1 className="text-4xl font-black text-cyan-500 mb-6 tracking-tighter italic">ACR.RADIX</h1>
        <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl text-center max-w-md">
          <ShieldAlert className="mx-auto text-cyan-400 mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
          <p className="text-slate-400 mb-8 text-sm">Inicie sesión para acceder al monitor industrial 6M.</p>
          <AuthCorner />
        </div>
      </div>
    );
  }

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Complete los campos.");
    setLoading(true); setCategorias([]); setReporte(null);
    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Analiza la falla: ${sintomas} en ${contexto}. Genera un JSON: {"categorias": [{"nombre": "...", "preguntas": [{"texto": "..."}]}]}` 
        })
      });
      const d = await res.json();
      setCategorias(d.categorias || d.categories || []);
    } catch (e) { alert("Error de conexión."); } finally { setLoading(false); }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Genera ACR final basado en respuestas: ${JSON.stringify(respuestas)}. Responde JSON: {"hipotesis": "..."}` 
        })
      });
      const data = await res.json();
      setReporte(data);
      await addDoc(collection(db, "customers", user.uid, "incidencias"), {
        titulo: contexto, descripcion: sintomas, solucion: data.hipotesis || "Analizado",
        estado: "pendiente", fecha: serverTimestamp()
      });
    } catch (e) { alert("Error."); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* SIDEBAR PRO */}
      <aside className="w-80 bg-[#0F172A] text-white p-8 flex flex-col border-r border-slate-800">
        <h1 className="text-2xl font-black mb-12 text-cyan-500 tracking-tighter italic">ACR.RADIX</h1>
        <nav className="space-y-3 flex-1">
          <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'inicio' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-white'}`}><LayoutDashboard size={18} /> Monitor</button>
          <button onClick={() => {setTabActiva('nueva'); setCategorias([]); setReporte(null);}} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'nueva' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-500 hover:text-white'}`}><Zap size={18} /> Auditoría</button>
          <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'bitacora' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-white'}`}><History size={18} /> Historial</button>
        </nav>
        <AuthCorner />
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-4xl mx-auto">
          
          {/* MONITOR */}
          {tabActiva === 'inicio' && (
            <div className="space-y-8">
              <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Status de Planta</h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <Clock className="text-cyan-500 mb-4" size={32} />
                  <p className="text-4xl font-black">{incidencias.filter(i => i.estado === 'pendiente').length}</p>
                  <p className="text-slate-500 font-bold uppercase text-xs">Pendientes</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <CheckCircle2 className="text-emerald-500 mb-4" size={32} />
                  <p className="text-4xl font-black">{incidencias.filter(i => i.estado === 'resuelto').length}</p>
                  <p className="text-slate-500 font-bold uppercase text-xs">Resueltos</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <AlertCircle className="text-amber-500 mb-4" size={32} />
                  <p className="text-4xl font-black">{incidencias.length}</p>
                  <p className="text-slate-500 font-bold uppercase text-xs">Total Logs</p>
                </div>
              </div>
            </div>
          )}

          {/* AUDITORÍA */}
          {tabActiva === 'nueva' && (
            <div className="space-y-8">
              {!categorias.length && !reporte && (
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
                  <h2 className="text-2xl font-black uppercase italic">Nueva Auditoría</h2>
                  <input className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="TAG del Activo" />
                  <textarea className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 h-32" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Descripción de la falla..." />
                  <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-5 rounded-xl font-black uppercase tracking-widest hover:bg-cyan-600 transition-all">{loading ? "Analizando..." : "Iniciar Protocolo 6M"}</button>
                </div>
              )}

              {categorias.length > 0 && !reporte && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  {categorias.map((cat, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                      <h4 className="font-black text-cyan-600 uppercase text-xs mb-4">{cat.nombre}</h4>
                      {cat.preguntas.map((pre, pIdx) => (
                        <div key={pIdx} className="mb-4">
                          <p className="font-bold text-slate-700 mb-2">{pre.texto}</p>
                          <input onChange={(e) => setRespuestas({...respuestas, [`${idx}-${pIdx}`]: e.target.value})} className="w-full p-3 bg-slate-50 rounded-lg border-none ring-1 ring-slate-200" placeholder="Respuesta..." />
                        </div>
                      ))}
                    </div>
                  ))}
                  <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-cyan-600 text-white p-6 rounded-3xl font-black uppercase shadow-lg hover:bg-slate-900 transition-all">Generar Dictamen ACR</button>
                </div>
              )}

              {reporte && (
                <div className="bg-[#0F172A] text-white p-12 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-500">
                  <h3 className="text-cyan-500 font-black text-xs uppercase mb-4 tracking-widest tracking-[0.3em]">Causa Raíz Detectada</h3>
                  <p className="text-3xl font-black italic border-l-4 border-cyan-500 pl-6">{reporte.hipotesis || "Analizado"}</p>
                  <button onClick={() => {setReporte(null); setCategorias([]); setSintomas(''); setContexto('');}} className="mt-8 text-slate-400 text-xs font-bold uppercase hover:text-white underline underline-offset-8">Nueva Auditoría</button>
                </div>
              )}
            </div>
          )}

          {/* HISTORIAL / BITÁCORA */}
          {tabActiva === 'bitacora' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Historial de Fallas</h2>
              <div className="grid gap-4">
                {incidencias.length === 0 ? (
                  <div className="p-20 text-center text-slate-400 italic">No hay registros en la bitácora aún.</div>
                ) : (
                  incidencias.map((i) => (
                    <div key={i.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:border-cyan-200 transition-all">
                      <div>
                        <h4 className="font-black text-slate-800 uppercase text-lg">{i.titulo}</h4>
                        <p className="text-slate-500 text-sm">{i.descripcion}</p>
                        <p className="text-cyan-600 text-xs font-bold mt-2 italic">Causa: {i.solucion}</p>
                      </div>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${i.estado === 'resuelto' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {i.estado}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
