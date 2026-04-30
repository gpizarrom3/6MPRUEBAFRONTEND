import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, History, BarChart3, 
  LogOut, CheckCircle2, Clock, AlertCircle, PlusCircle, Zap, ShieldCheck, MessageSquare
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
    if (!contexto || !sintomas) return alert("Por favor completa los campos iniciales.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tipo: "PREGUNTAS", datos: { contexto, sintomas } })
      });
      const data = await res.json();
      if(data.categorias) { setCategorias(data.categorias); setView('audit'); }
    } catch (e) { alert("Error de conexión."); }
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
    } catch (e) { alert("Error al generar reporte."); }
    setLoading(false);
  };

  const resolverCaso = async (id, modo) => {
    const textoRes = modo === 'ia' ? 'Siguió recomendaciones de la IA' : resolucionManual;
    await updateDoc(doc(db, "casos", id), { status: 'solucionado', resolucion: textoRes });
    setResolucionManual('');
  };

  // VISTA DE ACCESO (DARK THEME)
  if (!user) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full space-y-12 text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse"></div>
          <div className="relative bg-slate-900 border border-slate-800 w-24 h-24 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl">
            <Zap size={48} className="text-indigo-400" />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-r from-white via-indigo-200 to-slate-500 bg-clip-text text-transparent uppercase">Dimeca 6M</h1>
          <p className="text-slate-400 font-medium text-sm tracking-widest uppercase">Intelligence OS v2.5</p>
        </div>
        <button onClick={handleLogin} className="group relative w-full bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-2xl font-black transition-all flex items-center justify-center gap-4 overflow-hidden shadow-2xl shadow-indigo-900/20">
          <span className="relative z-10">INGRESAR AL SISTEMA</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>
      </div>
    </div>
  );

  if (!isSubscribed) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="max-w-md bg-slate-900 border border-slate-800 p-12 rounded-[3rem] shadow-2xl text-center space-y-8">
        <ShieldCheck size={70} className="mx-auto text-emerald-400" />
        <h2 className="text-3xl font-black italic text-white uppercase">Acceso Restringido</h2>
        <p className="text-slate-400 font-medium leading-relaxed">Detectamos una cuenta activa sin suscripción vigente. Activa el Plan Pro para habilitar los diagnósticos IA.</p>
        <button onClick={() => setIsSubscribed(true)} className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all">ACTIVAR LICENCIA</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] flex text-slate-200">
      <AuthCorner user={user} />
      
      {/* SIDEBAR NEÓN */}
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col p-8 space-y-10 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-indigo-600 p-2 rounded-xl text-white"><LayoutDashboard size={20}/></div>
          <span className="font-black text-xl tracking-tight italic uppercase text-white">DIMECA 6M</span>
        </div>
        <nav className="flex-grow space-y-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'audit_start', icon: PlusCircle, label: 'Auditoría' },
            { id: 'history', icon: History, label: 'Historial' },
            { id: 'kpis', icon: BarChart3, label: 'Métricas' },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all border ${view === item.id ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400 shadow-inner' : 'text-slate-500 border-transparent hover:bg-slate-900'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-rose-500 font-bold hover:bg-rose-500/10 rounded-2xl transition-all"><LogOut size={20} /> Desconectar</button>
      </aside>

      <main className="flex-grow p-10 overflow-y-auto">
        
        {/* DASHBOARD MODERNO */}
        {view === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <header className="space-y-2">
              <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic">Status Report</h2>
              <p className="text-slate-500 font-bold tracking-[0.2em] uppercase text-[10px]">Operador: {user.displayName}</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="Eventos Totales" value={casos.length} icon={ClipboardList} color="indigo" />
              <StatCard label="Optimizados" value={casos.filter(c => c.status === 'solucionado').length} icon={CheckCircle2} color="emerald" />
              <StatCard label="En Revisión" value={casos.filter(c => c.status === 'pendiente').length} icon={Clock} color="amber" />
            </div>
          </div>
        )}

        {/* REGISTRO INICIAL */}
        {view === 'audit_start' && (
          <div className="max-w-2xl mx-auto py-20 space-y-10 animate-in zoom-in">
            <div className="text-center space-y-2">
              <h2 className="text-5xl font-black tracking-tighter text-white uppercase">Nuevo Diagnóstico</h2>
              <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs">Algoritmo Ishikawa v2.5</p>
            </div>
            <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 shadow-2xl space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Ubicación de Planta</label>
                <input placeholder="Ej: Celda de Robotizado B-12" className="w-full p-6 bg-slate-950 rounded-3xl outline-none border border-slate-800 focus:border-indigo-500 text-white font-semibold transition-all" onChange={e => setContexto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Sintomatología Detectada</label>
                <textarea placeholder="¿Qué anomalías visuales o acústicas reporta el equipo?" className="w-full p-6 bg-slate-950 rounded-3xl outline-none h-40 border border-slate-800 focus:border-indigo-500 text-white font-semibold transition-all" onChange={e => setSintomas(e.target.value)} />
              </div>
              <button onClick={iniciarAuditoria} disabled={loading} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black text-xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20 uppercase italic">
                {loading ? "Calculando..." : "Desplegar 6M"}
              </button>
            </div>
          </div>
        )}

        {/* AUDITORÍA CON RESPUESTA MANUAL Y RIESGO CONDICIONAL */}
        {view === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-16 pb-20 animate-in fade-in">
            <div className="text-center">
              <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">Protocolo Sensorial</h2>
            </div>
            {categorias?.map((cat, idx) => (
              <div key={idx} className="space-y-10">
                <h4 className="text-indigo-400 font-black uppercase text-xs tracking-[0.4em] bg-indigo-500/10 px-6 py-3 rounded-full inline-block border border-indigo-500/20">{cat.nombre}</h4>
                <div className="grid gap-10">
                  {cat?.preguntas?.map((p, pidx) => {
                    const idBase = `${cat.nombre}-${pidx}`;
                    const respondida = respuestas[`${idBase}-val`];

                    return (
                      <div key={pidx} className="bg-slate-900 rounded-[3rem] border border-slate-800 p-12 space-y-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
                        <p className="text-2xl font-black text-white leading-tight flex gap-5 items-start"><MessageSquare className="text-indigo-500 shrink-0 mt-1" size={28}/> {p.texto}</p>
                        
                        <div className="grid grid-cols-3 gap-5">
                          {['SÍ', 'NO', 'SIN REGISTRO'].map(opt => (
                            <button key={opt} onClick={() => setRespuestas({...respuestas, [`${idBase}-val`]: opt})} className={`p-5 rounded-2xl font-black text-[11px] tracking-[0.2em] border-2 transition-all ${respuestas[`${idBase}-val`] === opt ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'}`}>{opt}</button>
                          ))}
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Nota Manual del Operador:</label>
                          <textarea 
                            className="w-full p-6 bg-slate-950 rounded-[2rem] outline-none border border-slate-800 focus:border-indigo-500 text-slate-300 font-medium text-sm h-32 transition-all" 
                            placeholder="Anota detalles técnicos observados a mano..."
                            onChange={(e) => setRespuestas({...respuestas, [`${idBase}-obs`]: e.target.value})}
                          />
                        </div>

                        {/* RIESGO CONDICIONAL: Solo aparece si se respondió la pregunta */}
                        {respondida && (
                          <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-[2rem] animate-in slide-in-from-bottom-4 duration-500">
                            <p className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-2 mb-3 tracking-widest"><AlertCircle size={16}/> Riesgo Técnico Identificado:</p>
                            <p className="text-sm text-rose-200 font-bold italic leading-relaxed">{p.riesgo}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={finalizarAuditoria} className="w-full bg-emerald-600 text-white p-8 rounded-[3rem] font-black text-2xl shadow-2xl hover:bg-emerald-500 transition-all uppercase italic">Finalizar e Informar</button>
          </div>
        )}

        {/* REPORTE ACR (MIDNIGHT STYLE) */}
        {view === 'report' && reporteFinal && (
          <div className="max-w-5xl mx-auto mb-20 animate-in zoom-in shadow-2xl rounded-[3rem] overflow-hidden border border-slate-800">
            <div className="bg-slate-900 p-12 text-white flex justify-between items-end border-b border-slate-800">
              <div className="space-y-1">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic">Technical Report</h2>
                <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.4em]">ACR - Intelligence Output</p>
              </div>
              <div className="text-right text-[10px] opacity-40 font-bold uppercase tracking-widest"><p>ID: {reporteFinal.id_informe}</p></div>
            </div>
            <div className="bg-slate-950 p-16 space-y-12">
              <section className="space-y-4">
                <h3 className="text-indigo-500 font-black text-xs uppercase flex gap-2 tracking-widest">I. Executive Summary</h3>
                <p className="text-slate-400 text-sm leading-relaxed italic border-l-2 border-indigo-500/30 pl-8">{reporteFinal.resumen_ejecutivo}</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-indigo-500 font-black text-xs uppercase flex gap-2 tracking-widest">II. Ishikawa Factors</h3>
                <div className="grid grid-cols-2 gap-5">
                  {Object.entries(reporteFinal.analisis_6m || {}).map(([m, d]) => (
                    <div key={m} className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 hover:border-indigo-500/30 transition-colors">
                      <h4 className="text-indigo-400 font-black text-[10px] uppercase mb-3 tracking-widest">{m}</h4>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="bg-indigo-600 p-12 rounded-[3.5rem] shadow-2xl shadow-indigo-900/20">
                <h3 className="text-white font-black text-xs uppercase flex gap-2 tracking-widest mb-4 opacity-80">III. Root Cause Hypothesis</h3>
                <p className="text-3xl font-black text-white leading-tight italic">"{reporteFinal.hipotesis_raiz}"</p>
              </section>
            </div>
            <div className="bg-slate-900 p-10 flex justify-between items-center border-t border-slate-800">
              <button onClick={() => setView('dashboard')} className="text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors">Cerrar Sesión Diagnóstica</button>
              <button onClick={() => window.print()} className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-400 hover:text-white transition-all shadow-xl">Imprimir PDF</button>
            </div>
          </div>
        )}

        {/* HISTORIAL MODERNO */}
        {view === 'history' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <h2 className="text-5xl font-black tracking-tighter text-white italic uppercase">Master Archive</h2>
            <div className="grid gap-8">
              {casos.length === 0 ? (
                <div className="bg-slate-900 p-20 rounded-[3rem] text-center italic text-slate-600 border border-slate-800">Archivo vacío. Inicia una auditoría para poblar la base de datos.</div>
              ) : (
                casos.map(c => (
                  <div key={c.id} className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 shadow-xl space-y-8">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="text-3xl font-black text-white tracking-tight italic">{c.sintomas}</h4>
                        <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em]">{c.contexto} — {new Date(c.fecha).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${c.status === 'solucionado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>{c.status}</span>
                    </div>
                    {c.status === 'pendiente' ? (
                      <div className="pt-10 border-t border-slate-800 space-y-6">
                        <textarea className="w-full p-6 bg-slate-950 rounded-3xl outline-none border border-slate-800 focus:border-emerald-500 font-medium h-32 text-slate-300 shadow-inner" placeholder="Escribe la resolución final aplicada al activo..." value={resolucionManual} onChange={(e) => setResolucionManual(e.target.value)} />
                        <div className="flex gap-4">
                          <button onClick={() => resolverCaso(c.id, 'ia')} className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all">Validar IA</button>
                          <button onClick={() => resolverCaso(c.id, 'manual')} className="bg-slate-800 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Manual Fix</button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-10 border-t border-slate-800 p-10 bg-emerald-500/5 rounded-[3rem] border border-emerald-500/10">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Registro de Solución Final:</p>
                        <p className="text-xl font-bold text-slate-200 italic leading-relaxed">"{c.resolucion}"</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MÉTRICAS NEÓN */}
        {view === 'kpis' && (
          <div className="space-y-16 animate-in slide-in-from-bottom-10 duration-700">
            <header className="space-y-2">
              <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic">Operations Analytics</h2>
              <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs">Métricas de Rendimiento SpA</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-slate-900 p-16 rounded-[4rem] border border-slate-800 text-center space-y-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Efficiency Rate</p>
                <p className="text-[12rem] font-black text-indigo-500 leading-none tracking-tighter">
                  {casos.length > 0 ? ((casos.filter(c => c.status === 'solucionado').length / casos.length) * 100).toFixed(0) : 0}<span className="text-4xl ml-2">%</span>
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Resolución Global de Activos</p>
              </div>
              <div className="bg-slate-900 p-16 rounded-[4rem] border border-slate-800 text-center space-y-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Audited Events</p>
                <p className="text-[12rem] font-black text-emerald-500 leading-none tracking-tighter">
                  {casos.length}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dataset de Diagnóstico Procesado</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 flex items-center gap-8 group hover:border-indigo-500/50 transition-all shadow-2xl relative overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full"></div>
    <div className={`p-6 rounded-3xl ${color === 'indigo' ? 'bg-indigo-500/10 text-indigo-400' : color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
      <Icon size={32} />
    </div>
    <div>
      <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-1">{label}</p>
      <p className="text-5xl font-black text-white tracking-tighter">{value}</p>
    </div>
  </div>
);

export default App;
