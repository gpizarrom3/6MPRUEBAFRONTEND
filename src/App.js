import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, History, BarChart3, 
  LogOut, CheckCircle2, Clock, AlertCircle, PlusCircle, Zap, ShieldCheck, MessageSquare,
  Users, Settings, Pickaxe, Ruler, Wind, Sparkles, Loader2, Printer, ArrowLeft
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

  const mIcons = {
    "Mano de Obra": Users,
    "Maquinaria": Settings,
    "Materiales": Pickaxe,
    "Métodos": ClipboardList,
    "Medición": Ruler,
    "Medio Ambiente": Wind
  };

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
        body: JSON.stringify({ 
          tipo: "PREGUNTAS", 
          datos: { 
            contexto, 
            sintomas,
            instruccion: `Actúa como un Mecánico Industrial Senior. Genera 2 preguntas técnicas por cada una de las 6M.`
          } 
        })
      });
      const data = await res.json();
      if(data.categorias) { 
        setCategorias(data.categorias); 
        setView('audit'); 
      }
    } catch (e) { alert("Error de conexión con el motor de IA."); }
    setLoading(false);
  };

  const finalizarAuditoria = async () => {
    setLoading(true);
    try {
      // --- PASO CLAVE: LIMPIEZA DE DATOS PARA LA IA ---
      const respuestasLegibles = {};
      categorias.forEach(cat => {
        cat.preguntas.forEach((p, idx) => {
          const idBase = `${cat.nombre}-${idx}`;
          const valor = respuestas[`${idBase}-val`];
          const obs = respuestas[`${idBase}-obs`];
          
          if (valor) {
            // En lugar de enviar "Maquinaria-0-val", enviamos la pregunta real como clave
            respuestasLegibles[`${cat.nombre} - ${p.texto}`] = {
              respuesta: valor,
              observaciones: obs || "Sin observaciones adicionales"
            };
          }
        });
      });

      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          tipo: "REPORTE", 
          datos: { 
            respuestas: respuestasLegibles, // Enviamos el objeto mapeado
            contexto,
            sintomas,
            instruccion: `Eres un Mecánico Senior entregando un Informe Técnico Preliminar.
            
            REGLA CRÍTICA: 
            En el objeto 'analisis_6m', redacta párrafos profesionales. 
            JAMÁS menciones códigos internos como 'Maquinaria-0-val' o 'Pregunta:'. 
            Habla directamente de los hallazgos técnicos (ej: 'Se observa una desviación en el sistema de lubricación' en lugar de 'En la pregunta 1 dijo que sí').
            
            ESTRUCTURA JSON:
            {
              "titulo": "Título profesional",
              "resumen_ejecutivo": "...",
              "analisis_6m": { "Mano de Obra": "...", "Maquinaria": "...", "Materiales": "...", "Métodos": "...", "Medición": "...", "Medio Ambiente": "..." },
              "hipotesis_raiz": "...",
              "plan_accion": ["...", "..."],
              "nivel_criticidad": "Bajo|Medio|Alto"
            }`
          } 
        })
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
    } catch (e) { alert("Error al generar el informe técnico."); }
    setLoading(false);
  };

  const resolverCaso = async (id, modo) => {
    const textoRes = modo === 'ia' ? 'Siguió recomendaciones del informe preliminar' : resolucionManual;
    await updateDoc(doc(db, "casos", id), { status: 'solucionado', resolucion: textoRes });
    setResolucionManual('');
  };

  // Vistas de error y suscripción (Omitidas por brevedad en este bloque pero mantenidas en tu lógica)
  if (!user) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full space-y-12 text-center">
        <Zap size={48} className="text-indigo-400 mx-auto" />
        <h1 className="text-5xl font-black italic uppercase">Análisis Causa Raíz</h1>
        <button onClick={handleLogin} className="w-full bg-indigo-600 p-5 rounded-2xl font-black">ACCEDER AL TERMINAL</button>
      </div>
    </div>
  );

  if (!isSubscribed) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
      <div className="max-w-md bg-slate-900 border border-slate-800 p-12 rounded-[3rem] text-center space-y-8">
        <ShieldCheck size={70} className="mx-auto text-emerald-400" />
        <h2 className="text-3xl font-black uppercase">Licencia Requerida</h2>
        <button onClick={() => setIsSubscribed(true)} className="w-full bg-emerald-600 p-5 rounded-2xl font-black">ACTIVAR LICENCIA PRO</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] flex text-slate-200">
      <AuthCorner user={user} />
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col p-8 space-y-10 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <LayoutDashboard size={20} className="text-indigo-500"/>
          <span className="font-black text-xl italic uppercase text-white">INNOVATTECH 6M</span>
        </div>
        <nav className="flex-grow space-y-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'audit_start', icon: PlusCircle, label: 'Nuevo Análisis' },
            { id: 'history', icon: History, label: 'Historial' },
            { id: 'kpis', icon: BarChart3, label: 'Métricas' },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold border ${view === item.id ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400' : 'text-slate-500 border-transparent hover:bg-slate-900'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-rose-500 font-bold"><LogOut size={20} /> Desconectar</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-grow p-10 overflow-y-auto">
        
        {view === 'dashboard' && (
          <div className="space-y-12">
            <header><h2 className="text-5xl font-black italic uppercase text-white">Status Report</h2></header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="Evaluaciones Totales" value={casos.length} icon={ClipboardList} color="indigo" />
              <StatCard label="Casos Cerrados" value={casos.filter(c => c.status === 'solucionado').length} icon={CheckCircle2} color="emerald" />
              <StatCard label="En Seguimiento" value={casos.filter(c => c.status === 'pendiente').length} icon={Clock} color="amber" />
            </div>
          </div>
        )}

        {view === 'audit_start' && (
          <div className="max-w-2xl mx-auto py-20 space-y-10">
            <h2 className="text-5xl font-black text-center italic uppercase text-white">Diagnóstico Preliminar</h2>
            <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 space-y-8">
              <input placeholder="Equipo o Área de Planta" className="w-full p-6 bg-slate-950 rounded-3xl border border-slate-800 text-white" onChange={e => setContexto(e.target.value)} />
              <textarea placeholder="Descripción de Hallazgos" className="w-full p-6 bg-slate-950 rounded-3xl border border-slate-800 text-white h-40" onChange={e => setSintomas(e.target.value)} />
              <button onClick={iniciarAuditoria} disabled={loading} className="w-full bg-indigo-600 p-6 rounded-3xl font-black text-xl text-white">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "ABRIR FICHA TÉCNICA"}
              </button>
            </div>
          </div>
        )}

        {view === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-16 pb-20">
            <h2 className="text-4xl font-black text-center italic uppercase text-white">Entrevista Estructurada 6M</h2>
            {categorias?.map((cat, idx) => (
              <div key={idx} className="space-y-10">
                <h4 className="text-indigo-400 font-black uppercase bg-indigo-500/10 px-6 py-3 rounded-full inline-block border border-indigo-500/20">{cat.nombre}</h4>
                <div className="grid gap-10">
                  {cat?.preguntas?.map((p, pidx) => {
                    const idBase = `${cat.nombre}-${pidx}`;
                    return (
                      <div key={pidx} className="bg-slate-900 rounded-[3rem] border border-slate-800 p-12 space-y-10">
                        <p className="text-2xl font-black text-white">{pidx + 1}. {p.texto}</p>
                        <div className="grid grid-cols-2 gap-5">
                          {['SÍ', 'NO'].map(opt => (
                            <button key={opt} onClick={() => setRespuestas({...respuestas, [`${idBase}-val`]: opt})} className={`p-5 rounded-2xl font-black border-2 transition-all ${respuestas[`${idBase}-val`] === opt ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>{opt}</button>
                          ))}
                        </div>
                        <textarea 
                          className="w-full p-6 bg-slate-950 rounded-[2rem] border border-slate-800 text-slate-300 h-32" 
                          placeholder="Observaciones técnicas..."
                          onChange={(e) => setRespuestas({...respuestas, [`${idBase}-obs`]: e.target.value})}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={finalizarAuditoria} disabled={loading} className="w-full bg-emerald-600 p-8 rounded-[3rem] font-black text-2xl text-white">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERAR INFORME PRELIMINAR"}
            </button>
          </div>
        )}

        {view === 'report' && reporteFinal && (
          <div className="max-w-5xl mx-auto mb-20 shadow-2xl rounded-[3rem] overflow-hidden border border-slate-800">
            <div className="bg-slate-900 p-12 flex justify-between items-end border-b border-slate-800">
              <div>
                <h2 className="text-4xl font-black uppercase italic text-white">{reporteFinal.titulo}</h2>
                <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">Análisis Preliminar de Ingeniería</p>
              </div>
              <div className="px-6 py-2 rounded-full bg-indigo-600 text-white font-black text-[10px] uppercase">Prioridad: {reporteFinal.nivel_criticidad}</div>
            </div>
            <div className="bg-slate-950 p-16 space-y-12">
              <section className="space-y-4">
                <h3 className="text-indigo-500 font-black text-xs uppercase">I. Resumen de Hallazgos</h3>
                <p className="text-slate-400 text-sm leading-relaxed italic border-l-2 border-indigo-500/30 pl-8">{reporteFinal.resumen_ejecutivo}</p>
              </section>
              
              <section className="space-y-6">
                <h3 className="text-indigo-500 font-black text-xs uppercase">II. Evaluación de Factores 6M</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.entries(reporteFinal.analisis_6m || {}).map(([m, d]) => (
                    <div key={m} className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800">
                      <h4 className="text-indigo-400 font-black text-[10px] uppercase mb-3">{m}</h4>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-slate-900 p-12 rounded-[3.5rem] border border-indigo-500/30">
                <h3 className="text-indigo-400 font-black text-xs uppercase mb-4 opacity-80">III. Hipótesis Técnica Sugerida</h3>
                <p className="text-3xl font-black text-white italic">"{reporteFinal.hipotesis_raiz}"</p>
              </section>

              <section className="space-y-6">
                <h3 className="text-emerald-500 font-black text-xs uppercase">IV. Plan de Acción</h3>
                <div className="grid gap-4">
                  {reporteFinal.plan_accion?.map((accion, i) => (
                    <div key={i} className="flex items-center gap-5 bg-slate-900 p-6 rounded-3xl border border-slate-800">
                      <CheckCircle2 className="text-emerald-500 shrink-0" size={24}/>
                      <p className="text-sm text-slate-300 font-bold">{accion}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="bg-slate-900 p-10 flex justify-between items-center">
              <button onClick={() => setView('dashboard')} className="text-slate-500 font-black text-[10px] uppercase flex items-center gap-2"><ArrowLeft size={16}/> Dashboard</button>
              <button onClick={() => window.print()} className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-black text-xs uppercase">Imprimir Reporte</button>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black italic uppercase text-white">Historial</h2>
            <div className="grid gap-8">
              {casos.map(c => (
                <div key={c.id} className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 space-y-8">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="text-3xl font-black text-white italic">{c.contexto}</h4>
                      <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest">{new Date(c.fecha).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase ${c.status === 'solucionado' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 flex items-center gap-8 shadow-2xl relative overflow-hidden">
    <div className={`p-6 rounded-3xl ${color === 'indigo' ? 'bg-indigo-500/10 text-indigo-400' : color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
      <Icon size={32} />
    </div>
    <div>
      <p className="text-slate-500 font-black text-[10px] uppercase mb-1">{label}</p>
      <p className="text-5xl font-black text-white">{value}</p>
    </div>
  </div>
);

export default App;
