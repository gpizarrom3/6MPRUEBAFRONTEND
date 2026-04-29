import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, History, BarChart3, 
  LogOut, CheckCircle2, Clock, AlertCircle, PlusCircle, ChevronRight
} from 'lucide-react';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard'); // dashboard, audit, report, history, kpis
  const [loading, setLoading] = useState(false);
  const [casos, setCasos] = useState([]);
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [reporteFinal, setReporteFinal] = useState(null);

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
    setLoading(true);
    try {
      const res = await fetch('TU_URL_RENDER/api/diagnostico', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tipo: "PREGUNTAS", datos: { contexto, sintomas } })
      });
      const data = await res.json();
      setCategorias(data.categorias);
      setView('audit');
    } catch (e) { alert("Error"); }
    setLoading(false);
  };

  const finalizarAuditoria = async () => {
    setLoading(true);
    try {
      const res = await fetch('TU_URL_RENDER/api/diagnostico', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tipo: "REPORTE", datos: { respuestas } })
      });
      const data = await res.json();
      setReporteFinal(data);
      
      // Guardar en Firestore
      await addDoc(collection(db, "casos"), {
        userId: user.uid,
        userName: user.displayName,
        contexto,
        sintomas,
        reporte: data,
        status: 'pendiente',
        fecha: new Date().toISOString()
      });
      
      setView('report');
    } catch (e) { alert("Error"); }
    setLoading(false);
  };

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-md space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/50">
          <ClipboardList size={40} />
        </div>
        <h1 className="text-4xl font-black tracking-tighter">Auditoría 6M AI</h1>
        <p className="text-slate-400">Ingresa para diagnosticar fallos industriales con Inteligencia Artificial.</p>
        <button onClick={handleLogin} className="w-full bg-white text-slate-900 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-transform">
          Continuar con Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r flex flex-col p-6 space-y-8 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-blue-600 p-2 rounded-xl text-white"><BarChart3 size={20}/></div>
          <span className="font-black text-xl tracking-tight">6M PANEL</span>
        </div>
        <nav className="flex-grow space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'audit_start', icon: PlusCircle, label: 'Nueva Auditoría' },
            { id: 'history', icon: History, label: 'Historial de Casos' },
            { id: 'kpis', icon: BarChart3, label: 'Principales KPI' },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl">
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-grow p-10 overflow-y-auto">
        
        {/* VISTA: DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-10">
            <header>
              <h2 className="text-3xl font-black">Hola, {user.displayName} 👋</h2>
              <p className="text-slate-500">Resumen de operaciones de auditoría.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Casos Registrados" value={casos.length} icon={ClipboardList} color="blue" />
              <StatCard label="Solucionados" value={casos.filter(c => c.status === 'solucionado').length} icon={CheckCircle2} color="green" />
              <StatCard label="Pendientes" value={casos.filter(c => c.status === 'pendiente').length} icon={Clock} color="orange" />
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="font-black mb-6">Actividad Reciente</h3>
              <div className="space-y-4">
                {casos.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="font-bold">{c.sintomas}</p>
                      <p className="text-xs text-slate-400">{new Date(c.fecha).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${c.status === 'solucionado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA: INICIO AUDITORIA */}
        {view === 'audit_start' && (
          <div className="max-w-2xl mx-auto space-y-8 py-10">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black">Cuéntanos el problema</h2>
              <p className="text-slate-500">Analizaremos el contexto bajo el método Ishikawa.</p>
            </div>
            <div className="bg-white p-10 rounded-[3rem] shadow-xl space-y-6">
              <input placeholder="Ubicación / Contexto" className="w-full p-5 bg-slate-50 rounded-2xl outline-none" onChange={e => setContexto(e.target.value)} />
              <textarea placeholder="¿Qué está fallando?" className="w-full p-5 bg-slate-50 rounded-2xl outline-none h-40" onChange={e => setSintomas(e.target.value)} />
              <button onClick={iniciarAuditoria} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-xl hover:bg-blue-700 transition-all">
                INICIAR ANÁLISIS 6M
              </button>
            </div>
          </div>
        )}

        {/* VISTA: CUESTIONARIO 6M */}
        {view === 'audit' && (
          <div className="space-y-12">
            <h2 className="text-3xl font-black text-center">Protocolo Sensorial 6M</h2>
            {categorias.map((cat, idx) => (
              <div key={idx} className="space-y-6">
                <h4 className="text-blue-600 font-black uppercase tracking-widest text-sm">{cat.nombre}</h4>
                <div className="grid gap-6">
                  {cat.preguntas.map((p, pidx) => (
                    <div key={pidx} className="bg-white p-8 rounded-3xl border border-slate-100">
                      <p className="font-bold mb-4">{p.texto}</p>
                      <input 
                        className="w-full p-4 bg-slate-50 rounded-xl outline-none border focus:border-blue-500" 
                        placeholder="Escribe tu observación..."
                        onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pidx}`]: e.target.value})}
                      />
                      <p className="text-[10px] text-slate-400 mt-2 italic font-medium">{p.aviso}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={finalizarAuditoria} className="w-full bg-green-600 text-white p-6 rounded-3xl font-black text-xl shadow-2xl">
              GENERAR REPORTE FINAL
            </button>
          </div>
        )}

        {/* VISTA: REPORTE FINAL */}
        {view === 'report' && reporteFinal && (
          <div className="bg-slate-900 text-white p-16 rounded-[4rem] shadow-2xl space-y-10 border-t-[16px] border-blue-600">
             <div className="text-center space-y-4">
                <CheckCircle2 className="mx-auto text-green-400" size={60} />
                <h2 className="text-5xl font-black tracking-tighter">Informe de Ingeniería</h2>
             </div>
             <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(reporteFinal.resumen_6m).map(([m, d]) => (
                  <div key={m} className="bg-white/5 p-6 rounded-3xl border border-white/10">
                    <h5 className="text-blue-400 font-black text-xs uppercase mb-2">{m}</h5>
                    <p className="text-sm opacity-80">{d}</p>
                  </div>
                ))}
             </div>
             <div className="bg-blue-600 p-10 rounded-[3rem]">
                <h5 className="font-black text-2xl mb-4 italic">Hipótesis Causa Raíz</h5>
                <p className="text-xl font-medium">"{reporteFinal.hipotesis}"</p>
             </div>
             <button onClick={() => setView('dashboard')} className="w-full p-5 bg-white text-slate-900 rounded-3xl font-black uppercase text-xs tracking-widest">
                Volver al Panel Principal
             </button>
          </div>
        )}

        {/* VISTA: HISTORIAL */}
        {view === 'history' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-black">Historial de Casos</h2>
            <div className="grid gap-6">
              {casos.map(c => (
                <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-xl">{c.sintomas}</h4>
                      <p className="text-slate-400 text-sm">{c.contexto}</p>
                    </div>
                    <span className={`px-5 py-2 rounded-full text-xs font-black uppercase ${c.status === 'solucionado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.status === 'pendiente' ? (
                    <div className="pt-4 border-t space-y-4">
                      <p className="text-sm font-bold text-slate-600 italic">¿Se solucionó con nuestras recomendaciones?</p>
                      <div className="flex gap-4">
                        <button onClick={() => updateDoc(doc(db, "casos", c.id), {status: 'solucionado', resolucion: 'Siguió recomendaciones IA'})} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm">Sí, funcionó</button>
                        <button className="bg-slate-100 text-slate-500 px-6 py-3 rounded-xl font-bold text-sm">No, lo hice de otra forma</button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 border-t bg-slate-50 p-4 rounded-2xl">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Resolución:</p>
                      <p className="text-sm font-medium text-slate-700">{c.resolucion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// Componentes Pequeños
const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
    <div className={`p-4 rounded-2xl ${color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'green' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
  </div>
);

export default App;
