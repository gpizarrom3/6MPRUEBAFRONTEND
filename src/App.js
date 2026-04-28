import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Info, AlertTriangle, 
  CheckCircle2, ChevronRight, Zap, History, LayoutDashboard, 
  Search, ArrowLeft, ThumbsUp, ThumbsDown
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

  // FUNCIÓN CRÍTICA: Evita el error #130 asegurando que siempre devolvemos texto
  const renderText = (val) => {
    if (!val) return "No disponible";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.hipotesis || JSON.stringify(val).substring(0, 50);
    return String(val);
  };

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 5000);
  };

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Faltan datos");
    setLoading(true); setCategorias([]); setReporte(null); setAntecedenteEncontrado(null);
    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `CONTEXTO: ${contexto}. SÍNTOMA: ${sintomas}.` })
      });
      const d = await res.json();
      if (d.categorias) setCategorias(d.categorias);
    } catch (e) { alert("Error en el servidor"); } finally { setLoading(false); }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `SÍNTOMA: ${sintomas}. RESPUESTAS: ${JSON.stringify(respuestas)}` })
      });
      const data = await res.json();
      setReporte(data);
      if (user) {
        await addDoc(collection(db, "customers", user.uid, "incidencias"), {
          titulo: `Evento en ${contexto}`,
          descripcion: sintomas,
          solucion: data.hipotesis || "Sin hipótesis",
          estado: "pendiente",
          fecha: serverTimestamp()
        });
      }
    } catch (e) { alert("Error al generar reporte"); } finally { setLoading(false); }
  };

  const enviarFeedback = async (id, fueExitosa, solucionActual) => {
    try {
      const docRef = doc(db, "customers", user.uid, "incidencias", id);
      let final = fueExitosa ? renderText(solucionActual) : prompt("Solución real:");
      if (!final) return;
      await updateDoc(docRef, {
        estado: "resuelto",
        solucion_final: final,
        ia_acerto: fueExitosa,
        fecha_resolucion: serverTimestamp()
      });
      mostrarAviso("Registro actualizado.");
    } catch (e) { alert("Error"); }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <aside className="w-72 bg-slate-900 text-white p-8 flex flex-col">
        <h1 className="text-xl font-black italic mb-10 tracking-tighter uppercase">Auditoría<span className="text-blue-600">6M</span></h1>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tabActiva === 'inicio' ? 'bg-blue-600' : 'text-slate-400'}`}><LayoutDashboard size={18}/> Resumen</button>
          <button onClick={() => setTabActiva('nueva')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tabActiva === 'nueva' ? 'bg-blue-600' : 'text-slate-400'}`}><Zap size={18}/> Nueva</button>
          <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tabActiva === 'bitacora' ? 'bg-blue-600' : 'text-slate-400'}`}><History size={18}/> Bitácora</button>
        </nav>
        <AuthCorner />
      </aside>

      <main className="flex-1 overflow-y-auto p-10 relative">
        {aviso && <div className="fixed bottom-10 right-10 bg-slate-900 text-white p-6 rounded-3xl shadow-2xl z-50 border-l-4 border-blue-500">{aviso}</div>}

        <div className="max-w-4xl mx-auto">
          {tabActiva === 'inicio' && (
            <div className="space-y-6">
              <h2 className="text-4xl font-black italic uppercase">Panel</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase">Resueltos</p><p className="text-5xl font-black">{incidencias.filter(i=>i.estado==='resuelto').length}</p></div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase">Pendientes</p><p className="text-5xl font-black">{incidencias.filter(i=>i.estado==='pendiente').length}</p></div>
              </div>
            </div>
          )}

          {tabActiva === 'nueva' && (
            <div className="space-y-10">
              {!categorias.length && !reporte && (
                <section className="bg-white p-12 rounded-[3.5rem] shadow-xl space-y-6">
                  <h2 className="text-3xl font-black italic uppercase text-center">Diagnóstico IA</h2>
                  <input className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 outline-none" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Ubicación..." />
                  <textarea className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 outline-none h-40" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Síntomas..." />
                  <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black">{loading ? "PROCESANDO..." : "INICIAR"}</button>
                </section>
              )}

              {categorias.length > 0 && !reporte && (
                <div className="space-y-8 pb-20">
                  {categorias.map((cat, idx) => (
                    <div key={idx} className="space-y-4">
                      <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">{cat.nombre}</h4>
                      {cat.preguntas.map((pre, pIdx) => (
                        <div key={pIdx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                          <p className="font-bold mb-4">{pre.texto}</p>
                          <input onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pIdx}`]: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 outline-none" placeholder="Respuesta..." />
                        </div>
                      ))}
                    </div>
                  ))}
                  <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-green-600 text-white p-8 rounded-[3rem] font-black text-xl">{loading ? "GENERANDO..." : "OBTENER HIPÓTESIS"}</button>
                </div>
              )}

              {reporte && (
                <div className="bg-slate-900 text-white p-12 rounded-[4rem] space-y-6">
                  <h2 className="text-3xl font-black italic">Hipótesis Causa Raíz</h2>
                  <p className="text-2xl text-blue-400 italic">"{renderText(reporte.hipotesis)}"</p>
                  <button onClick={() => {setReporte(null); setCategorias([]); setSintomas(''); setContexto('');}} className="text-slate-400 underline uppercase font-black text-xs">Nueva Auditoría</button>
                </div>
              )}
            </div>
          )}

          {tabActiva === 'bitacora' && (
            <div className="space-y-8 pb-20">
              <div className="flex justify-between items-center">
                <h2 className="text-4xl font-black italic uppercase">Bitácora</h2>
                <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e)=>setBusqueda(e.target.value)} className="p-3 bg-white rounded-2xl border border-slate-200 text-sm outline-none shadow-sm" />
              </div>
              <div className="grid gap-6">
                {incidencias.filter(i => (i.titulo || '').toLowerCase().includes(busqueda.toLowerCase())).map((item) => (
                  <div key={item.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${item.estado === 'resuelto' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.estado}</span>
                      <span className="text-[10px] font-bold text-slate-300">{item.fecha?.toDate()?.toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xl font-black italic uppercase tracking-tighter">{item.titulo}</h4>
                    <p className="text-slate-500 text-sm italic">Sintoma: {renderText(item.descripcion)}</p>
                    <div className="bg-blue-50 p-6 rounded-2xl">
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-1 italic">IA Predice:</p>
                      <p className="font-bold italic">"{renderText(item.solucion)}"</p>
                    </div>
                    {item.estado !== 'resuelto' ? (
                      <div className="flex gap-3">
                        <button onClick={() => enviarFeedback(item.id, true, item.solucion)} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2"><ThumbsUp size={14}/> SÍ, FUNCIONÓ</button>
                        <button onClick={() => enviarFeedback(item.id, false, "")} className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2"><ThumbsDown size={14}/> FUE OTRA COSA</button>
                      </div>
                    ) : (
                      <div className="bg-slate-900 text-white p-6 rounded-2xl font-bold italic">
                        <p className="text-[10px] text-blue-400 mb-1 uppercase tracking-widest">Solución Real Validada:</p>
                        "{renderText(item.solucion_final)}"
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
