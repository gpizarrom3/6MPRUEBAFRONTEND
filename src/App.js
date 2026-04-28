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
  const [verDetalle, setVerDetalle] = useState(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => { 
      setUser(u); 
      if (!u) {
        setIsSubscribed(false);
        setCheckingSubscription(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (user) {
      // Verificamos suscripción (opcional, puedes comentarlo para pruebas)
      const qSub = query(collection(db, "customers", user.uid, "subscriptions"), where("status", "in", ["trailing", "active"]));
      onSnapshot(qSub, (snap) => {
        setIsSubscribed(!snap.empty);
        setCheckingSubscription(false);
      }, () => setCheckingSubscription(false));

      // Cargamos incidencias
      const qInc = query(collection(db, "customers", user.uid, "incidencias"), orderBy("fecha", "desc"));
      const unsubInc = onSnapshot(qInc, (snaps) => {
        const docs = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
        setIncidencias(docs);
      });
      return () => unsubInc();
    }
  }, [user]);

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 5000);
  };

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Faltan datos");
    setLoading(true); setCategorias([]); setReporte(null); setAntecedenteEncontrado(null);
    
    const norm = (t) => t ? t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const pals = norm(sintomas).split(/\s+/).filter(p => p.length > 4);
    const coinc = incidencias.find(i => i.estado === 'resuelto' && pals.some(p => norm(`${i.titulo} ${i.descripcion}`).includes(p)));
    
    let pFinal = `CONTEXTO: ${contexto}. SÍNTOMA: ${sintomas}.`;
    if (coinc) {
      setAntecedenteEncontrado(coinc);
      pFinal = `ANTECEDENTE: El ${coinc.fecha?.toDate().toLocaleDateString()} se resolvió algo similar con "${coinc.solucion_final}". ${pFinal}`;
    }

    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: pFinal })
      });
      const d = await res.json();
      if (d.categorias) setCategorias(d.categorias);
    } catch (e) { alert("Error de IA"); } finally { setLoading(false); }
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
          titulo: `Auditoría en ${contexto}`,
          descripcion: sintomas,
          informe_completo: data,
          solucion: data.hipotesis || "Sin hipótesis",
          estado: "pendiente",
          fecha: serverTimestamp()
        });
      }
    } catch (e) { alert("Error al guardar"); } finally { setLoading(false); }
  };

  const enviarFeedback = async (id, fueExitosa, solucionIA) => {
    try {
      const docRef = doc(db, "customers", user.uid, "incidencias", id);
      let final = fueExitosa ? solucionIA : prompt("Indica la solución real aplicada:");
      if (!final) return;
      await updateDoc(docRef, {
        estado: "resuelto",
        ia_acerto: fueExitosa,
        solucion_final: final,
        fecha_resolucion: serverTimestamp()
      });
      mostrarAviso("📋 Conocimiento actualizado.");
    } catch (e) { alert("Error al actualizar"); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col h-full z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-blue-600 p-2 rounded-xl"><Activity size={24} /></div>
            <h1 className="text-xl font-black italic tracking-tighter">AUDITORÍA<span className="text-blue-600">6M</span></h1>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tabActiva === 'inicio' ? 'bg-blue-600' : 'text-slate-400'}`}><LayoutDashboard size={18} /> Resumen</button>
            <button onClick={() => setTabActiva('nueva')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tabActiva === 'nueva' ? 'bg-blue-600' : 'text-slate-400'}`}><Zap size={18} /> Nueva</button>
            <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tabActiva === 'bitacora' ? 'bg-blue-600' : 'text-slate-400'}`}><History size={18} /> Bitácora</button>
          </nav>
        </div>
        <div className="mt-auto p-8"><AuthCorner /></div>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 overflow-y-auto p-10 relative">
        {aviso && <div className="fixed bottom-10 right-10 bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border-l-4 border-yellow-400 z-[200]">{aviso}</div>}

        <div className="max-w-4xl mx-auto">
          {tabActiva === 'inicio' && (
            <div className="grid grid-cols-2 gap-6 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Total Casos</p>
                <p className="text-5xl font-black">{incidencias?.length || 0}</p>
              </div>
            </div>
          )}

          {tabActiva === 'nueva' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-5">
              {!categorias?.length && !reporte && (
                <section className="bg-white p-12 rounded-[3.5rem] shadow-xl space-y-6">
                  <h2 className="text-3xl font-black italic uppercase text-center">Nuevo Análisis</h2>
                  <input className="w-full p-5 bg-slate-50 rounded-3xl outline-none ring-1 ring-slate-200" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Localización..." />
                  <textarea className="w-full p-5 bg-slate-50 rounded-3xl outline-none ring-1 ring-slate-200 h-40" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Síntomas..." />
                  <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black">{loading ? "Analizando..." : "Iniciar 6M"}</button>
                </section>
              )}
              {/* Aquí el cuestionario se vería igual que antes */}
            </div>
          )}

          {tabActiva === 'bitacora' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex justify-between items-end">
                <h2 className="text-4xl font-black italic uppercase">Bitácora</h2>
                <div className="relative w-64">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                   <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e)=>setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm" />
                </div>
              </div>

              <div className="grid gap-6">
                {incidencias?.filter(i => i.titulo?.toLowerCase().includes(busqueda.toLowerCase())).map((item) => (
                  <div key={item.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${item.estado === 'resuelto' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.estado}</span>
                      <div className="flex items-center gap-3">
                         {item.informe_completo && (
                           <button onClick={() => setVerDetalle(item)} className="text-blue-600 font-black text-[10px] flex items-center gap-1 hover:underline"><FileText size={14}/> VER INFORME</button>
                         )}
                         <span className="text-[10px] font-bold text-slate-300 italic">{item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : 'Reciente'}</span>
                      </div>
                    </div>
                    
                    <h4 className="text-xl font-black italic uppercase tracking-tighter">{item.titulo}</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                       <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Problema</p>
                          <p className="line-clamp-2 italic">"{item.descripcion}"</p>
                       </div>
                       <div className="bg-blue-50/50 p-4 rounded-2xl">
                          <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Predicción IA</p>
                          <p className="line-clamp-2 font-bold italic">"{item.solucion}"</p>
                       </div>
                    </div>

                    {item.estado !== 'resuelto' ? (
                       <div className="flex gap-3">
                          <button onClick={() => enviarFeedback(item.id, true, item.solucion)} className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-black text-[11px] shadow-lg shadow-green-100 flex items-center justify-center gap-2"><ThumbsUp size={14}/> SÍ, FUNCIONÓ</button>
                          <button onClick={() => enviarFeedback(item.id, false, "")} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2"><ThumbsDown size={14}/> FUE OTRA COSA</button>
                       </div>
                    ) : (
                       <div className="bg-slate-900 text-white p-5 rounded-[2rem]">
                          <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Solución Validada</p>
                          <p className="font-bold italic">"{item.solucion_final}"</p>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL DEL INFORME COMPLETO */}
        {verDetalle && (
          <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-end">
             <div className="bg-white h-full w-full max-w-2xl shadow-2xl p-10 overflow-y-auto animate-in slide-in-from-right duration-500 space-y-8">
                <div className="flex justify-between items-center">
                   <button onClick={() => setVerDetalle(null)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informe ACR</span>
                </div>
                <h2 className="text-4xl font-black italic uppercase leading-none">{verDetalle.titulo}</h2>
                
                {/* 6M ANALISIS */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">Factores 6M</h4>
                  {verDetalle.informe_completo?.analisis_6m?.map((m, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{m.categoria}</p>
                      <p className="font-bold italic text-slate-700">"{m.resumen}"</p>
                    </div>
                  ))}
                </div>

                {/* HIPOTESIS */}
                <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] border-l-8 border-blue-600">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Hipótesis Causa Raíz</p>
                  <p className="text-2xl font-black italic leading-tight">"{verDetalle.informe_completo?.hipotesis}"</p>
                </div>

                {/* RECOMENDACIONES */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest border-b pb-2">Recomendaciones</h4>
                  <div className="space-y-2">
                    {verDetalle.informe_completo?.recomendaciones?.map((r, idx) => (
                      <div key={idx} className="bg-green-50 p-4 rounded-2xl flex gap-3 text-green-900 text-sm font-bold">
                        <CheckCircle2 size={16} className="shrink-0 mt-1"/> {r}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all">IMPRIMIR PDF</button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
