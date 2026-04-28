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
    if (user && tabActiva === 'bitacora') {
      const q = query(collection(db, "customers", user.uid, "incidencias"), orderBy("fecha", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIncidencias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [user, tabActiva]);

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 5000);
  };

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Faltan datos.");
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
    } catch (e) { alert("Error de red"); } finally { setLoading(false); }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const promptACR = `SÍNTOMA ORIGINAL: ${sintomas}. RESPUESTAS: ${JSON.stringify(respuestas)}`;
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptACR })
      });
      const data = await response.json();
      setReporte(data);
      if (user) {
        await addDoc(collection(db, "customers", user.uid, "incidencias"), {
          titulo: `Auditoría: ${contexto}`,
          descripcion: sintomas,
          solucion: data.hipotesis,
          tags: ["IA-6M"],
          fecha: serverTimestamp()
        });
        mostrarAviso("✅ Guardado en bitácora");
      }
    } catch (e) { alert("Error reporte"); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      <aside className="w-72 bg-slate-900 text-white flex flex-col h-full z-50 shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Activity size={24} /></div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase">Auditoría<span className="text-blue-600">6M</span></h1>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'inicio' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}><LayoutDashboard size={18} /> Resumen</button>
            <button onClick={() => setTabActiva('nueva')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'nueva' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}><Zap size={18} /> Nueva Auditoría</button>
            <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'bitacora' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}><History size={18} /> Mi Bitácora</button>
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-white/5 bg-slate-950/20"><AuthCorner /></div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10 relative">
        {aviso && (
          <div className="fixed bottom-10 right-10 z-[100] bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border-l-4 border-yellow-400 animate-in slide-in-from-right-10 flex gap-4 max-w-sm">
            <AlertTriangle className="text-yellow-400 shrink-0" size={20} />
            <p className="text-sm font-medium">{aviso}</p>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {!user ? (
             <section className="text-center py-20"><h2 className="text-5xl font-black italic mb-4 text-slate-800 uppercase">Bienvenido</h2><p className="text-slate-500 text-xl font-medium">Inicia sesión para acceder al sistema.</p></section>
          ) : !isSubscribed && !checkingSubscription ? (
             <section className="bg-white p-16 rounded-[3.5rem] shadow-xl text-center"><Briefcase size={60} className="mx-auto text-blue-600 mb-6" /><h2 className="text-3xl font-black mb-4">Plan Senior Requerido</h2><p className="text-slate-500 mb-8 font-medium italic">Accede al motor de IA y almacenamiento ilimitado.</p><button className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-xl shadow-xl shadow-blue-100 hover:scale-105 transition-all">ACTIVAR SUSCRIPCIÓN</button></section>
          ) : (
            <>
              {tabActiva === 'inicio' && (
                <div className="space-y-8 animate-in fade-in"><h2 className="text-4xl font-black italic uppercase">Panel de Control</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de Conocimiento</p><p className="text-5xl font-black mt-2">{incidencias.length}</p></div></div></div>
              )}

              {tabActiva === 'nueva' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-5 duration-500">
                  {/* PASO 1: INPUTS */}
                  {!categorias.length && !reporte && (
                    <section className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 space-y-8">
                      <div className="text-center"><h2 className="text-4xl font-black tracking-tight mb-2 italic uppercase">Nueva Auditoría</h2><p className="text-slate-400 font-medium italic">Protocolo de Diagnóstico 6M</p></div>
                      <div className="space-y-6">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Localización</label><input className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-lg font-medium" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Ej: Turbina Principal" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción</label><textarea className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-lg font-medium h-40" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="¿Qué anomalías se observan?" /></div>
                        <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 hover:bg-blue-600 text-white p-6 rounded-[2rem] font-black text-xl transition-all shadow-2xl flex items-center justify-center gap-3">{loading ? "ANALIZANDO..." : "INICIAR PROCESO 6M"}</button>
                      </div>
                    </section>
                  )}

                  {/* PASO 2: PREGUNTAS (ESTO CORRIGE TU ERROR) */}
                  {categorias.length > 0 && !reporte && (
                    <div className="space-y-12 pb-20 animate-in fade-in">
                      <div className="flex items-center gap-4"><button onClick={() => setCategorias([])} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-colors"><ArrowLeft size={20} /></button><h3 className="text-3xl font-black italic uppercase">Protocolo 6M</h3></div>
                      {categorias.map((cat, idx) => (
                        <div key={idx} className="space-y-8">
                          <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-50 px-6 py-2 rounded-full border border-blue-100 inline-block shadow-sm">{cat.nombre}</h4>
                          <div className="grid gap-6">
                            {cat.preguntas.map((pre, pIdx) => (
                              <div key={pIdx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                                <p className="font-black text-slate-800 text-lg mb-4 leading-tight">{pre.texto}</p>
                                <input onFocus={() => mostrarAviso(pre.aviso)} onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pIdx}`]: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium" placeholder="Escribe observación técnica..." />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white p-8 rounded-[3rem] font-black text-2xl shadow-2xl shadow-green-100 transition-all hover:scale-[1.02] active:scale-95">{loading ? "GENERANDO INFORME..." : "GENERAR REPORTE ACR"}</button>
                    </div>
                  )}

                  {/* PASO 3: REPORTE */}
                  {reporte && (
                    <section className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl space-y-12 border-t-[16px] border-blue-600 animate-in zoom-in-95">
                      <div className="text-center space-y-4"><CheckCircle2 className="mx-auto text-green-400" size={60} /><h2 className="text-5xl font-black tracking-tight uppercase italic">Informe Final</h2></div>
                      <div className="bg-blue-600/20 p-10 rounded-[3rem] border border-blue-500/30">
                        <h5 className="font-black text-2xl mb-4 flex items-center gap-3 italic"><Info /> Hipótesis ACR</h5>
                        <p className="text-blue-50 text-2xl font-medium leading-relaxed italic">"{reporte.hipotesis}"</p>
                      </div>
                      <button onClick={() => {setReporte(null); setCategorias([]); setContexto(''); setSintomas('');}} className="w-full py-6 text-slate-500 font-black uppercase hover:text-white transition-all italic tracking-widest text-sm">Nueva Auditoría Técnica</button>
                    </section>
                  )}
                </div>
              )}

              {tabActiva === 'bitacora' && (
                <div className="space-y-8 animate-in fade-in">
                  <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div><h2 className="text-4xl font-black italic uppercase">Mi <span className="text-blue-600">Bitácora</span></h2><p className="text-slate-500 font-medium italic">Consulta tus experiencias técnicas pasadas.</p></div>
                    <div className="relative w-full md:w-72"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 outline-none shadow-sm transition-all text-sm" /></div>
                  </header>
                  <div className="grid gap-6">
                    {incidencias.filter(i => i.titulo?.toLowerCase().includes(busqueda.toLowerCase())).map((item) => (
                      <div key={item.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"><span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase mb-4 inline-block tracking-widest">{item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : 'Hoy'}</span><h4 className="text-xl font-black mb-4 uppercase italic tracking-tighter">{item.titulo}</h4><div className="bg-slate-50 p-5 rounded-2xl text-sm italic border border-slate-100 text-slate-600 leading-relaxed">"{item.solucion}"</div></div>
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
