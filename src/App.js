import React, { useState, useEffect } from 'react';
import { 
  Activity, ClipboardCheck, Info, AlertTriangle, 
  CheckCircle2, ChevronRight, Briefcase, Zap, ShieldCheck,
  LayoutDashboard, History, Settings, LogOut
} from 'lucide-react';
// IMPORTANTE: Añadimos collection, query, onSnapshot para la bitácora
import { collection, query, where, onSnapshot, addDoc, orderBy } from "firebase/firestore";
import { db, auth, guardarReporteEnNube } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [tabActiva, setTabActiva] = useState('inicio');

  // --- ESTADOS DE LA APLICACIÓN ---
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]); 
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  const [aviso, setAviso] = useState(null); 

  // --- ESTADO PARA LA BITÁCORA ---
  const [incidencias, setIncidencias] = useState([]);

  // --- ESTADOS DE USUARIO Y SUSCRIPCIÓN ---
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [user, setUser] = useState(null);

  // 1. ESCUCHAR AUTENTICACIÓN
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsSubscribed(false);
        setCheckingSubscription(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. ESCUCHAR SUSCRIPCIÓN
  useEffect(() => {
    if (user) {
      setCheckingSubscription(true);
      const q = query(
        collection(db, "customers", user.uid, "subscriptions"), 
        where("status", "in", ["trailing", "active"])
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsSubscribed(!snapshot.empty);
        setCheckingSubscription(false);
      }, () => setCheckingSubscription(false));
      return () => unsubscribe();
    }
  }, [user]);

  // 3. NUEVO: ESCUCHAR INCIDENCIAS DE LA BITÁCORA
  useEffect(() => {
    if (user && tabActiva === 'bitacora') {
      // Apuntamos a la subcolección que creamos: customers -> {id} -> incidencias
      const q = query(
        collection(db, "customers", user.uid, "incidencias"),
        orderBy("fecha", "desc") // Los más nuevos primero
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setIncidencias(docs);
      });
      return () => unsubscribe();
    }
  }, [user, tabActiva]);

  // --- FUNCIONES DE LÓGICA (Mantenemos tus originales) ---
  const handleCheckout = async () => {
    try {
      const docRef = await addDoc(collection(db, "customers", user.uid, "checkout_sessions"), {
        price: "price_1TQTdWLEgsq59JtN45ekCQxT", 
        success_url: window.location.origin,
        cancel_url: window.location.origin,
      });
      onSnapshot(docRef, (snap) => {
        const { url } = snap.data() || {};
        if (url) window.location.assign(url);
      });
    } catch (e) { alert("Error al conectar con Stripe."); }
  };

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Faltan datos.");
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

  // --- RENDER ---
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col sticky top-0 h-screen z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-blue-600 p-2 rounded-xl"><Activity size={24} /></div>
            <h1 className="text-xl font-black italic tracking-tighter">AUDITORÍA<span className="text-blue-600">6M</span></h1>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'inicio' ? 'bg-blue-600' : 'text-slate-400 hover:bg-white/5'}`}>
              <LayoutDashboard size={18} /> Resumen
            </button>
            <button onClick={() => setTabActiva('nueva')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'nueva' ? 'bg-blue-600' : 'text-slate-400 hover:bg-white/5'}`}>
              <Zap size={18} /> Nueva Auditoría
            </button>
            <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'bitacora' ? 'bg-blue-600' : 'text-slate-400 hover:bg-white/5'}`}>
              <History size={18} /> Mi Bitácora
            </button>
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-white/5">
          <AuthCorner />
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          
          {checkingSubscription ? (
            <div className="py-40 text-center">Cargando sistema...</div>
          ) : !user ? (
            <section className="text-center py-20">
              <h2 className="text-5xl font-black mb-4">Bienvenido</h2>
              <p className="text-slate-500">Inicia sesión para comenzar.</p>
            </section>
          ) : !isSubscribed ? (
            <section className="text-center py-20 bg-white rounded-[3rem] shadow-xl p-10">
              <Briefcase size={50} className="mx-auto text-blue-600 mb-4" />
              <h2 className="text-3xl font-black mb-4">Plan Senior Requerido</h2>
              <button onClick={handleCheckout} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold">Activar ahora</button>
            </section>
          ) : (
            <>
              {/* VISTA RESUMEN */}
              {tabActiva === 'inicio' && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic">Dashboard</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase">Casos en Bitácora</p>
                      <p className="text-4xl font-black">{incidencias.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA NUEVA AUDITORÍA */}
              {tabActiva === 'nueva' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                   <h2 className="text-3xl font-black">Nueva Auditoría 6M</h2>
                   {/* Aquí va tu formulario original de Contexto y Síntomas */}
                   <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                      <input className="w-full p-4 bg-slate-50 rounded-2xl border" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Localización..." />
                      <textarea className="w-full p-4 bg-slate-50 rounded-2xl border h-32" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="Síntomas..." />
                      <button onClick={handleGenerateEntrevista} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black">INICIAR</button>
                   </section>
                </div>
              )}

              {/* VISTA MI BITÁCORA (HISTORIAL REAL) */}
              {tabActiva === 'bitacora' && (
                <div className="space-y-8 animate-in fade-in">
                  <header>
                    <h2 className="text-4xl font-black tracking-tight">Mi <span className="text-blue-600 italic">Bitácora</span></h2>
                    <p className="text-slate-500 font-medium">Historial técnico de tus soluciones.</p>
                  </header>

                  {incidencias.length === 0 ? (
                    <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                      <History size={40} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 font-bold">No hay registros guardados.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {incidencias.map((item) => (
                        <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                              {item.fecha?.toDate ? item.fecha.toDate().toLocaleDateString() : 'Reciente'}
                            </span>
                            <div className="flex gap-2">
                              {item.tags?.map((t, i) => <span key={i} className="text-[10px] text-slate-400 font-bold italic">#{t}</span>)}
                            </div>
                          </div>
                          <h3 className="text-xl font-black mb-4">{item.titulo}</h3>
                          <div className="grid gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl text-sm">
                              <p className="font-black text-[10px] uppercase text-slate-400 mb-1">Problema detectado</p>
                              {item.descripcion}
                            </div>
                            <div className="bg-green-50 p-4 rounded-2xl text-sm border border-green-100">
                              <p className="font-black text-[10px] uppercase text-green-600 mb-1">Solución ejecutada</p>
                              <p className="font-bold text-green-900">{item.solucion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
