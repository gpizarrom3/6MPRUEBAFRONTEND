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
    "Mano de Obra": Users, "Maquinaria": Settings, "Materiales": Pickaxe,
    "Métodos": ClipboardList, "Medición": Ruler, "Medio Ambiente": Wind
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
      const promptPreguntas = `Eres un Mecánico Industrial Senior. 
Responde ÚNICAMENTE con JSON válido. Sin texto adicional, sin markdown.

CONTEXTO: ${contexto}
SÍNTOMAS: ${sintomas}

Genera exactamente 2 preguntas observacionales por cada una de estas 6 categorías: Mano de Obra, Maquinaria, Materiales, Métodos, Medición, Medio Ambiente.

Las preguntas deben: describir lo que el operario ve/escucha/siente, evitar instrumentos de medición, buscar indicios físicos concretos.

RESPONDE CON ESTE JSON EXACTO:
{
  "categorias": [
    {
      "nombre": "Mano de Obra",
      "preguntas": [{"texto": "pregunta 1"}, {"texto": "pregunta 2"}]
    }
  ]
}`;

      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tipo: "PREGUNTAS", datos: { instruccion: promptPreguntas } })
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
      // Preparamos los strings de preguntas y respuestas para el prompt
      let listadoPreguntas = "";
      let listadoRespuestas = "";

      categorias.forEach(cat => {
        cat.preguntas.forEach((p, idx) => {
          const idBase = `${cat.nombre}-${idx}`;
          const r = respuestas[`${idBase}-val`] || "No respondido";
          const o = respuestas[`${idBase}-obs`] || "";
          listadoPreguntas += `- ${cat.nombre}: ${p.texto}\n`;
          listadoRespuestas += `- Pregunta: ${p.texto} | Respuesta: ${r} | Obs: ${o}\n`;
        });
      });

      const promptReporte = `PREGUNTAS REALIZADAS: 
${listadoPreguntas}

RESPUESTAS DEL OPERARIO:
${listadoRespuestas}

Analiza hallazgo por hallazgo.
Usa lenguaje de ingeniería moderado: "desviación detectada", "condición a monitorear". JAMÁS: catastrófico, urgente, grave, peligro.

RESPONDE SÓLO con este JSON:
{
  "titulo": "Diagnóstico Prelim. de ${contexto}",
  "resumen_ejecutivo": "...",
  "analisis_6m": {
    "Mano de Obra": "análisis...",
    "Maquinaria": "análisis...",
    "Materiales": "análisis...",
    "Métodos": "análisis...",
    "Medición": "análisis...",
    "Medio Ambiente": "análisis..."
  },
  "hipotesis_raiz": "...",
  "plan_accion": ["Paso 1...", "Paso 2..."],
  "nivel_criticidad": "Bajo|Medio|Alto"
}

nivel_criticidad = Alto si >3 M presentan hallazgos fuera de rango.`;

      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tipo: "REPORTE", datos: { instruccion: promptReporte } })
      });
      
      const data = await res.json();
      setReporteFinal(data);
      
      await addDoc(collection(db, "casos"), {
        userId: user.uid,
        userName: user.displayName,
        contexto, sintomas, reporte: data,
        status: 'pendiente', fecha: new Date().toISOString(), resolucion: ''
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

  if (!user) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-md w-full space-y-8">
        <Zap size={60} className="text-indigo-400 mx-auto" />
        <h1 className="text-5xl font-black italic uppercase">6M Expert System</h1>
        <button onClick={handleLogin} className="w-full bg-indigo-600 p-5 rounded-2xl font-black hover:bg-indigo-500 transition-all">ACCEDER AL TERMINAL</button>
      </div>
    </div>
  );

  if (!isSubscribed) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-md bg-slate-900 border border-slate-800 p-12 rounded-[3rem] space-y-8">
        <ShieldCheck size={70} className="mx-auto text-emerald-400" />
        <h2 className="text-3xl font-black uppercase">Licencia Requerida</h2>
        <button onClick={() => setIsSubscribed(true)} className="w-full bg-emerald-600 p-5 rounded-2xl font-black">ACTIVAR LICENCIA PRO</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] flex text-slate-200">
      <AuthCorner user={user} />
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
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold border transition-all ${view === item.id ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400' : 'text-slate-500 border-transparent hover:bg-slate-900'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-rose-500 font-bold"><LogOut size={20} /> Desconectar</button>
      </aside>

      <main className="flex-grow p-10 overflow-y-auto">
        {view === 'dashboard' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black italic uppercase text-white">Status Report</h2>
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
              <input placeholder="Equipo o Área (Ej: Motor Principal)" className="w-full p-6 bg-slate-950 rounded-3xl border border-slate-800 text-white" onChange={e => setContexto(e.target.value)} />
              <textarea placeholder="Síntomas (Ej: Ruido metálico en la zona B)" className="w-full p-6 bg-slate-950 rounded-3xl border border-slate-800 text-white h-40" onChange={e => setSintomas(e.target.value)} />
              <button onClick={iniciarAuditoria} disabled={loading} className="w-full bg-indigo-600 p-6 rounded-3xl font-black text-xl text-white">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERAR PREGUNTAS"}
              </button>
            </div>
          </div>
        )}

        {view === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-16 pb-20">
            <h2 className="text-4xl font-black text-center italic uppercase text-white">Auditoría 6M de Campo</h2>
            {categorias?.map((cat, idx) => (
              <div key={idx} className="space-y-10">
                <h4 className="text-indigo-400 font-black uppercase bg-indigo-500/10 px-6 py-3 rounded-full inline-block border border-indigo-500/20">{cat.nombre}</h4>
                <div className="grid gap-10">
                  {cat?.preguntas?.map((p, pidx) => {
                    const idBase = `${cat.nombre}-${pidx}`;
                    return (
                      <div key={pidx} className="bg-slate-900 rounded-[3rem] border border-slate-800 p-12 space-y-10">
                        <p className="text-2xl font-black text-white">{p.texto}</p>
                        <div className="grid grid-cols-2 gap-5">
                          {['SÍ', 'NO'].map(opt => (
                            <button key={opt} onClick={() => setRespuestas({...respuestas, [`${idBase}-val`]: opt})} className={`p-5 rounded-2xl font-black border-2 transition-all ${respuestas[`${idBase}-val`] === opt ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>{opt}</button>
                          ))}
                        </div>
                        <textarea className="w-full p-6 bg-slate-950 rounded-[2rem] border border-slate-800 text-slate-300 h-32" placeholder="Observaciones físicas detectadas..." onChange={(e) => setRespuestas({...respuestas, [`${idBase}-obs`]: e.target.value})} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={finalizarAuditoria} disabled={loading} className="w-full bg-emerald-600 p-8 rounded-[3rem] font-black text-2xl text-white">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "FINALIZAR E INFORMAR"}
            </button>
          </div>
        )}

        {view === 'report' && reporteFinal && (
          <div className="max-w-5xl mx-auto mb-20 shadow-2xl rounded-[3rem] overflow-hidden border border-slate-800">
            <div className="bg-slate-900 p-12 flex justify-between border-b border-slate-800">
              <div>
                <h2 className="text-4xl font-black uppercase italic text-white">{reporteFinal.titulo}</h2>
                <p className="text-indigo-400 font-black text-[10px] uppercase">Informe Técnico de Ingeniería</p>
              </div>
              <div className={`px-6 py-2 rounded-full font-black text-[10px] uppercase h-fit ${reporteFinal.nivel_criticidad === 'Alto' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>
                Criticidad: {reporteFinal.nivel_criticidad}
              </div>
            </div>
            <div className="bg-slate-950 p-16 space-y-12">
              <section className="space-y-4">
                <h3 className="text-indigo-500 font-black text-xs uppercase tracking-widest">I. Resumen Ejecutivo</h3>
                <p className="text-slate-400 text-sm italic border-l-2 border-indigo-500/30 pl-8">{reporteFinal.resumen_ejecutivo}</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-indigo-500 font-black text-xs uppercase tracking-widest">II. Desglose 6M</h3>
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
                <h3 className="text-indigo-400 font-black text-xs uppercase mb-4 opacity-80">III. Hipótesis Raíz</h3>
                <p className="text-3xl font-black text-white italic">"{reporteFinal.hipotesis_raiz}"</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-emerald-500 font-black text-xs uppercase tracking-widest">IV. Plan de Acción Recomendado</h3>
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
            <div className="bg-slate-900 p-10 flex justify-between border-t border-slate-800">
              <button onClick={() => setView('dashboard')} className="text-slate-500 font-black text-[10px] uppercase flex items-center gap-2 hover:text-white transition-all"><ArrowLeft size={16}/> Volver al Dashboard</button>
              <button onClick={() => window.print()} className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-black text-xs hover:bg-indigo-400 hover:text-white transition-all">IMPRIMIR</button>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black italic uppercase text-white">Archivo de Casos</h2>
            <div className="grid gap-8">
              {casos.map(c => (
                <div key={c.id} className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 flex justify-between items-center">
                  <div>
                    <h4 className="text-3xl font-black text-white italic">{c.contexto}</h4>
                    <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest">{new Date(c.fecha).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase ${c.status === 'solucionado' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>{c.status}</span>
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
  <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 flex items-center gap-8 relative overflow-hidden group hover:border-indigo-500/50 transition-all">
    <div className={`p-6 rounded-3xl ${color === 'indigo' ? 'bg-indigo-500/10 text-indigo-400' : color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
      <Icon size={32} />
    </div>
    <div>
      <p className="text-slate-500 font-black text-[10px] uppercase mb-1 tracking-widest">{label}</p>
      <p className="text-5xl font-black text-white">{value}</p>
    </div>
  </div>
);

export default App;
