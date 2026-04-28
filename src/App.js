import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Zap, History, Clock, CheckCircle2, AlertCircle, ShieldAlert, CreditCard } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp, where } from "firebase/firestore";
import { db, auth } from './firebase';
import AuthCorner from './AuthCorner';

// ✅ URL del backend desde variable de entorno
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://sixmprueba.onrender.com';

// ✅ Prompts separados del código de UI
const prompts = {
  entrevista: (sintomas, contexto) =>
    `Eres consultor 6M. Analiza: ${sintomas} en ${contexto}. JSON: {"categorias": [{"nombre": "...", "preguntas": [{"texto": "..."}]}]}`,
  acr: (respuestas) =>
    `Genera ACR basado en: ${JSON.stringify(respuestas)}. JSON: {"hipotesis": "..."}`,
};

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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  // ✅ Estado de error en lugar de alert()
  const [error, setError] = useState(null);

  // 1. GESTIÓN DE AUTH Y SUSCRIPCIÓN
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        const subQuery = query(
          collection(db, "customers", u.uid, "subscriptions"),
          where("status", "in", ["active", "trialing"])
        );
        // ✅ Guardamos el unsubscribe del onSnapshot para evitar memory leaks
        const unsubSnap = onSnapshot(subQuery, (snapshot) => {
          setIsSubscribed(!snapshot.empty);
          setCheckingAuth(false);
        });
        return unsubSnap; // se limpia al cambiar de usuario
      } else {
        setIsSubscribed(false);
        setCheckingAuth(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. CARGA DE INCIDENCIAS (solo si está suscrito)
  useEffect(() => {
    if (user && isSubscribed) {
      const q = query(collection(db, "customers", user.uid, "incidencias"), orderBy("fecha", "desc"));
      const unsub = onSnapshot(q, (snaps) => {
        setIncidencias(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub(); // ✅ Cleanup correcto
    }
  }, [user, isSubscribed]);

  // --- PANTALLAS DE BLOQUEO ---
  if (checkingAuth) return (
    <div className="h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-t-2 border-cyan-500 rounded-full" />
    </div>
  );

  if (!user) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0F172A] text-white p-6">
      <h1 className="text-5xl font-black text-cyan-500 mb-8 italic tracking-tighter">ACR.RADIX</h1>
      <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl text-center max-w-md w-full">
        <ShieldAlert className="mx-auto text-cyan-400 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2 uppercase">Acceso Restringido</h2>
        <p className="text-slate-400 mb-8 text-sm font-medium">Inicie sesión con sus credenciales autorizadas.</p>
        <AuthCorner />
      </div>
    </div>
  );

  if (!isSubscribed) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0F172A] text-white p-6">
      <h1 className="text-5xl font-black text-cyan-500 mb-8 italic tracking-tighter">ACR.RADIX</h1>
      <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl text-center max-w-md w-full">
        <CreditCard className="mx-auto text-amber-400 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2 uppercase">Suscripción Requerida</h2>
        <p className="text-slate-400 mb-8 text-sm">Su cuenta no tiene una suscripción activa.</p>
        {/* ✅ Aquí debes conectar tu Stripe Checkout Session */}
        <button
          onClick={() => window.location.href = 'https://buy.stripe.com/TU_LINK_AQUI'}
          className="w-full bg-cyan-600 text-white p-4 rounded-2xl font-black uppercase hover:bg-cyan-500 mb-4"
        >
          Activar Plan Industrial
        </button>
        <AuthCorner />
      </div>
    </div>
  );

  // --- FUNCIONES DE IA ---
  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) {
      setError("Complete todos los campos antes de continuar.");
      return;
    }
    setError(null);
    setLoading(true);
    setCategorias([]);
    setReporte(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/diagnostico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompts.entrevista(sintomas, contexto) })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Error del servidor');
      setCategorias(d.categorias || d.categories || []);
    } catch (e) {
      setError("Error de conexión con el servidor. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateACR = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/diagnostico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompts.acr(respuestas) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error del servidor');
      setReporte(data);
      await addDoc(collection(db, "customers", user.uid, "incidencias"), {
        titulo: contexto,
        descripcion: sintomas,
        solucion: data.hipotesis || "Dictamen Generado",
        estado: "pendiente",
        fecha: serverTimestamp()
      });
    } catch (e) {
      setError("Error al generar el dictamen. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* SIDEBAR */}
      <aside className="w-80 bg-[#0F172A] text-white p-8 flex flex-col border-r border-slate-800">
        <h1 className="text-2xl font-black mb-12 text-cyan-500 italic tracking-tighter">ACR.RADIX</h1>
        <nav className="space-y-3 flex-1">
          <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'inicio' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
            <LayoutDashboard size={20} /> Monitor
          </button>
          <button onClick={() => { setTabActiva('nueva'); setCategorias([]); setReporte(null); setError(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'nueva' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' : 'text-slate-500 hover:text-white'}`}>
            <Zap size={20} /> Auditoría
          </button>
          <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${tabActiva === 'bitacora' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
            <History size={20} /> Bitácora
          </button>
        </nav>
        <AuthCorner />
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-4xl mx-auto">

          {/* ✅ Banner de error global */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex justify-between items-center">
              {error}
              <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600 font-black">✕</button>
            </div>
          )}

          {tabActiva === 'inicio' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Panel de Control</h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <Clock className="text-cyan-500 mb-4" size={32} />
                  <p className="text-4xl font-black">{incidencias.filter(i => i.estado === 'pendiente').length}</p>
                  <p className="text-slate-500 font-bold uppercase text-xs">Abiertos</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <CheckCircle2 className="text-emerald-500 mb-4" size={32} />
                  <p className="text-4xl font-black">{incidencias.filter(i => i.estado === 'resuelto').length}</p>
                  <p className="text-slate-500 font-bold uppercase text-xs">Cerrados</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <AlertCircle className="text-amber-500 mb-4" size={32} />
                  <p className="text-4xl font-black">{incidencias.length}</p>
                  <p className="text-slate-500 font-bold uppercase text-xs">Total Eventos</p>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'nueva' && (
            <div className="space-y-8">
              {!categorias.length && !reporte && (
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                  <h2 className="text-2xl font-black uppercase italic">Nuevo Análisis 6M</h2>
                  <input className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 transition-all" value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="TAG del Equipo (Ej: BOMBA-01)" />
                  <textarea className="w-full p-4 bg-slate-50 rounded-xl border-none ring-1 ring-slate-200 h-32 focus:ring-2 focus:ring-cyan-500 transition-all" value={sintomas} onChange={(e) => setSintomas(e.target.value)} placeholder="Describa la anomalía técnica..." />
                  <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-5 rounded-xl font-black uppercase tracking-widest hover:bg-cyan-600 transition-all">
                    {loading ? "Analizando..." : "Iniciar Protocolo"}
                  </button>
                </div>
              )}

              {categorias.length > 0 && !reporte && (
                <div className="space-y-6">
                  {categorias.map((cat, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                      <h4 className="font-black text-cyan-600 uppercase text-xs mb-4">{cat.nombre}</h4>
                      {cat.preguntas.map((pre, pIdx) => (
                        <div key={pIdx} className="mb-4 last:mb-0">
                          <p className="font-bold text-slate-700 mb-2">{pre.texto}</p>
                          <input onChange={(e) => setRespuestas({ ...respuestas, [`${idx}-${pIdx}`]: e.target.value })} className="w-full p-3 bg-slate-50 rounded-lg border-none ring-1 ring-slate-200" placeholder="Hallazgo técnico..." />
                        </div>
                      ))}
                    </div>
                  ))}
                  <button onClick={handleGenerateACR} disa
