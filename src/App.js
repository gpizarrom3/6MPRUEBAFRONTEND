import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, History, BarChart3, 
  LogOut, CheckCircle2, Clock, AlertCircle, PlusCircle, ChevronRight, Zap, ShieldCheck
} from 'lucide-react';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import AuthCorner from './AuthCorner'; // Asegúrate de tener este archivo creado

const API_BASE_URL = 'https://sixmprueba.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard'); 
  const [loading, setLoading] = useState(false);
  const [casos, setCasos] = useState([]);
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [reporteFinal, setReporteFinal] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false); // Simulación de suscripción
  const [resolucionManual, setResolucionManual] = useState('');

  // Autenticación
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      if(u) cargarCasos(u.uid);
    });
    return () => unsub();
  }, []);

  const cargarCasos = (uid) => {
    const q = query(collection(db, "casos"), where("userId", "==", uid));
    onSnapshot(q, (snap) => {
      setCasos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  };

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  
  const iniciarAuditoria = async () => {
    if (!contexto || !sintomas) return alert("Por favor completa el contexto y síntoma.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tipo: "PREGUNTAS", datos: { contexto, sintomas } })
      });
      const data = await res.json();
      setCategorias(data.categorias);
      setView('audit');
    } catch (e) { alert("Error al conectar con la IA"); }
    setLoading(false);
  };

  const finalizarAuditoria = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tipo: "REPORTE", datos: { respuestas } })
      });
      const data = await res.json();
      setReporteFinal(data);
      
      await addDoc(collection(db, "casos"), {
        userId: user.uid,
        userName: user.displayName,
        contexto,
        sintomas,
        reporte: data,
        status: 'pendiente',
        fecha: new Date().toISOString(),
        resolucion: ''
      });
      
      setView('report');
    } catch (e) { alert("Error al generar reporte"); }
    setLoading(false);
  };

  const resolverCaso = async (id, modo) => {
    const textoResolucion = modo === 'ia' ? 'Siguió recomendaciones de la IA' : resolucionManual;
    if (!textoResolucion) return alert("Por favor escribe cómo lo solucionaste.");
    
    await updateDoc(doc(db, "casos", id), {
      status: 'solucionado',
      resolucion: textoResolucion
    });
    setResolucionManual('');
  };

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-md space-y-8">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-2xl">
          <Zap size={40} />
        </div>
        <h1 className="text-4xl font-black tracking-tighter italic">AUDITORÍA 6M AI</h1>
        <p className="text-slate-400">Plataforma de Diagnóstico Industrial Basada en Ishikawa.</p>
        <button onClick={handleLogin} className="w-full bg-white text-slate-900 p-4 rounded-2xl font-black hover:scale-105 transition-transform flex items-center justify-center gap-3">
          Ingresar con Google
        </button>
      </div>
    </div>
  );

  if (!isSubscribed) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 border border-slate-100">
        <ShieldCheck size={60} className="mx-auto text-blue-600" />
        <h2 className="text-3xl font-black">Plan Pro Activo</h2>
        <p className="text-slate-500">Para acceder al Dashboard y a la IA 6M, activa tu suscripción.</p>
        <button onClick={() => setIsSubscribed(true)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-200">
          SUSCRIBIRSE AHORA
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <AuthCorner user={user} />
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r flex flex-col p-8 space-y-8 hidden md:flex">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white"><LayoutDashboard size={20}/></div>
          <span className="font-black text-xl tracking-tight italic uppercase">DIMECA 6M</span>
        </div>
        <nav className="flex-grow space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Resumen' },
            { id: 'audit_start', icon: PlusCircle, label: 'Nueva Auditoría' },
            { id: 'history', icon: History, label: 'Historial' },
            { id: 'kpis', icon: BarChart3, label: 'Métricas KPI' },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl">
          <LogOut size={20} /> Salir
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-grow p-10 overflow-y-auto">
        
        {view === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <header>
              <h2 className="text-4xl font-black tracking-tight">Bienvenido, {user.displayName.split(' ')[0]}</h2>
              <p className="text-slate-400 font-medium italic">"La calidad no es un acto, es un hábito."</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="Total Casos" value={casos.length} icon={ClipboardList} color="blue" />
              <StatCard label="Solucionados" value={casos.filter(c => c.status === 'solucionado').length} icon={CheckCircle2} color="green" />
              <StatCard label="En Proceso" value={casos.filter(c => c.status === 'pendiente').length} icon={Clock} color="orange" />
            </div>

            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <h3 className="text-xl font-black mb-6">Auditorías Recientes</h3>
              <div className="space-y-4">
                {casos.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <p className="font-bold text-slate-700">{c.sintomas}</p>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${c.status === 'solucionado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'audit_start' && (
          <div className="max-w-2xl mx-auto py-20 space-y-10 animate-in zoom-in duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black tracking-tighter">Nueva Entrada</h2>
              <p className="text-slate-500 text-lg italic">Describe lo que tus sentidos detectan en la planta.</p>
            </div>
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 space-y-6">
              <input placeholder="Ubicación (Ej: Nave 3, Línea de Envasado)" className="w-full p-6 bg-slate-50 rounded-3xl outline-none focus:ring-4 ring-blue-50 transition-all font-medium" onChange={e => setContexto(e.target.value)} />
              <textarea placeholder="¿Qué anomalía observas, escuchas o hueles?" className="w-full p-6 bg-slate-50 rounded-3xl outline-none h-40 focus:ring-4 ring-blue-50 transition-all font-medium" onChange={e => setSintomas(e.target.value)} />
              <button onClick={iniciarAuditoria} disabled={loading} className="w-full bg-slate-900 text-white p-6 rounded-3xl font-black text-xl hover:bg-blue-600 transition-all shadow-xl">
                {loading ? "PROCESANDO..." : "INICIAR DIAGNÓSTICO 6M"}
              </button>
            </div>
          </div>
        )}

        {view === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <h2 className="text-4xl font-black text-center italic uppercase tracking-tighter">Protocolo Sensorial</h2>
            {categorias.map((cat, idx) => (
              <div key={idx} className="space-y-6">
                <h4 className="text-blue-600 font-black uppercase tracking-[0.3em] text-xs bg-blue-50 px-5 py-2 rounded-full inline-block">{cat.nombre}</h4>
                <div className="grid gap-6">
                  {cat.preguntas.map((p, pidx) => (
                    <div key={pidx} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                      <p className="font-black text-lg mb-4 text-slate-800">{p.texto}</p>
                      <input 
                        className="w-full p-5 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500 font-medium" 
                        placeholder="Escribe tu observación técnica..."
                        onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pidx}`]: e.target.value})}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={finalizarAuditoria} disabled={loading} className="w-full bg-green-600 text-white p-8 rounded-[3rem] font-black text-2xl shadow-2xl hover:scale-[1.02] transition-transform">
              {loading ? "GENERANDO INFORME..." : "VER REPORTE FINAL ACR"}
            </button>
          </div>
        )}

        {view === 'report' && reporteFinal && (
          <div className="bg-slate-900 text-white p-16 rounded-[4rem] shadow-2xl space-y-12 border-t-[20px] border-blue-600 animate-in zoom-in duration-700">
             <div className="text-center space-y-4">
                <CheckCircle2 className="mx-auto text-green-400" size={80} />
                <h2 className="text-6xl font-black tracking-tighter">Informe ACR</h2>
             </div>
             <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(reporteFinal.resumen_6m).map(([m, d]) => (
                  <div key={m} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
                    <h5 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-3">{m}</h5>
                    <p className="text-sm opacity-80 leading-relaxed font-medium">{d}</p>
                  </div>
                ))}
             </div>
             <div className="bg-blue-600 p-12 rounded-[3.5rem] shadow-xl">
                <h5 className="font-black text-3xl mb-4 italic flex items-center gap-3">Hipótesis de Causa Raíz</h5>
                <p className="text-2xl font-bold leading-tight">"{reporteFinal.hipotesis}"</p>
             </div>
             <button onClick={() => setView('dashboard')} className="w-full p-6 bg-white text-slate-900 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em]">
                Cerrar e Ir al Panel
             </button>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-10">
            <h2 className="text-4xl font-black tracking-tighter">Archivo Maestro de Casos</h2>
            <div className="grid gap-8">
              {casos.map(c => (
                <div key={c.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-2xl text-slate-800">{c.sintomas}</h4>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">{c.contexto} — {new Date(c.fecha).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-6 py-2 rounded-full text-xs font-black uppercase ${c.status === 'solucionado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {c.status}
                    </span>
                  </div>
                  
                  {c.status === 'pendiente' ? (
                    <div className="pt-8 border-t space-y-6">
                      <p className="font-black text-slate-600">Resolución de Auditoría:</p>
                      <textarea 
                        className="w-full p-5 bg-slate-50 rounded-2xl outline-none border focus:border-green-500 font-medium" 
                        placeholder="Explica manualmente cómo se logró solucionar el problema..."
                        value={resolucionManual}
                        onChange={(e) => setResolucionManual(e.target.value)}
                      />
                      <div className="flex gap-4">
                        <button onClick={() => resolverCaso(c.id, 'ia')} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">Siguió a la IA</button>
                        <button onClick={() => resolverCaso(c.id, 'manual')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all">Manual</button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-8 border-t p-8 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Bitácora de Solución:</p>
                      <p className="text-lg font-bold text-slate-700 italic">"{c.resolucion}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'kpis' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <header>
              <h2 className="text-4xl font-black tracking-tighter">Métricas de Rendimiento (KPI)</h2>
              <p className="text-slate-500 italic font-medium">Visualización de eficiencia en resolución de fallos.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 text-center space-y-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Eficiencia Resolutiva</p>
                <p className="text-7xl font-black text-blue-600">
                  {casos.length > 0 ? ((casos.filter(c => c.status === 'solucionado').length / casos.length) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-sm text-slate-500 font-bold">Porcentaje de éxito vs casos registrados</p>
              </div>
              <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 text-center space-y-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Intensidad de Auditoría</p>
                <p className="text-7xl font-black text-indigo-600">
                  {casos.length}
                </p>
                <p className="text-sm text-slate-500 font-bold">Eventos diagnosticados por la IA</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-xl transition-all">
    <div className={`p-5 rounded-[1.5rem] ${color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'green' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
      <Icon size={28} />
    </div>
    <div>
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{label}</p>
      <p className="text-4xl font-black text-slate-800">{value}</p>
    </div>
  </div>
);

export default App;
