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
      const promptPreguntas = `Eres un Ingeniero Consultor Senior de INNOVATTECH. Analiza el problema y genera una entrevista técnica de 10 preguntas.
Responde ÚNICAMENTE con JSON válido. Sin texto adicional, sin markdown.

CONTEXTO: ${contexto}
SÍNTOMAS: ${sintomas}

REGLAS:
1. Solo preguntas CUALITATIVAS (ej: ¿Sientes más calor?, ¿Hay ruidos?, ¿Ves cambios?).
2. NADA de datos duros.
3. Usa las 6M: Mano de Obra, Maquinaria, Materiales, Métodos, Medición, Medio Ambiente.
4. Genera exactamente 2 preguntas por categoría.

RESPONDE CON ESTE JSON EXACTO:
{
  "categorias": [
    {
      "nombre": "Nombre de la M",
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
      const respuestasLegibles = {};
      categorias.forEach(cat => {
        cat.preguntas.forEach((p, idx) => {
          const idBase = `${cat.nombre}-${idx}`;
          const valor = respuestas[`${idBase}-val`];
          const obs = respuestas[`${idBase}-obs`];
          if (valor) {
            respuestasLegibles[`${cat.nombre} - ${p.texto}`] = {
              respuesta: valor,
              observaciones: obs || "Sin observaciones adicionales"
            };
          }
        });
      });

      const promptReporte = `Eres un Ingeniero Senior de INNOVATTECH entregando un Informe Técnico Preliminar profesional.

Hallazgos de campo recogidos: ${JSON.stringify(respuestasLegibles)}

REGLA CRÍTICA: 
1. En el objeto 'analisis_6m', redacta párrafos profesionales.
2. Usa lenguaje de ingeniería moderado (desviación detectada, hallazgo fuera de estándar). JAMÁS: catastrófico, urgente, peligro.
3. El plan_accion debe guiar a una fase de toma de datos más profunda.

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
}`;

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
    <div className="min-h-screen bg-[#001D26] flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="relative inline-block">
           <Zap size={60} className="text-[#A61D2E] mx-auto animate-pulse" />
        </div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter">INNOVATTECH <span className="text-[#A61D2E]">6M</span></h1>
        <button onClick={handleLogin} className="w-full bg-[#003B4C] p-5 rounded-2xl font-black hover:bg-[#002B38] transition-all border border-[#8E9297]/20 shadow-xl">ACCEDER AL TERMINAL</button>
      </div>
    </div>
  );

  if (!isSubscribed) return (
    <div className="min-h-screen bg-[#001D26] flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-md bg-[#003B4C]/20 border border-[#8E9297]/30 p-12 rounded-[3rem] space-y-8">
        <ShieldCheck size={70} className="mx-auto text-[#A61D2E]" />
        <h2 className="text-3xl font-black uppercase tracking-tighter">Licencia de Ingeniería Requerida</h2>
        <button onClick={() => setIsSubscribed(true)} className="w-full bg-[#A61D2E] p-5 rounded-2xl font-black shadow-lg">ACTIVAR LICENCIA PRO</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#001D26] flex text-[#8E9297]">
      <AuthCorner user={user} />
      <aside className="w-72 bg-[#00151C] border-r border-[#8E9297]/10 flex flex-col p-8 space-y-10 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <LayoutDashboard size={20} className="text-[#A61D2E]"/>
          <span className="font-black text-xl italic uppercase text-white tracking-tighter">INNOVATTECH</span>
        </div>
        <nav className="flex-grow space-y-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'audit_start', icon: PlusCircle, label: 'Nuevo Análisis' },
            { id: 'history', icon: History, label: 'Archivo Maestro' },
            { id: 'kpis', icon: BarChart3, label: 'Métricas' },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold border transition-all ${view === item.id ? 'bg-[#003B4C] border-[#8E9297]/30 text-white shadow-lg' : 'text-[#8E9297] border-transparent hover:bg-[#003B4C]/20 hover:text-white'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-[#A61D2E] font-bold hover:bg-[#A61D2E]/10 rounded-2xl transition-all"><LogOut size={20} /> Desconectar</button>
      </aside>

      <main className="flex-grow p-10 overflow-y-auto">
        {view === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-5xl font-black italic uppercase text-white tracking-tighter">Status Report</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="Auditorías Totales" value={casos.length} icon={ClipboardList} color="blue" />
              <StatCard label="Casos Resueltos" value={casos.filter(c => c.status === 'solucionado').length} icon={CheckCircle2} color="red" />
              <StatCard label="En Seguimiento" value={casos.filter(c => c.status === 'pendiente').length} icon={Clock} color="grey" />
            </div>
          </div>
        )}

        {view === 'audit_start' && (
          <div className="max-w-2xl mx-auto py-20 space-y-10 animate-in zoom-in">
            <h2 className="text-5xl font-black text-center italic uppercase text-white tracking-tighter">Diagnóstico de Ingeniería</h2>
            <div className="bg-[#003B4C]/10 p-12 rounded-[3.5rem] border border-[#8E9297]/20 shadow-2xl space-y-8">
              <input placeholder="Equipo o Área de Planta" className="w-full p-6 bg-[#001D26] rounded-3xl border border-[#8E9297]/20 text-white outline-none focus:border-[#A61D2E] transition-all" onChange={e => setContexto(e.target.value)} />
              <textarea placeholder="Hallazgos y Síntomas Críticos" className="w-full p-6 bg-[#001D26] rounded-3xl border border-[#8E9297]/20 text-white h-40 outline-none focus:border-[#A61D2E] transition-all" onChange={e => setSintomas(e.target.value)} />
              <button onClick={iniciarAuditoria} disabled={loading} className="w-full bg-[#A61D2E] p-6 rounded-3xl font-black text-xl text-white hover:bg-[#8D1826] transition-all shadow-xl">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERAR PROTOCOLO 6M"}
              </button>
            </div>
          </div>
        )}

        {view === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-16 pb-20 animate-in fade-in">
            <h2 className="text-4xl font-black text-center italic uppercase text-white">Inspección Estructurada</h2>
            {categorias?.map((cat, idx) => (
              <div key={idx} className="space-y-10">
                <h4 className="text-white font-black uppercase bg-[#003B4C] px-6 py-3 rounded-full inline-block border border-[#8E9297]/20">{cat.nombre}</h4>
                <div className="grid gap-10">
                  {cat?.preguntas?.map((p, pidx) => {
                    const idBase = `${cat.nombre}-${pidx}`;
                    return (
                      <div key={pidx} className="bg-[#003B4C]/5 rounded-[3rem] border border-[#8E9297]/10 p-12 space-y-10 shadow-2xl relative">
                        <p className="text-2xl font-black text-white">{p.texto}</p>
                        <div className="grid grid-cols-2 gap-5">
                          {['SÍ', 'NO'].map(opt => (
                            <button key={opt} onClick={() => setRespuestas({...respuestas, [`${idBase}-val`]: opt})} className={`p-5 rounded-2xl font-black border-2 transition-all ${respuestas[`${idBase}-val`] === opt ? 'bg-[#A61D2E] border-[#A61D2E] text-white shadow-lg' : 'bg-[#001D26] text-[#8E9297] border-[#8E9297]/20 hover:border-[#A61D2E]'}`}>{opt}</button>
                          ))}
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-[#8E9297] ml-4 tracking-widest">Observación Técnica de Campo:</label>
                           <textarea className="w-full p-6 bg-[#001D26] rounded-[2rem] border border-[#8E9297]/20 text-white h-32 outline-none focus:border-[#A61D2E] transition-all" placeholder="Escribe detalles específicos..." onChange={(e) => setRespuestas({...respuestas, [`${idBase}-obs`]: e.target.value})} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={finalizarAuditoria} disabled={loading} className="w-full bg-[#A61D2E] p-8 rounded-[3rem] font-black text-2xl text-white hover:bg-[#8D1826] transition-all shadow-xl">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERAR INFORME TÉCNICO"}
            </button>
          </div>
        )}

        {view === 'report' && reporteFinal && (
          <div className="max-w-5xl mx-auto mb-20 shadow-2xl rounded-[3rem] overflow-hidden border border-[#8E9297]/20 animate-in zoom-in">
            <div className="bg-[#003B4C] p-12 flex justify-between border-b border-[#8E9297]/20">
              <div>
                <h2 className="text-4xl font-black uppercase italic text-white tracking-tighter">{reporteFinal.titulo}</h2>
                <p className="text-[#8E9297] font-black text-[10px] uppercase tracking-[0.4em] mt-1">Análisis de Ingeniería Metalmecánica</p>
              </div>
              <div className={`px-6 py-2 rounded-full font-black text-[10px] uppercase h-fit shadow-lg ${reporteFinal.nivel_criticidad === 'Alto' ? 'bg-[#A61D2E] text-white' : 'bg-[#001D26] text-[#8E9297]'}`}>
                Prioridad: {reporteFinal.nivel_criticidad}
              </div>
            </div>
            <div className="bg-[#001D26] p-16 space-y-12">
              <section className="space-y-4">
                <h3 className="text-[#A61D2E] font-black text-xs uppercase tracking-widest">I. Análisis de Situación</h3>
                <p className="text-[#8E9297] text-sm italic border-l-2 border-[#A61D2E] pl-8 leading-relaxed">{reporteFinal.resumen_ejecutivo}</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-[#A61D2E] font-black text-xs uppercase tracking-widest">II. Evaluación de Factores 6M</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.entries(reporteFinal.analisis_6m || {}).map(([m, d]) => (
                    <div key={m} className="p-8 bg-[#003B4C]/10 rounded-[2.5rem] border border-[#8E9297]/10">
                      <h4 className="text-white font-black text-[10px] uppercase mb-3 tracking-widest">{m}</h4>
                      <p className="text-[11px] text-[#8E9297] font-medium leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="bg-[#003B4C]/20 p-12 rounded-[3.5rem] border border-[#A61D2E]/30 shadow-2xl">
                <h3 className="text-[#A61D2E] font-black text-xs uppercase mb-4 opacity-80 tracking-widest">III. Hipótesis de Ingeniería Sugerida</h3>
                <p className="text-3xl font-black text-white italic leading-tight">"{reporteFinal.hipotesis_raiz}"</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-emerald-500 font-black text-xs uppercase tracking-widest">IV. Hoja de Ruta / Próximos Pasos</h3>
                <div className="grid gap-4">
                  {reporteFinal.plan_accion?.map((accion, i) => (
                    <div key={i} className="flex items-center gap-5 bg-[#003B4C]/5 p-6 rounded-3xl border border-[#8E9297]/10">
                      <CheckCircle2 className="text-emerald-500 shrink-0" size={24}/>
                      <p className="text-sm text-[#8E9297] font-bold italic">{accion}</p>
                    </div>
                  ))}
                </div>
              </section>
              <footer className="pt-10 border-t border-[#8E9297]/10">
                <p className="text-[10px] text-[#8E9297]/60 font-bold italic leading-relaxed tracking-wider text-center uppercase">Innovattech SpA - Ingeniería, Innovación y Análisis de Causa Raíz</p>
              </footer>
            </div>
            <div className="bg-[#001D26] p-10 flex justify-between border-t border-[#8E9297]/10">
              <button onClick={() => setView('dashboard')} className="text-[#8E9297] font-black text-[10px] uppercase flex items-center gap-2 hover:text-white transition-all tracking-widest"><ArrowLeft size={16}/> Dashboard</button>
              <button onClick={() => window.print()} className="bg-white text-[#001D26] px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#A61D2E] hover:text-white transition-all shadow-xl">Imprimir Reporte</button>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-5xl font-black italic uppercase text-white tracking-tighter">Archivo de Ingeniería</h2>
            <div className="grid gap-8">
              {casos.map(c => (
                <div key={c.id} className="bg-[#003B4C]/10 p-12 rounded-[3.5rem] border border-[#8E9297]/10 flex justify-between items-center shadow-xl hover:border-[#A61D2E]/30 transition-all group">
                  <div>
                    <h4 className="text-3xl font-black text-white italic group-hover:text-[#A61D2E] transition-colors tracking-tighter">{c.contexto}</h4>
                    <p className="text-[#8E9297] font-bold text-[10px] uppercase tracking-widest mt-1">{new Date(c.fecha).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${c.status === 'solucionado' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-400/20' : 'text-[#A61D2E] bg-[#A61D2E]/10 border border-[#A61D2E]/20'}`}>{c.status}</span>
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
  <div className="bg-[#003B4C]/10 p-12 rounded-[3.5rem] border border-[#8E9297]/10 flex items-center gap-8 relative overflow-hidden group hover:border-[#A61D2E]/30 transition-all shadow-2xl">
    <div className={`p-6 rounded-3xl ${color === 'blue' ? 'bg-[#003B4C] text-white' : color === 'red' ? 'bg-[#A61D2E]/20 text-[#A61D2E]' : 'bg-[#8E9297]/10 text-[#8E9297]'}`}>
      <Icon size={32} />
    </div>
    <div>
      <p className="text-[#8E9297] font-black text-[10px] uppercase mb-1 tracking-[0.2em]">{label}</p>
      <p className="text-5xl font-black text-white tracking-tighter">{value}</p>
    </div>
  </div>
);

export default App;
