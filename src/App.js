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
      if (u) cargarCasos(u.uid);
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

  // --- PROMPT DE PREGUNTAS TÉCNICAS ---
  const iniciarAuditoria = async () => {
    if (!contexto || !sintomas) return alert("Por favor completa los campos iniciales.");
    setLoading(true);
    try {
      const promptPreguntas = `Eres un Ingeniero Mecánico Senior experto en Análisis de Causa Raíz (ACR).

DATOS DEL CASO:
- Activo: ${contexto}
- Falla detectada: ${sintomas}

Tu tarea es generar 2 preguntas de diagnóstico técnico por cada una de las 6M.

REGLAS OBLIGATORIAS (SIN EXCEPCIÓN):
1. PROHIBIDO: No hagas preguntas sobre EPP, comunicación entre turnos, limpieza general, olores o ergonomía a menos que causen directamente que el ${contexto} falle.
2. CONTEXTUALIZACIÓN: Cada pregunta DEBE mencionar el nombre del equipo ("${contexto}") o el síntoma ("${sintomas}").
3. ENFOQUE TÉCNICO: Pregunta por torque, pandeo, límites elásticos, huelgos, fatiga, potencia del motor, alineación de ejes, calidad de soldaduras o sobrecarga de material.
4. FORMATO: Responde ÚNICAMENTE con este JSON puro sin markdown ni backticks:
{
  "categorias": [
    {
      "nombre": "Nombre de la M",
      "preguntas": [{"texto": "Pregunta técnica específica sobre ${contexto} y su ${sintomas}"}]
    }
  ]
}`;

      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: "PREGUNTAS",
          datos: { instruccion: promptPreguntas }
        })
      });

      const data = await res.json();

      if (data.categorias) {
        setCategorias(data.categorias);
        setView('audit');
      } else {
        alert("La IA no devolvió el formato esperado. Intenta de nuevo.");
        console.error("Respuesta inesperada:", data);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión con el motor de IA.");
    }
    setLoading(false);
  };

  // --- PROMPT DE REPORTE ACR ---
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

      const promptReporte = `Actúa como un Mecánico Senior de INNOVATTECH. Genera un reporte ACR basado EXCLUSIVAMENTE en:
- Equipo: ${contexto}
- Síntomas: ${sintomas}
- Datos de campo: ${JSON.stringify(respuestasLegibles)}

INSTRUCCIONES:
1. No inventes componentes. Si el usuario no mencionó una pieza, no la analices.
2. Conecta los síntomas con las respuestas técnicas del equipo "${contexto}".
3. Estilo: Ingeniería de Planta, sobrio y preciso.
4. Responde SOLO con este JSON puro sin markdown ni backticks:
{
  "titulo": "REPORTE PRELIMINAR ACR - INNOVATTECH",
  "resumen_ejecutivo": "...",
  "analisis_6m": {
    "Mano de Obra": "...",
    "Maquinaria": "...",
    "Materiales": "...",
    "Métodos": "...",
    "Medición": "...",
    "Medio Ambiente": "..."
  },
  "hipotesis_raiz": "...",
  "plan_accion": ["Inmediata: ...", "Mediano Plazo: ...", "Largo Plazo: ..."],
  "nivel_criticidad": "Bajo|Medio|Alto"
}`;

      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: "REPORTE",
          datos: { instruccion: promptReporte }
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
    } catch (e) {
      console.error(e);
      alert("Error al generar el informe técnico.");
    }
    setLoading(false);
  };

  const resolverCaso = async (id, modo) => {
    const textoRes = modo === 'ia' ? 'Siguió recomendaciones del informe preliminar' : resolucionManual;
    await updateDoc(doc(db, "casos", id), { status: 'solucionado', resolucion: textoRes });
    setResolucionManual('');
  };

  // --- LOGIN ---
  if (!user) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-slate-900 text-center">
      <div className="max-w-md w-full space-y-8">
        <Zap size={60} className="text-[#A61D2E] mx-auto" />
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-[#003B4C]">INNOVATTECH</h1>
        <p className="font-bold text-slate-400 tracking-widest uppercase text-xs">Ingeniería y Análisis Causa Raíz</p>
        <button onClick={handleLogin} className="w-full bg-[#003B4C] text-white p-5 rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-blue-100">
          ACCEDER AL TERMINAL
        </button>
      </div>
    </div>
  );

  // --- LICENCIA ---
  if (!isSubscribed) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 text-center">
      <div className="max-w-md bg-white border border-slate-200 p-12 rounded-[3rem] shadow-xl space-y-8">
        <ShieldCheck size={70} className="mx-auto text-[#A61D2E]" />
        <h2 className="text-3xl font-black uppercase text-[#003B4C]">Licencia Requerida</h2>
        <button onClick={() => setIsSubscribed(true)} className="w-full bg-[#A61D2E] text-white p-5 rounded-2xl font-black shadow-lg hover:bg-black transition-all">
          ACTIVAR LICENCIA PRO
        </button>
      </div>
    </div>
  );

  // --- APP PRINCIPAL ---
  return (
    <div className="min-h-screen bg-white flex text-slate-900 font-sans">
      <AuthCorner user={user} />

      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col p-8 space-y-10 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-[#003B4C] p-2 rounded-xl text-white shadow-sm">
            <LayoutDashboard size={20} />
          </div>
          <span className="font-black text-xl italic uppercase text-[#003B4C]">INNOVATTECH</span>
        </div>
        <nav className="flex-grow space-y-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'audit_start', icon: PlusCircle, label: 'Nuevo Análisis' },
            { id: 'history', icon: History, label: 'Archivo Maestro' },
            { id: 'kpis', icon: BarChart3, label: 'Métricas' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold border transition-all ${view === item.id ? 'bg-[#003B4C] border-[#003B4C] text-white shadow-md' : 'text-slate-500 border-transparent hover:bg-slate-200'}`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-[#A61D2E] font-bold hover:bg-red-50 rounded-2xl transition-all">
          <LogOut size={20} /> Desconectar
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-grow p-10 overflow-y-auto bg-white text-left">

        {/* DASHBOARD */}
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

        {/* NUEVO ANÁLISIS */}
        {view === 'audit_start' && (
          <div className="max-w-2xl mx-auto py-20 space-y-10 animate-in zoom-in">
            <h2 className="text-5xl font-black text-center italic uppercase text-[#003B4C]">Diagnóstico Industrial</h2>
            <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Equipo / Máquina</label>
                <input
                  placeholder="Ej: Tornillo helicoidal de transporte"
                  className="w-full p-6 bg-white rounded-3xl border border-slate-200 outline-none focus:border-[#003B4C] transition-all"
                  onChange={e => setContexto(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Falla Observada</label>
                <textarea
                  placeholder="Ej: Se dobla bajo carga máxima..."
                  className="w-full p-6 bg-white rounded-3xl border border-slate-200 h-40 outline-none focus:border-[#003B4C] transition-all"
                  onChange={e => setSintomas(e.target.value)}
                />
              </div>
              <button
                onClick={iniciarAuditoria}
                disabled={loading}
                className="w-full bg-[#A61D2E] text-white p-6 rounded-3xl font-black text-xl hover:bg-black transition-all shadow-lg uppercase italic"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERAR MOTOR DE PRUEBA"}
              </button>
            </div>
          </div>
        )}

        {/* AUDITORÍA DE CAMPO */}
        {view === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-16 pb-20 animate-in fade-in">
            <h2 className="text-4xl font-black text-center italic uppercase text-[#003B4C]">Auditoría de Campo</h2>
            {categorias?.map((cat, idx) => (
              <div key={idx} className="space-y-10">
                <h4 className="text-white font-black uppercase bg-[#003B4C] px-6 py-3 rounded-full inline-block shadow-sm">
                  {cat.nombre}
                </h4>
                <div className="grid gap-10">
                  {cat?.preguntas?.map((p, pidx) => {
                    const idBase = `${cat.nombre}-${pidx}`;
                    return (
                      <div key={pidx} className="bg-slate-50 rounded-[3rem] border border-slate-200 p-12 space-y-10 shadow-sm">
                        <p className="text-2xl font-black text-[#003B4C] leading-tight">{p.texto}</p>
                        <div className="grid grid-cols-2 gap-5">
                          {['SÍ', 'NO'].map(opt => (
                            <button
                              key={opt}
                              onClick={() => setRespuestas({ ...respuestas, [`${idBase}-val`]: opt })}
                              className={`p-5 rounded-2xl font-black border-2 transition-all ${respuestas[`${idBase}-val`] === opt ? 'bg-[#A61D2E] border-[#A61D2E] text-white shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-[#003B4C]'}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="w-full p-6 bg-white rounded-[2rem] border border-slate-200 text-slate-600 h-32 outline-none focus:border-[#003B4C]"
                          placeholder="Nota técnica adicional..."
                          onChange={(e) => setRespuestas({ ...respuestas, [`${idBase}-obs`]: e.target.value })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              onClick={finalizarAuditoria}
              disabled={loading}
              className="w-full bg-[#A61D2E] p-8 rounded-[3rem] font-black text-2xl text-white hover:bg-black shadow-xl uppercase italic"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERAR REPORTE ACR"}
            </button>
          </div>
        )}

        {/* REPORTE FINAL */}
        {view === 'report' && reporteFinal && (
          <div className="max-w-5xl mx-auto mb-20 shadow-2xl rounded-[3rem] overflow-hidden border border-slate-200 bg-white animate-in zoom-in">
            <div className="bg-[#003B4C] p-12 flex justify-between text-white">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">{reporteFinal.titulo}</h2>
                <p className="text-slate-300 font-bold text-[10px] uppercase mt-1">Innovattech - Informe Técnico de Ingeniería</p>
              </div>
              <div className={`px-6 py-2 rounded-full font-black text-[10px] uppercase h-fit shadow-md ${reporteFinal.nivel_criticidad === 'Alto' ? 'bg-[#A61D2E]' : 'bg-slate-700'}`}>
                Prioridad: {reporteFinal.nivel_criticidad}
              </div>
            </div>
            <div className="p-16 space-y-12">
              <section className="space-y-4">
                <h3 className="text-[#A61D2E] font-black text-xs uppercase tracking-widest border-l-4 border-[#A61D2E] pl-4">I. Resumen Ejecutivo</h3>
                <p className="text-slate-600 text-sm italic leading-relaxed">{reporteFinal.resumen_ejecutivo}</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-[#003B4C] font-black text-xs uppercase tracking-widest">II. Desglose Ishikawa (6M)</h3>
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
                <h3 className="text-[#A61D2E] font-black text-xs uppercase mb-4 opacity-80">III. Hipótesis Técnica de Ingeniería</h3>
                <p className="text-2xl font-black text-[#003B4C] italic leading-tight">"{reporteFinal.hipotesis_raiz}"</p>
              </section>
              <section className="space-y-6">
                <h3 className="text-emerald-600 font-black text-xs uppercase tracking-widest">IV. Plan de Acción Recomendado</h3>
                <div className="grid gap-4">
                  {reporteFinal.plan_accion?.map((accion, i) => (
                    <div key={i} className="flex items-center gap-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
                      <p className="text-sm text-slate-700 font-bold">{accion}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="bg-slate-50 p-10 flex justify-between border-t border-slate-200">
              <button onClick={() => setView('dashboard')} className="text-slate-400 font-black text-[10px] uppercase flex items-center gap-2 hover:text-[#003B4C] transition-all">
                <ArrowLeft size={16} /> Dashboard
              </button>
              <button onClick={() => window.print()} className="bg-[#003B4C] text-white px-12 py-5 rounded-2xl font-black text-xs uppercase hover:bg-black shadow-lg">
                Imprimir Informe
              </button>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {view === 'history' && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-5xl font-black italic uppercase text-[#003B4C] tracking-tighter">Historial Técnico</h2>
            <div className="grid gap-8">
              {casos.map(c => (
                <div key={c.id} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 flex justify-between items-center shadow-sm hover:border-[#A61D2E] transition-all group">
                  <div>
                    <h4 className="text-3xl font-black text-[#003B4C] italic group-hover:text-[#A61D2E] transition-colors">{c.contexto}</h4>
                    <p className="text-slate-400 font-bold text-[10px] uppercase mt-1 tracking-widest">{new Date(c.fecha).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase ${c.status === 'solucionado' ? 'text-emerald-600 bg-emerald-50' : 'text-[#A61D2E] bg-red-50'}`}>
                    {c.status}
                  </span>
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
