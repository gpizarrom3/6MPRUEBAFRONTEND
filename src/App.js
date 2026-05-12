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
  
  // --- MEJORA: PROMPT DE INVESTIGACIÓN TÉCNICA (BASADO EN MANUAL MOBLEY) ---
  const iniciarAuditoria = async () => {
    if (!contexto || !sintomas) return alert("Por favor completa los campos iniciales.");
    setLoading(true);
    try {
      const promptPreguntas = `Actúa como un Especialista en RCFA (Análisis de Causa Raíz de Fallas) con la lógica del Maintenance Engineering Handbook.
      
      EQUIPO A ANALIZAR: ${contexto}
      SÍNTOMAS REPORTADOS: ${sintomas}

      OBJETIVO: Generar una entrevista técnica de 2 preguntas por cada una de las 6M para recolectar EVIDENCIA FÍSICA Y OPERATIVA.

      INSTRUCCIONES DE LÓGICA INDUSTRIAL:
      1. ANALIZA EL TIPO DE ACTIVO: Si el usuario describe un equipo mecánico, eléctrico o electrónico, tus preguntas deben adaptarse a la naturaleza de ese equipo (ej: huelgos en mecánica, voltajes/señales en electrónica, protocolos en métodos).
      2. PREGUNTAS DE OBSERVACIÓN: Haz preguntas sobre lo que el técnico puede ver, oír, oler o medir en ese momento[cite: 90].
      3. CRITERIO TÉCNICO: Cada pregunta debe buscar un "Modo de Falla" específico (fatiga, corrosión, estrés térmico, error de configuración, etc.).
      4. NO ASUMAS NADA: No menciones componentes que el usuario no haya sugerido, solo pregunta por la zona o función relacionada al síntoma.

      RESPONDE ÚNICAMENTE CON ESTE JSON:
      {
        "categorias": [
          {
            "nombre": "Nombre de la M",
            "preguntas": [{"texto": "pregunta técnica adaptada al equipo"}]
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

  // --- MEJORA: PROMPT DE REPORTE TÉCNICO (ESTRICTO A LOS DATOS) ---
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
              observaciones: obs || "Sin observaciones"
            };
          }
        });
      });

      const promptReporte = `Eres un Ingeniero de Confiabilidad Senior. Tu tarea es redactar un Informe de Análisis de Causa Raíz (ACR) Profesional[cite: 102].
      
      DATOS SUMINISTRADOS:
      - Contexto: ${contexto}
      - Síntomas: ${sintomas}
      - Hallazgos de Campo: ${JSON.stringify(respuestasLegibles)}

      REGLAS DE RIGOR TÉCNICO (INNOVATTECH STANDARD):
      1. FIDELIDAD ABSOLUTA: No inventes modelos, números de serie, componentes adicionales ni datos de rendimiento (como porcentajes) que no se te hayan entregado.
      2. LÓGICA MOBLEY: Usa los hallazgos para proponer una "Hipótesis de Causa Raíz" que sea coherente con la física y la ingeniería del equipo descrito.
      3. TERMINOLOGÍA ACERTADA: Usa lenguaje técnico apropiado para el área (ej: cavitación si es hidráulica, interferencia si es señal, desalineamiento si es rotación)[cite: 102, 103].
      4. DIAGNÓSTICO PRELIMINAR: El tono debe ser consultivo. No des conclusiones definitivas si la evidencia es escasa; en su lugar, sugiere las pruebas necesarias para confirmar la hipótesis[cite: 105].

      RESPONDE SÓLO CON ESTE JSON:
      {
        "titulo": "Informe Técnico ACR: ${contexto}",
        "resumen_ejecutivo": "Análisis de la condición operativa del activo basado en síntomas y hallazgos.",
        "analisis_6m": { "Mano de Obra": "...", "Maquinaria": "...", "Materiales": "...", "Métodos": "...", "Medición": "...", "Medio Ambiente": "..." },
        "hipotesis_raiz": "Conclusión lógica basada estrictamente en la evidencia física suministrada.",
        "plan_accion": ["Recomendación técnica 1", "Recomendación técnica 2", "Recomendación técnica 3"],
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

  // --- INTERFAZ CLEAN WHITE ---
  if (!user) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-slate-900 text-center">
      <div className="max-w-md w-full space-y-8">
        <Zap size={60} className="text-[#A61D2E] mx-auto" />
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-[#003B4C]">INNOVATTECH</h1>
        <p className="font-bold text-slate-400 tracking-widest uppercase text-xs">Sistema Experto de Ingeniería</p>
        <button onClick={handleLogin} className="w-full bg-[#003B4C] text-white p-5 rounded-2xl font-black hover:bg-black transition-all shadow-xl">ACCEDER AL TERMINAL</button>
      </div>
    </div>
  );

  if (!isSubscribed) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 text-center">
      <div className="max-w-md bg-white border border-slate-200 p-12 rounded-[3rem] shadow-xl space-y-8">
        <ShieldCheck size={70} className="mx-auto text-[#A61D2E]" />
        <h2 className="text-3xl font-black uppercase text-[#003B4C]">Licencia Requerida</h2>
        <button onClick={() => setIsSubscribed(true)} className="w-full bg-[#A61D2E] text-white p-5 rounded-2xl font-black shadow-lg hover:bg-black transition-all">ACTIVAR LICENCIA PRO</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex text-slate-900 font-sans">
      <AuthCorner user={user} />
      <aside className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col p-8 space-y-10 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-[#003B4C] p-2 rounded-xl text-white shadow-sm"><LayoutDashboard size={20}/></div>
          <span className="font-black text-xl italic uppercase text-[#003B4C]">INNOVATTECH</span>
        </div>
        <nav className="flex-grow space-y-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'audit_start', icon: PlusCircle, label: 'Nuevo Análisis' },
            { id: 'history', icon: History, label: 'Historial' },
            { id: 'kpis', icon: BarChart3, label: 'Métricas' },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold border transition-all ${view === item.id ? 'bg-[#003B4C] border-[#003B4C] text-white shadow-md' : 'text-slate-500 border-transparent hover:bg-slate-200'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-[#A61D2E] font-bold hover:bg-red-50 rounded-2xl transition-all"><LogOut size={20} /> Desconectar</button>
      </aside>

      <main className="flex-grow p-10 overflow-y-auto bg-white">
        {view === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-5xl font-black italic uppercase text-[#003B4C] tracking-tighter">Status Report</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="Auditorías Totales" value={casos.length} icon={ClipboardList} color="blue" />
              <StatCard label="Casos Resueltos" value={casos.filter(c => c.status === 'solucionado').length} icon={CheckCircle2} color="red" />
              <StatCard label="Pendientes" value={casos.filter(c => c.status === 'pendiente').length} icon={Clock} color="grey" />
            </div>
          </div>
        )}

        {view === 'audit_start' && (
          <div className="max-w-2xl mx-auto py-20 space-y-10 animate-in zoom-in">
            <h2 className="text-5xl font-black text-center italic uppercase text-[#003B4C]">Diagnóstico Industrial</h2>
            <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Equipo / Activo</label>
                <input placeholder="Ej: Reductor de engranajes helicoidales" className="w-full p-6 bg-white rounded-3xl border border-slate-200 outline-none focus:border-[#003B4C] transition-all" onChange={e => setContexto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Falla / Síntomas</label>
                <textarea placeholder="Describa los hallazgos observados..." className="w-full p-6 bg-white rounded-3xl border border-slate-200 h-40 outline-none focus:border-[#003B4C] transition-all" onChange={e => setSintomas(e.target.value)} />
              </div>
              <button onClick={iniciarAuditoria} disabled={loading} className="w-full bg-[#A61D2E] text-white p-6 rounded-3xl font-black text-xl hover:bg-black transition-all shadow-lg uppercase italic">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "DESPLEGAR AUDITORÍA 6M"}
              </button>
            </div>
          </div>
        )}

        {view === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-16 pb-20 animate-in fade-in">
            <h2 className="text-4xl font-black text-center italic uppercase text-[#003B4C]">Inspección de Campo</h2>
            {categorias?.map((cat, idx) => (
              <div key={idx} className="space-y-10">
                <h4 className="text-white font-black uppercase bg-[#003B4C] px-6 py-3 rounded-full inline-block shadow-sm">{cat.nombre}</h4>
                <div className="grid gap-10">
                  {cat?.preguntas?.map((p, pidx) => {
                    const idBase = `${cat.nombre}-${pidx}`;
                    return (
                      <div key={pidx} className="bg-slate-50 rounded-[3rem] border border-slate-200 p-12 space-y-10 shadow-sm">
                        <p className="text-2xl font-black text-[#003B4C] leading-tight">{p.texto}</p>
                        <div className="grid grid-cols-2 gap-5">
                          {['SÍ', 'NO'].map(opt => (
                            <button key={opt} onClick={() => setRespuestas({...respuestas, [`${idBase}-val`]: opt})} className={`p-5 rounded-2xl font-black border-2 transition-all ${respuestas[`${idBase}-val`] === opt ? 'bg-[#A61D2E] border-[#A61D2E] text-white shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-[#003B4C]'}`}>{opt}</button>
                          ))}
                        </div>
                        <textarea className="w-full p-6 bg-white rounded-[2rem] border border-slate-200 text-slate-600 h-32 outline-none focus:border-[#003B4C]" placeholder="Notas del hallazgo..." onChange={(e) => setRespuestas({...respuestas, [`${idBase}-obs`]: e.target.value})} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={finalizarAuditoria} disabled={loading} className="w-full bg-[#A61D2E] p-8 rounded-[3rem] font-black text-2xl text-white hover:bg-black shadow-xl uppercase italic">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERAR REPORTE RCFA"}
            </button>
          </div>
        )}

        {view === 'report' && reporteFinal && (
          <div className="max-w-5xl mx-auto mb-20 shadow-2xl rounded-[3rem] overflow-hidden border border-slate-200 bg-white animate-in zoom-in">
            <div className="bg-[#003B4C] p-12 flex justify-between text-white border-b border-[#003B4C]">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">{reporteFinal.titulo}</h2>
                <p className="text-slate-300 font-bold text-[10px] uppercase tracking-widest mt-1">Análisis Causa Raíz - Estándar Mobley</p>
              </div>
              <div className={`px-6 py-2 rounded-full font-black text-[10px] uppercase h-fit shadow-md ${reporteFinal.nivel_criticidad === 'Alto' ? 'bg-[#A61D2E]' : 'bg-slate-700'}`}>
                Prioridad: {reporteFinal.nivel_criticidad}
              </div>
            </div>
            <div className="p-16 space-y-12">
              <section className="space-y-4">
                <h3 className="text-[#A61D2E] font-black text-xs uppercase tracking-widest flex items-center gap-3">
                   <div className="w-6 h-px bg-[#A61D2E]/20"></div> I. Resumen Ejecutivo
                </h3>
                <p className="text-slate-600 text-sm italic border-l-2 border-[#A61D2E] pl-8 leading-relaxed">{reporteFinal.resumen_ejecutivo}</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-[#003B4C] font-black text-xs uppercase tracking-widest">II. Evaluación 6M</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.entries(reporteFinal.analisis_6m || {}).map(([m, d]) => (
                    <div key={m} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                      <h4 className="text-[#003B4C] font-black text-[10px] uppercase mb-3">{m}</h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="bg-slate-50 p-12 rounded-[3.5rem] border border-[#003B4C]/20 shadow-inner">
                <h3 className="text-[#A61D2E] font-black text-xs uppercase mb-4 opacity-80 tracking-widest">III. Hipótesis Técnica Sugerida</h3>
                <p className="text-3xl font-black text-[#003B4C] italic leading-tight">"{reporteFinal.hipotesis_raiz}"</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-emerald-600 font-black text-xs uppercase tracking-widest flex items-center gap-3">
                   <div className="w-6 h-px bg-emerald-500/20"></div> IV. Recomendaciones Técnicas
                </h3>
                <div className="grid gap-4">
                  {reporteFinal.plan_accion?.map((accion, i) => (
                    <div key={i} className="flex items-center gap-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <CheckCircle2 className="text-emerald-600 shrink-0" size={24}/>
                      <p className="text-sm text-slate-700 font-bold">{accion}</p>
                    </div>
                  ))}
                </div>
              </section>
              <footer className="pt-10 border-t border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold italic leading-relaxed text-center uppercase tracking-widest">
                  Innovattech SpA - Ingeniería de Planta
                </p>
              </footer>
            </div>
            <div className="bg-slate-50 p-10 flex justify-between border-t border-slate-200">
              <button onClick={() => setView('dashboard')} className="text-slate-400 font-black text-[10px] uppercase flex items-center gap-2 hover:text-[#003B4C] transition-all"><ArrowLeft size={16}/> Dashboard</button>
              <button onClick={() => window.print()} className="bg-[#003B4C] text-white px-12 py-5 rounded-2xl font-black text-xs uppercase hover:bg-black shadow-lg">Imprimir Informe</button>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-5xl font-black italic uppercase text-[#003B4C] tracking-tighter">Historial Técnico</h2>
            <div className="grid gap-8">
              {casos.map(c => (
                <div key={c.id} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 flex justify-between items-center shadow-sm hover:border-[#A61D2E] transition-all group">
                  <div>
                    <h4 className="text-3xl font-black text-[#003B4C] italic group-hover:text-[#A61D2E] transition-colors">{c.contexto}</h4>
                    <p className="text-slate-400 font-bold text-[10px] uppercase mt-1">{new Date(c.fecha).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase ${c.status === 'solucionado' ? 'text-emerald-600 bg-emerald-50' : 'text-[#A61D2E] bg-red-50'}`}>{c.status}</span>
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
  <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 flex items-center gap-8 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
    <div className={`p-6 rounded-3xl ${color === 'blue' ? 'bg-[#003B4C] text-white shadow-md' : color === 'red' ? 'bg-[#A61D2E] text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
      <Icon size={32} />
    </div>
    <div>
      <p className="text-slate-400 font-black text-[10px] uppercase mb-1 tracking-widest">{label}</p>
      <p className="text-5xl font-black text-[#003B4C] tracking-tighter">{value}</p>
    </div>
  </div>
);

export default App;
