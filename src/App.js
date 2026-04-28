import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Info, AlertTriangle, 
  CheckCircle2, ChevronRight, Briefcase, Zap, ShieldCheck,
  LayoutDashboard, History, Settings, LogOut, Search
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { db, auth, guardarReporteEnNube } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  // --- ESTADOS DE NAVEGACIÓN Y BÚSQUEDA ---
  const [tabActiva, setTabActiva] = useState('inicio');
  const [busqueda, setBusqueda] = useState('');

  // --- ESTADOS DE LA APLICACIÓN ---
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]); 
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  const [aviso, setAviso] = useState(null); 
  const [incidencias, setIncidencias] = useState([]);

  // --- ESTADOS DE USUARIO ---
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [user, setUser] = useState(null);

  // 1. AUTH & SUBSCRIPTION (Igual a tu código previo)
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) { setIsSubscribed(false); setCheckingSubscription(false); }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (user) {
      setCheckingSubscription(true);
      const q = query(collection(db, "customers", user.uid, "subscriptions"), where("status", "in", ["trailing", "active"]));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsSubscribed(!snapshot.empty);
        setCheckingSubscription(false);
      }, () => setCheckingSubscription(false));
      return () => unsubscribe();
    }
  }, [user]);

  // 2. LISTENER DE BITÁCORA (Escucha cambios en Firestore)
  useEffect(() => {
    if (user && tabActiva === 'bitacora') {
      const q = query(collection(db, "customers", user.uid, "incidencias"), orderBy("fecha", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIncidencias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [user, tabActiva]);

  // --- FUNCIONES DE LÓGICA ---

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 5000);
  };

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Completa los campos.");
    setLoading(true);
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `CONTEXTO: ${contexto}. SÍNTOMA: ${sintomas}.` })
      });
      const data = await response.json();
      if (data.categorias) setCategorias(data.categorias);
    } catch (e) { alert("Error IA"); } finally { setLoading(false); }
  };

  // AJUSTE 1: Autoguardado en Bitácora al generar ACR
  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const promptACR = `SÍNTOMA ORIGINAL: ${sintomas}. RESPUESTAS DE AUDITORÍA: ${JSON.stringify(respuestas)}`;
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptACR })
      });
      const data = await response.json();
      setReporte(data);
      
      if (user) {
        // Guardamos automáticamente con el formato de la Bitácora
        await addDoc(collection(db, "customers", user.uid, "incidencias"), {
          titulo: `Auditoría: ${contexto}`,
          descripcion: sintomas,
          solucion: data.hipotesis, // Usamos la hipótesis de la IA como solución
          tags: ["IA-6M", "ACR-Generado"],
          fecha: serverTimestamp(),
          reincidencias: 1
        });
        mostrarAviso("✅ Reporte analizado y guardado en tu bitácora.");
      }
    } catch (e) { alert("Error al generar reporte."); } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col sticky top-0 h-screen z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Activity size={24} /></div>
            <h1 className="text-xl font-black tracking-tighter italic">AUDITORÍA<span className="text-blue-600">6M</span></h1>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'inicio' ? 'bg-blue-600 shadow-xl' : 'text-slate-400 hover:bg-white/5'}`}>
              <LayoutDashboard size={18} /> Resumen
            </button>
            <button onClick={() => setTabActiva('nueva')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'nueva' ? 'bg-blue-600 shadow-xl' : 'text-slate-400 hover:bg-white/5'}`}>
              <Zap size={18} /> Nueva Auditoría
            </button>
            <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'bitacora' ? 'bg-blue-600 shadow-xl' : 'text-slate-400 hover:bg-white/5'}`}>
              <History size={18} /> Mi Bitácora
            </button>
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-white/5">
          <AuthCorner />
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          
          {user && isSubscribed && (
            <>
              {/* VISTA RESUMEN */}
              {tabActiva === 'inicio' && (
                <div className="space-y-8 animate-in fade-in">
                  <h2 className="text-4xl font-black italic">Control <span className="text-blue-600">Panel</span></h2>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de Conocimiento</p>
                      <p className="text-4xl font-black mt-1">{incidencias.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA NUEVA AUDITORÍA */}
              {tabActiva === 'nueva' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-5">
                   {/* ... Tu lógica de formulario actual (Contexto, Síntomas, Cuestionario y Reporte) ... */}
                   <section className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-6">
                      <h3 className="text-2xl font-black text-center mb-6">Nuevo Diagnóstico Técnico</h3>
                      <input className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all" 
                             value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Ubicación o Activo (Ej: Motor Principal)" />
                      <textarea className="w-full p-5 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-600 transition-all h-32" 
                                value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="¿Qué fallos presenta?" />
                      <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-xl hover:bg-blue-600 transition-all">
                        {loading ? "PROCESANDO..." : "INICIAR ANÁLISIS 6M"}
                      </button>
                   </section>
                </div>
              )}

              {/* AJUSTE 2: VISTA BITÁCORA CON BUSCADOR */}
              {tabActiva === 'bitacora' && (
                <div className="space-y-8 animate-in fade-in">
                  <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-4xl font-black italic">Mi <span className="text-blue-600">Bitácora</span></h2>
                      <p className="text-slate-500 font-medium">Consulta tus experiencias técnicas pasadas.</p>
                    </div>
                    
                    {/* Barra de Búsqueda */}
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar por título o falla..." 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none shadow-sm transition-all text-sm"
                      />
                    </div>
                  </header>

                  <div className="grid gap-6">
                    {incidencias
                      .filter(i => i.titulo?.toLowerCase().includes(busqueda.toLowerCase()) || i.descripcion?.toLowerCase().includes(busqueda.toLowerCase()))
                      .map((item) => (
                        <div key={item.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                              {item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : 'Reciente'}
                            </span>
                          </div>
                          <h4 className="text-xl font-black mb-4 group-hover:text-blue-600 transition-colors">{item.titulo}</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-5 rounded-2xl">
                              <p className="text-[10px] font-black uppercase text-slate-400 mb-1 italic">Síntoma</p>
                              <p className="text-sm leading-relaxed text-slate-600">{item.descripcion}</p>
                            </div>
                            <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                              <p className="text-[10px] font-black uppercase text-green-600 mb-1 italic">Hipótesis ACR</p>
                              <p className="text-sm font-bold text-green-900 italic">"{item.solucion}"</p>
                            </div>
                          </div>
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
