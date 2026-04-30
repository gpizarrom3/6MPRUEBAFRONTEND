import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, History, BarChart3, 
  LogOut, CheckCircle2, Clock, AlertCircle, PlusCircle, Zap, ShieldCheck
} from 'lucide-react';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import AuthCorner from './AuthCorner';

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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [resolucionManual, setResolucionManual] = useState('');

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
    if (!contexto || !sintomas) return alert("Completa el contexto.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tipo: "PREGUNTAS", datos: { contexto, sintomas } })
      });
      const data = await res.json();
      if(data.categorias) { setCategorias(data.categorias); setView('audit'); }
    } catch (e) { alert("Error IA"); }
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
        userId: user.uid, userName: user.displayName, contexto, sintomas, reporte: data, status: 'pendiente', fecha: new Date().toISOString()
      });
      setView('report');
    } catch (e) { alert("Error Reporte"); }
    setLoading(false);
  };

  const resolverCaso = async (id, modo) => {
    const res = modo === 'ia' ? 'Siguió recomendaciones IA' : resolucionManual;
    await updateDoc(doc(db, "casos", id), { status: 'solucionado', resolucion: res });
    setResolucionManual('');
  };

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-md space-y-8 animate-in fade-in duration-700">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-2xl"><Zap size={40} /></div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">DIMECA 6M AI</h1>
        <button onClick={handleLogin} className="w-full bg-white text-slate-900 p-4 rounded-2xl font-black hover:scale-105 transition-all">Ingresar con Google</button>
      </div>
    </div>
  );

  if (!isSubscribed) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 border border-slate-100">
        <ShieldCheck size={60} className="mx-auto text-blue-600" />
        <h2 className="text-3xl font-black italic uppercase">Pro Plan</h2>
        <p className="text-slate-500 font-medium">Activa tu suscripción industrial para continuar.</p>
        <button onClick={() => setIsSubscribed(true)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-200">SUSCRIBIRSE</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <AuthCorner user={user} />
      
      <aside className="w-72 bg-white border-r flex flex-col p-8 space-y-8 hidden md:flex">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><LayoutDashboard size={20}/></div>
          <span className="font-black text-xl tracking-tight italic uppercase text-slate-800">DIMECA 6M</span>
        </div>
        <nav className="flex-grow space-y-2">
          {[{ id: 'dashboard', icon: LayoutDashboard, label: 'Resumen' }, { id: 'audit_start', icon: PlusCircle, label: 'Nueva Auditoría' }, { id: 'history', icon: History, label: 'Historial' }, { id: 'kpis', icon: BarChart3, label: 'Métricas KPI' }].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors"><LogOut size={20} /> Salir</button>
      </aside>

      <main className="flex-grow p-10 overflow-y-auto">
        
        {view === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <h2 className="text-4xl font-black tracking-tight text-slate-900 italic">Hola, {user.displayName.split(' ')[0]}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="Total Casos" value={casos.length} icon={ClipboardList} color="blue" />
              <StatCard label="Solucionados" value={casos.filter(c => c.status === 'solucionado').length} icon={CheckCircle2} color="green" />
              <StatCard label="Pendientes" value={casos.filter(c => c.status === 'pendiente').length} icon={Clock} color="orange" />
            </div>
          </div>
        )}

        {view === 'audit_start' && (
          <div className="max-w-2xl mx-auto py-20 space-y-10 animate-in zoom-in duration-500 text-center">
            <h2 className="text-5xl font-black tracking-tighter text-slate-900 uppercase italic">Registro 6M</h2>
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 space-y-6">
              <input placeholder="Ubicación técnica..." className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-semibold" onChange={e => setContexto(e.target.value)} />
              <textarea placeholder="Síntomas sensoriales..." className="w-full p-6 bg-slate-50 rounded-3xl outline-none h-40 font-semibold" onChange={e => setSintomas(e.target.value)} />
              <button onClick={iniciarAuditoria} disabled={loading} className="w-full bg-slate-900 text-white p-6 rounded-3xl font-black text-xl hover:bg-blue-600 transition-all shadow-xl disabled:bg-slate-300">
                {loading ? "CONECTANDO IA..." : "INICIAR MÉTODO ISHIKAWA"}
              </button>
            </div>
          </div>
        )}

        {view === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <h2 className="text-4xl font-black text-center italic uppercase text-slate-900">Protocolo de Inspección</h2>
            {categorias?.map((cat, idx) => (
              <div key={idx} className="space-y-8">
                <h4 className="text-blue-600 font-black uppercase text-xs bg-blue-50 px-5 py-2 rounded-full inline-block">{cat.nombre}</h4>
                <div className="grid gap-8">
                  {cat?.preguntas?.map((p, pidx) => (
                    <div key={pidx} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden p-10 space-y-8 hover:shadow-2xl transition-all">
                      <p className="text-2xl font-black text-slate-800 leading-tight flex gap-4"><ClipboardList className="text-blue-600 shrink-0"/> {p.texto}</p>
                      <div className="grid grid-cols-3 gap-4">
                        {['SÍ', 'NO', 'SIN REGISTRO'].map(opt => (
                          <button key={opt} onClick={() => setRespuestas({...respuestas, [`${cat.nombre}-${pidx}-val`]: opt})} className={`p-4 rounded-2xl font-black text-xs tracking-widest border-2 transition-all ${respuestas[`${cat.nombre}-${pidx}-val`] === opt ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>{opt}</button>
                        ))}
                      </div>
                      <textarea placeholder="Observaciones técnicas..." className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-medium text-sm h-28" onChange={(e) => setRespuestas({...respuestas, [`${cat.nombre}-${pidx}-obs`]: e.target.value})} />
                      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-3xl">
                        <p className="text-[10px] font-black uppercase text-red-600 flex items-center gap-2 mb-2"><AlertCircle size={14}/> Riesgo Detectado:</p>
                        <p className="text-xs text-red-800 font-bold italic leading-relaxed">{p.riesgo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={finalizarAuditoria} className="w-full bg-green-600 text-white p-8 rounded-[3rem] font-black text-2xl shadow-2xl hover:scale-105 transition-all">FINALIZAR E IR AL INFORME</button>
          </div>
        )}

        {view === 'report' && reporteFinal && (
          <div className="max-w-5xl mx-auto mb-20 animate-in zoom-in duration-700 shadow-2xl">
            <div className="bg-[#0F172A] p-12 rounded-t-[3rem] text-white flex justify-between items-end">
              <div><h2 className="text-4xl font-black uppercase tracking-tighter italic">Informe Técnico de Ingeniería</h2><p className="text-blue-400 font-black text-xs uppercase tracking-widest mt-1">Análisis de Causa Raíz (ACR)</p></div>
              <div className="text-right text-[10px] opacity-60 font-bold"><p>ID: {reporteFinal.id_informe}</p><p>FECHA: {new Date().toLocaleDateString()}</p></div>
            </div>
            <div className="bg-white p-16 space-y-12 border-x border-slate-100">
              <section className="space-y-4">
                <h3 className="text-blue-700 font-black text-sm uppercase flex gap-2"><ClipboardList size={18}/> I. Resumen Ejecutivo</h3>
                <p className="text-slate-600 text-sm leading-relaxed italic border-l-4 border-slate-100 pl-4">{reporteFinal.resumen_ejecutivo}</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-blue-700 font-black text-sm uppercase flex gap-2"><LayoutDashboard size={18}/> II. Análisis Ishikawa (6M)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(reporteFinal.analisis_6m).map(([m, d]) => (
                    <div key={m} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-blue-50 transition-colors">
                      <h4 className="text-blue-600 font-black text-[10px] uppercase mb-2">● {m}</h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="bg-blue-50 p-10 rounded-[3rem] border border-blue-100 space-y-4 shadow-inner">
                <h3 className="text-blue-800 font-black text-sm uppercase flex gap-2"><AlertCircle size={18}/> III. Hipótesis de Causa Raíz</h3>
                <p className="text-2xl font-black text-blue-900 leading-tight">"{reporteFinal.hipotesis_raiz}"</p>
              </section>
              <div className="grid grid-cols-2 gap-12 pt-6">
                <section className="space-y-4 font-medium"><h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">IV. Conclusiones</h3><ul className="space-y-2">{reporteFinal.conclusiones?.map((c, i) => (<li key={i} className="text-[11px] text-slate-500 flex gap-2"><span className="text-blue-500">●</span> {c}</li>))}</ul></section>
                <section className="space-y-4 font-bold"><h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">V. Plan de Acción</h3><ul className="space-y-2">{reporteFinal.plan_accion?.map((p, i) => (<li key={i} className="text-[11px] text-slate-700 flex gap-2"><CheckCircle2 size={14} className="text-green-500 shrink-0"/> {p}</li>))}</ul></section>
              </div>
            </div>
            <div className="bg-slate-50 p-10 rounded-b-[3rem] flex justify-between items-center border-t border-slate-100">
              <button onClick={() => setView('dashboard')} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors">← Volver al Panel</button>
              <button onClick={() => window.print()} className="bg-[#0F172A] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl">Exportar Informe</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-xl transition-all">
    <div className={`p-5 rounded-2xl ${color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'green' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}><Icon size={28} /></div>
    <div><p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{label}</p><p className="text-4xl font-black text-slate-800">{value}</p></div>
  </div>
);

export default App;
