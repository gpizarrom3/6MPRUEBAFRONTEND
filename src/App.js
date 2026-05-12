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
  
  // --- MEJORA SEGÚN MOBLEY: ENTREVISTA DE DIAGNÓSTICO DE CONFIABILIDAD ---
  const iniciarAuditoria = async () => {
    if (!contexto || !sintomas) return alert("Por favor completa los campos iniciales.");
    setLoading(true);
    try {
      const promptPreguntas = `Actúa como un Especialista en RCFA (Root Cause Failure Analysis) basado en el "Maintenance Engineering Handbook" de Keith Mobley.
Tu objetivo es identificar el MODO DE FALLA y las condiciones de operación.

CONTEXTO: ${contexto}
SÍNTOMAS: ${sintomas}

Genera 2 preguntas por cada una de las 6M (Mano de Obra, Maquinaria, Materiales, Métodos, Medición, Medio Ambiente).

REGLAS TÉCNICAS (ESTÁNDAR MOBLEY):
1. Prioriza la "Dinámica Operativa": Pregunta sobre cambios en carga, velocidad o ruido cíclico.
2. Busca "Evidencia Física": Pregunta por fugas, coloración por temperatura, o partículas de desgaste (tribología básica).
3. Tono: Ingeniero de Confiabilidad Senior. Analítico, preciso y enfocado en la prevención de fallas repetitivas.

RESPONDE ÚNICAMENTE CON ESTE JSON:
{
  "categorias": [
    {
      "nombre": "Nombre de la M",
      "preguntas": [{"texto": "pregunta técnica 1"}, {"texto": "pregunta técnica 2"}]
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

  // --- MEJORA SEGÚN MOBLEY: REPORTE DE INGENIERÍA DE MANTENIMIENTO ---
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

      const promptReporte = `Eres un Consultor Senior de INNOVATTECH experto en el manual de Keith Mobley.
Genera un Informe de Análisis de Causa Raíz (ACR) con enfoque en Gestión de Activos.

DATOS DE CAMPO: ${JSON.stringify(respuestasLegibles)}

ESTRUCTURA DEL INFORME (ESTILO MOBLEY):
1. Resumen Ejecutivo: Identifica el impacto en la disponibilidad del equipo.
2. Análisis 6M: Evalúa cómo cada factor contribuye al "Modo de Falla".
3. Hipótesis Raíz: Divide la causa en:
   - Causa Física (Ej: Fatiga de material).
   - Causa Humana (Ej: Error en ajuste de torque).
   - Causa Latente/Sistémica (Ej: Falta de procedimiento estandarizado).
4. Plan de Acción: Propón tareas de "Mantenimiento Proactivo" y "Monitoreo de Condición".

TONO: Profesional, basado en datos, no alarmista. Enfocado en reducir costos de MRO (Maintenance, Repair, and Overhaul).

RESPONDE SÓLO CON ESTE JSON:
{
  "titulo": "Informe RCFA: ${contexto}",
  "resumen_ejecutivo": "...",
  "analisis_6m": { "Mano de Obra": "...", "Maquinaria": "...", etc },
  "hipotesis_raiz": "...",
  "plan_accion": ["Acción 1 (Predictiva)", "Acción 2 (Correctiva)", "Acción 3 (Sistémica)"],
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

  // --- RENDERING (Mantenemos tu estilo Clean White con acentos corporativos) ---
  if (!user) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-slate-900 text-center">
      <div className="max-w-md w-full space-y-8">
        <Zap size={60} className="text-[#A61D2E] mx-auto" />
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-[#003B4C]">INNOVATTECH</h1>
        <p className="font-bold text-slate-400 tracking-widest uppercase text-xs">Expert System - Mobley RCFA Standard</p>
        <button onClick={handleLogin} className="w-full bg-[#003B4C] text-white p-5 rounded-2xl font-black hover:bg-black transition-all shadow-xl">ACCEDER AL TERMINAL</button>
      </div>
    </div>
  );

  if (!isSubscribed) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 text-center">
      <div className="max-w-md bg-white border border-slate-200 p-12 rounded-[3rem] shadow-xl space-y-8">
        <ShieldCheck size={70} className="mx-auto text-[#A61D2E]" />
        <h2 className="text-3xl font-black uppercase text-[#003B4C]">Acceso Restringido</h2>
        <p className="text-slate-500 font-medium">Se requiere licencia de ingeniería activa para procesar diagnósticos bajo estándar Mobley.</p>
        <button onClick={() => setIsSubscribed(true)} className="w-full bg-[#A61D2E] text-white p-5 rounded-2xl font-black shadow-lg hover:bg-black transition-all">ACTIVAR LICENCIA PRO</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex text-slate-900">
      <AuthCorner user={user} />
      
      <aside className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col p-8 space-y-10 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-[#003B4C] p-2 rounded-xl text-white"><LayoutDashboard size={20}/></div>
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
              <StatCard label="Casos Cerrados" value={casos.filter(c => c.status === 'solucionado').length} icon={CheckCircle2} color="red" />
              <StatCard label="Pendientes" value={casos.filter(c => c.status === 'pendiente').length} icon={Clock} color="grey" />
            </div>
          </div>
        )}

        {view === 'audit_start' && (
          <div className="max-w-2xl mx-auto py-20 space-y-10 animate-in zoom-in">
            <h2 className="text-5xl font-black text-center italic uppercase text-[#003B4C]">Análisis RCFA</h2>
            <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Activo Industrial / Contexto</label>
                <input placeholder="Ej: Turbina de Vapor - Etapa de Alta Presión" className="w-full p-6 bg-white rounded-3xl border border-slate-200 outline-none focus:border-[#003B4C] transition-all" onChange={e => setContexto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Síntomas de Falla</label>
                <textarea placeholder="Describa ruidos, temperaturas o comportamientos anómalos..." className="w-full p-6 bg-white rounded-3xl border border-slate-200 h-40 outline-none focus:border-[#003B4C] transition-all" onChange={e => setSintomas(e.target.value)} />
              </div>
              <button onClick={iniciarAuditoria} disabled={loading} className="w-full bg-[#A61D2E] text-white p-6 rounded-3xl font-black text-xl hover:bg-black transition-all shadow-lg uppercase italic">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "DESPLEGAR PROTOCOLO MOBLEY"}
              </button>
            </div>
          </div>
        )}

        {view === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-16 pb-20 animate-in fade-in">
            <h2 className="text-4xl font-black text-center italic uppercase text-[#003B4C]">Recolección de Evidencia</h2>
            {categorias?.map((cat, idx) => (
              <div key={idx} className="space-y-10">
                <h4 className="text-white font-black uppercase bg-[#003B4C] px-6 py-3 rounded-full inline-block">{cat.nombre}</h4>
                <div className="grid gap-10">
                  {cat?.preguntas?.map((p, pidx) => {
                    const idBase = `${cat.nombre}-${pidx}`;
                    return (
                      <div key={pidx} className="bg-slate-50 rounded-[3rem] border border-slate-200 p-12 space-y-10 shadow-sm">
                        <p className="text-2xl font-black text-[#003B4C]">{p.texto}</p>
                        <div className="grid grid-cols-2 gap-5">
                          {['SÍ', 'NO'].map(opt => (
                            <button key={opt} onClick={() => setRespuestas({...respuestas, [`${idBase}-val`]: opt})} className={`p-5 rounded-2xl font-black border-2 transition-all ${respuestas[`${idBase}-val`] === opt ? 'bg-[#A61D2E] border-[#A61D2E] text-white shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-[#003B4C]'}`}>{opt}</button>
                          ))}
                        </div>
                        <textarea className="w-full p-6 bg-white rounded-[2rem] border border-slate-200 text-slate-600 h-32 outline-none focus:border-[#003B4C]" placeholder="Notas técnicas del manual Mobley..." onChange={(e) => setRespuestas({...respuestas, [`${idBase}-obs`]: e.target.value})} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={finalizarAuditoria} disabled={loading} className="w-full bg-[#A61D2E] p-8 rounded-[3rem] font-black text-2xl text-white hover:bg-black shadow-xl uppercase italic">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERAR REPORTE DE CONFIABILIDAD"}
            </button>
          </div>
        )}

        {view === 'report' && reporteFinal && (
          <div className="max-w-5xl mx-auto mb-20 shadow-2xl rounded-[3rem] overflow-hidden border border-slate-200 bg-white">
            <div className="bg-[#003B4C] p-12 flex justify-between text-white">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">{reporteFinal.titulo}</h2>
                <p className="text-slate-300 font-bold text-[10px] uppercase tracking-widest mt-1">RCFA Engineering Output - Mobley Method</p>
              </div>
              <div className={`px-6 py-2 rounded-full font-black text-[10px] uppercase h-fit shadow-md ${reporteFinal.nivel_criticidad === 'Alto' ? 'bg-[#A61D2E]' : 'bg-slate-700'}`}>
                Criticidad: {reporteFinal.nivel_criticidad}
              </div>
            </div>
            <div className="p-16 space-y-12">
              <section className="space-y-4">
                <h3 className="text-[#A61D2E] font-black text-xs uppercase tracking-widest">I. Resumen Ejecutivo (Impacto en Activos)</h3>
                <p className="text-slate-600 text-sm italic border-l-2 border-[#A61D2E] pl-8 leading-relaxed">{reporteFinal.resumen_ejecutivo}</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-[#003B4C] font-black text-xs uppercase tracking-widest">II. Desglose de Factores RCFA</h3>
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
                <h3 className="text-[#A61D2E] font-black text-xs uppercase mb-4 opacity-80">III. Hipótesis Técnica de Causa Raíz</h3>
                <p className="text-3xl font-black text-[#003B4C] italic leading-tight">"{reporteFinal.hipotesis_raiz}"</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-emerald-600 font-black text-xs uppercase tracking-widest">IV. Plan de Acción de Mantenimiento Proactivo</h3>
                <div className="grid gap-4">
                  {reporteFinal.plan_accion?.map((accion, i) => (
                    <div key={i} className="flex items-center gap-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <CheckCircle2 className="text-emerald-600 shrink-0" size={24}/>
                      <p className="text-sm text-slate-700 font-bold">{accion}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="bg-slate-50 p-10 flex justify-between border-t border-slate-200">
              <button onClick={() => setView('dashboard')} className="text-slate-400 font-black text-[10px] uppercase flex items-center gap-2 hover:text-[#003B4C] transition-all"><ArrowLeft size={16}/> Dashboard</button>
              <button onClick={() => window.print()} className="bg-[#003B4C] text-white px-12 py-5 rounded-2xl font-black text-xs uppercase hover:bg-black shadow-lg">Imprimir Informe</button>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-5xl font-black italic uppercase text-[#003B4C] tracking-tighter">Archivo Maestro</h2>
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
    <div className={`p-6 rounded-3xl ${color === 'blue' ? 'bg-[#003B4C] text-white' : color === 'red' ? 'bg-[#A61D2E] text-white' : 'bg-slate-100 text-slate-500'}`}>
      <Icon size={32} />
    </div>
    <div>
      <p className="text-slate-400 font-black text-[10px] uppercase mb-1">{label}</p>
      <p className="text-5xl font-black text-[#003B4C] tracking-tighter">{value}</p>
    </div>
  </div>
);

export default App;
