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

// ─── Utilidad: parsea JSON aunque venga con ```json fences ───────────────────
function parseJSONSafe(raw) {
  if (typeof raw !== 'string') return raw;
  const clean = raw.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, m =>
    m.replace(/```json|```/g, '')
  ).trim();
  return JSON.parse(clean);
}

// ─── Utilidad: extrae texto de la respuesta de la API (maneja bloques mixtos) ─
function extractText(data) {
  if (!data || !data.content) return JSON.stringify(data);
  return data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');
}

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
  const [errorMsg, setErrorMsg] = useState('');

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

  // ─── PROMPT 1: PREGUNTAS ────────────────────────────────────────────────────
  // Mejoras aplicadas:
  // 1. Sistema separado del usuario para mayor peso de instrucciones
  // 2. JSON schema completo con las 6 categorías explícitas
  // 3. "Responde ÚNICAMENTE con JSON válido" sin markdown
  // 4. Temperatura baja (0.2) para reproducibilidad
  const iniciarAuditoria = async () => {
    if (!contexto || !sintomas) {
      return setErrorMsg("Por favor completa el equipo y los síntomas antes de continuar.");
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: "PREGUNTAS",
          temperatura: 0.2,           // ← bajo: queremos estructura predecible
          datos: {
            contexto,
            sintomas,
            // SYSTEM-level: rol y regla de output
            system: `Eres un Mecánico Industrial Senior con 30 años de experiencia en mantenimiento predictivo y correctivo.
Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin explicaciones, sin bloques de markdown.`,

            // USER-level: tarea concreta + schema forzado
            instruccion: `Equipo o área: "${contexto}"
Síntomas reportados: "${sintomas}"

Realiza una inspección sensorial preliminar usando la metodología 6M.
Genera exactamente 2 preguntas observacionales por cada una de estas 6 categorías:
Mano de Obra, Maquinaria, Materiales, Métodos, Medición, Medio Ambiente.

Reglas para las preguntas:
- Deben describir lo que el operario VE, ESCUCHA o SIENTE directamente.
- No requieren instrumentos de medición (sin micrómetros, hercios, vatios).
- Tono de maestro mecánico: directo, profesional, sin alarmismos.
- Cada pregunta busca un indicio físico concreto relacionado con los síntomas.

Responde EXACTAMENTE con este JSON, completando las 6 categorías:
{
  "categorias": [
    {
      "nombre": "Mano de Obra",
      "preguntas": [
        { "texto": "pregunta 1 aquí" },
        { "texto": "pregunta 2 aquí" }
      ]
    },
    {
      "nombre": "Maquinaria",
      "preguntas": [
        { "texto": "pregunta 1 aquí" },
        { "texto": "pregunta 2 aquí" }
      ]
    },
    {
      "nombre": "Materiales",
      "preguntas": [
        { "texto": "pregunta 1 aquí" },
        { "texto": "pregunta 2 aquí" }
      ]
    },
    {
      "nombre": "Métodos",
      "preguntas": [
        { "texto": "pregunta 1 aquí" },
        { "texto": "pregunta 2 aquí" }
      ]
    },
    {
      "nombre": "Medición",
      "preguntas": [
        { "texto": "pregunta 1 aquí" },
        { "texto": "pregunta 2 aquí" }
      ]
    },
    {
      "nombre": "Medio Ambiente",
      "preguntas": [
        { "texto": "pregunta 1 aquí" },
        { "texto": "pregunta 2 aquí" }
      ]
    }
  ]
}`
          }
        })
      });

      const raw = await res.json();
      // Parsing defensivo: limpia fences y parsea
      const texto = typeof raw === 'string' ? raw : extractText(raw) || JSON.stringify(raw);
      const data = parseJSONSafe(texto);

      // Validación de estructura antes de avanzar
      if (!data.categorias || !Array.isArray(data.categorias) || data.categorias.length !== 6) {
        throw new Error(`Se esperaban 6 categorías, se recibieron ${data.categorias?.length ?? 0}.`);
      }

      setCategorias(data.categorias);
      setView('audit');

    } catch (e) {
      console.error("Error en iniciarAuditoria:", e);
      setErrorMsg(`Error al generar las preguntas: ${e.message}. Intenta nuevamente.`);
    }

    setLoading(false);
  };

  // ─── PROMPT 2: REPORTE ──────────────────────────────────────────────────────
  // Mejoras aplicadas:
  // 1. Se pasan las preguntas originales al modelo para coherencia 6M
  // 2. analisis_6m con las 6 keys explícitas (sin "etc.")
  // 3. Criterio claro para nivel_criticidad
  // 4. Temperatura media (0.6) para mejor prosa narrativa
  // 5. plan_accion con mínimo de pasos definido
  const finalizarAuditoria = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // Construye respuestas legibles para el modelo
      const respuestasLegibles = {};
      categorias.forEach(cat => {
        cat.preguntas.forEach((p, idx) => {
          const idBase = `${cat.nombre}-${idx}`;
          const valor = respuestas[`${idBase}-val`];
          const obs = respuestas[`${idBase}-obs`];
          if (valor) {
            respuestasLegibles[`${cat.nombre} — ${p.texto}`] = {
              respuesta: valor,
              observaciones: obs || "Sin observaciones adicionales"
            };
          }
        });
      });

      // Resumen de preguntas realizadas (contexto para el modelo)
      const preguntasRealizadas = categorias.map(cat => ({
        categoria: cat.nombre,
        preguntas: cat.preguntas.map(p => p.texto)
      }));

      const res = await fetch(`${API_BASE_URL}/api/diagnostico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: "REPORTE",
          temperatura: 0.6,           // ← medio: prosa narrativa de calidad
          datos: {
            contexto,
            sintomas,
            preguntas_realizadas: preguntasRealizadas,  // ← NUEVO: contexto de preguntas
            respuestas: respuestasLegibles,

            // SYSTEM-level: rol y regla de output
            system: `Eres un Mecánico Industrial Senior entregando un Informe Técnico Preliminar.
Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin bloques de markdown.`,

            // USER-level: tarea con schema completo y criterios explícitos
            instruccion: `Equipo evaluado: "${contexto}"
Síntomas reportados: "${sintomas}"

Preguntas realizadas por categoría:
${JSON.stringify(preguntasRealizadas, null, 2)}

Respuestas del operario:
${JSON.stringify(respuestasLegibles, null, 2)}

Analiza cada hallazgo punto por punto y redacta un informe técnico preliminar.

REGLAS DE TONO (obligatorias):
- NUNCA uses: catastrófico, grave, urgente, peligroso, crítico, alarmante.
- USA SIEMPRE: "desviación detectada", "hallazgo fuera de estándar", "condición a monitorear", "hallazgo preliminar", "requiere seguimiento".
- El informe es un apoyo para guiar al cliente, no una sentencia final.
- La hipotesis_raiz es una sugerencia técnica basada en la evidencia sensorial recopilada.
- El plan_accion contiene pasos de baja complejidad (inspecciones visuales, toma de datos, limpiezas simples). Mínimo 4 pasos, máximo 6.

CRITERIO PARA nivel_criticidad:
- "Bajo": 0 a 2 categorías 6M con hallazgos fuera de rango.
- "Medio": 3 categorías con hallazgos fuera de rango.
- "Alto": 4 o más categorías con hallazgos fuera de rango.

Responde EXACTAMENTE con este JSON, completando los 6 campos de analisis_6m:
{
  "titulo": "Diagnóstico Preliminar de [nombre del equipo o área]",
  "resumen_ejecutivo": "Resumen sobrio en 2-3 oraciones sobre la condición actual del activo según los síntomas y respuestas recopiladas.",
  "analisis_6m": {
    "Mano de Obra": "Redacción profesional del hallazgo o condición observada para esta M.",
    "Maquinaria": "Redacción profesional del hallazgo o condición observada para esta M.",
    "Materiales": "Redacción profesional del hallazgo o condición observada para esta M.",
    "Métodos": "Redacción profesional del hallazgo o condición observada para esta M.",
    "Medición": "Redacción profesional del hallazgo o condición observada para esta M.",
    "Medio Ambiente": "Redacción profesional del hallazgo o condición observada para esta M."
  },
  "hipotesis_raiz": "Conclusión preliminar basada en la experiencia y en los patrones de respuesta observados.",
  "plan_accion": [
    "Paso 1: descripción concreta de la acción",
    "Paso 2: descripción concreta de la acción",
    "Paso 3: descripción concreta de la acción",
    "Paso 4: descripción concreta de la acción"
  ],
  "nivel_criticidad": "Bajo|Medio|Alto"
}`
          }
        })
      });

      const raw = await res.json();
      const texto = typeof raw === 'string' ? raw : extractText(raw) || JSON.stringify(raw);
      const data = parseJSONSafe(texto);

      // Validación de estructura del reporte
      const camposRequeridos = ['titulo', 'resumen_ejecutivo', 'analisis_6m', 'hipotesis_raiz', 'plan_accion', 'nivel_criticidad'];
      const faltantes = camposRequeridos.filter(c => !data[c]);
      if (faltantes.length > 0) {
        throw new Error(`El reporte no tiene los campos: ${faltantes.join(', ')}.`);
      }

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
      console.error("Error en finalizarAuditoria:", e);
      setErrorMsg(`Error al generar el informe: ${e.message}. Intenta nuevamente.`);
    }

    setLoading(false);
  };

  const resolverCaso = async (id, modo) => {
    const textoRes = modo === 'ia'
      ? 'Siguió recomendaciones del informe preliminar'
      : resolucionManual;
    await updateDoc(doc(db, "casos", id), { status: 'solucionado', resolucion: textoRes });
    setResolucionManual('');
  };

  // ─── PANTALLAS ──────────────────────────────────────────────────────────────

  if (!user) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full space-y-12 text-center">
        <Zap size={48} className="text-indigo-400 mx-auto" />
        <h1 className="text-5xl font-black italic uppercase">Análisis Causa Raíz</h1>
        <button onClick={handleLogin} className="w-full bg-indigo-600 p-5 rounded-2xl font-black">
          ACCEDER AL TERMINAL
        </button>
      </div>
    </div>
  );

  if (!isSubscribed) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
      <div className="max-w-md bg-slate-900 border border-slate-800 p-12 rounded-[3rem] text-center space-y-8">
        <ShieldCheck size={70} className="mx-auto text-emerald-400" />
        <h2 className="text-3xl font-black uppercase">Licencia Requerida</h2>
        <button onClick={() => setIsSubscribed(true)} className="w-full bg-emerald-600 p-5 rounded-2xl font-black">
          ACTIVAR LICENCIA PRO
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] flex text-slate-200">
      <AuthCorner user={user} />

      {/* Sidebar */}
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col p-8 space-y-10 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <LayoutDashboard size={20} className="text-indigo-500" />
          <span className="font-black text-xl italic uppercase text-white">DIMECA 6M</span>
        </div>
        <nav className="flex-grow space-y-3">
          {[
            { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'audit_start', icon: PlusCircle,       label: 'Nuevo Análisis' },
            { id: 'history',     icon: History,          label: 'Historial' },
            { id: 'kpis',        icon: BarChart3,        label: 'Métricas' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold border ${
                view === item.id
                  ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400'
                  : 'text-slate-500 border-transparent hover:bg-slate-900'
              }`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-rose-500 font-bold">
          <LogOut size={20} /> Desconectar
        </button>
      </aside>

      {/* Main */}
      <main className="flex-grow p-10 overflow-y-auto">

        {/* ── Dashboard ── */}
        {view === 'dashboard' && (
          <div className="space-y-12">
            <header>
              <h2 className="text-5xl font-black italic uppercase text-white">Status Report</h2>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="Evaluaciones Totales"  value={casos.length}                                          icon={ClipboardList}  color="indigo"  />
              <StatCard label="Casos Cerrados"         value={casos.filter(c => c.status === 'solucionado').length} icon={CheckCircle2}   color="emerald" />
              <StatCard label="En Seguimiento"         value={casos.filter(c => c.status === 'pendiente').length}   icon={Clock}          color="amber"   />
            </div>
          </div>
        )}

        {/* ── Inicio auditoría ── */}
        {view === 'audit_start' && (
          <div className="max-w-2xl mx-auto py-20 space-y-10">
            <h2 className="text-5xl font-black text-center italic uppercase text-white">Diagnóstico Preliminar</h2>
            <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 space-y-8">
              <input
                placeholder="Equipo o Área de Planta"
                className="w-full p-6 bg-slate-950 rounded-3xl border border-slate-800 text-white outline-none focus:border-indigo-500 transition-all"
                onChange={e => setContexto(e.target.value)}
              />
              <textarea
                placeholder="Descripción de Hallazgos y Síntomas"
                className="w-full p-6 bg-slate-950 rounded-3xl border border-slate-800 text-white h-40 outline-none focus:border-indigo-500 transition-all"
                onChange={e => setSintomas(e.target.value)}
              />
              {/* Mensaje de error inline */}
              {errorMsg && (
                <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5">
                  <AlertCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
                  <p className="text-rose-300 text-sm font-medium">{errorMsg}</p>
                </div>
              )}
              <button
                onClick={iniciarAuditoria}
                disabled={loading}
                className="w-full bg-indigo-600 p-6 rounded-3xl font-black text-xl text-white hover:bg-indigo-500 transition-all uppercase italic disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "DESPLEGAR AUDITORÍA 6M"}
              </button>
            </div>
          </div>
        )}

        {/* ── Formulario 6M ── */}
        {view === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-16 pb-20">
            <h2 className="text-4xl font-black text-center italic uppercase text-white">Protocolo Sensorial 6M</h2>

            {categorias?.map((cat, idx) => (
              <div key={idx} className="space-y-10">
                <h4 className="text-indigo-400 font-black uppercase bg-indigo-500/10 px-6 py-3 rounded-full inline-block border border-indigo-500/20">
                  {cat.nombre}
                </h4>
                <div className="grid gap-10">
                  {cat?.preguntas?.map((p, pidx) => {
                    const idBase = `${cat.nombre}-${pidx}`;
                    return (
                      <div key={pidx} className="bg-slate-900 rounded-[3rem] border border-slate-800 p-12 space-y-10 shadow-2xl">
                        <p className="text-2xl font-black text-white">{pidx + 1}. {p.texto}</p>
                        <div className="grid grid-cols-2 gap-5">
                          {['SÍ', 'NO'].map(opt => (
                            <button
                              key={opt}
                              onClick={() => setRespuestas({ ...respuestas, [`${idBase}-val`]: opt })}
                              className={`p-5 rounded-2xl font-black border-2 transition-all ${
                                respuestas[`${idBase}-val`] === opt
                                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                                  : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-4">
                            Notas Técnicas del Operador:
                          </label>
                          <textarea
                            className="w-full p-6 bg-slate-950 rounded-[2rem] border border-slate-800 text-slate-300 h-32 outline-none focus:border-indigo-500 transition-all"
                            placeholder="Anote detalles específicos observados a mano..."
                            onChange={(e) => setRespuestas({ ...respuestas, [`${idBase}-obs`]: e.target.value })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Error en paso de reporte */}
            {errorMsg && (
              <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5">
                <AlertCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
                <p className="text-rose-300 text-sm font-medium">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={finalizarAuditoria}
              disabled={loading}
              className="w-full bg-emerald-600 p-8 rounded-[3rem] font-black text-2xl text-white hover:bg-emerald-500 transition-all shadow-xl uppercase italic disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERAR REPORTE PRELIMINAR"}
            </button>
          </div>
        )}

        {/* ── Reporte final ── */}
        {view === 'report' && reporteFinal && (
          <div className="max-w-5xl mx-auto mb-20 shadow-2xl rounded-[3rem] overflow-hidden border border-slate-800 animate-in zoom-in">
            {/* Header del reporte */}
            <div className="bg-slate-900 p-12 flex justify-between items-end border-b border-slate-800">
              <div>
                <h2 className="text-4xl font-black uppercase italic text-white tracking-tighter">
                  {reporteFinal.titulo}
                </h2>
                <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.4em] mt-1">
                  Análisis Preliminar de Ingeniería
                </p>
              </div>
              <div className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest ${
                reporteFinal.nivel_criticidad === 'Alto'
                  ? 'bg-amber-600'
                  : reporteFinal.nivel_criticidad === 'Medio'
                    ? 'bg-indigo-600'
                    : 'bg-emerald-700'
              }`}>
                Prioridad: {reporteFinal.nivel_criticidad}
              </div>
            </div>

            {/* Cuerpo del reporte */}
            <div className="bg-slate-950 p-16 space-y-12">

              {/* I. Resumen */}
              <section className="space-y-4">
                <h3 className="text-indigo-500 font-black text-xs uppercase tracking-widest flex items-center gap-3">
                  <div className="w-6 h-px bg-indigo-500/20"></div> I. Resumen de Hallazgos
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed italic border-l-2 border-indigo-500/30 pl-8">
                  {reporteFinal.resumen_ejecutivo}
                </p>
              </section>

              {/* II. Análisis 6M */}
              <section className="space-y-6">
                <h3 className="text-indigo-500 font-black text-xs uppercase tracking-widest flex items-center gap-3">
                  <div className="w-6 h-px bg-indigo-500/20"></div> II. Evaluación de Factores 6M
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.entries(reporteFinal.analisis_6m || {}).map(([m, d]) => {
                    const IconComp = mIcons[m] || ClipboardList;
                    return (
                      <div
                        key={m}
                        className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 hover:border-indigo-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <IconComp size={14} className="text-indigo-400" />
                          <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">{m}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{d}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* III. Hipótesis */}
              <section className="bg-slate-900 p-12 rounded-[3.5rem] border border-indigo-500/30 shadow-2xl">
                <h3 className="text-indigo-400 font-black text-xs uppercase mb-4 opacity-80 tracking-widest">
                  III. Hipótesis Técnica Sugerida
                </h3>
                <p className="text-3xl font-black text-white italic leading-tight">
                  "{reporteFinal.hipotesis_raiz}"
                </p>
              </section>

              {/* IV. Plan de acción */}
              <section className="space-y-6">
                <h3 className="text-emerald-500 font-black text-xs uppercase tracking-widest flex items-center gap-3">
                  <div className="w-6 h-px bg-emerald-500/20"></div> IV. Hoja de Ruta / Próximos Pasos
                </h3>
                <div className="grid gap-4">
                  {reporteFinal.plan_accion?.map((accion, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-5 bg-slate-900 p-6 rounded-3xl border border-slate-800 group hover:border-emerald-500/30 transition-all"
                    >
                      <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
                      <p className="text-sm text-slate-300 font-bold italic">{accion}</p>
                    </div>
                  ))}
                </div>
              </section>

              <footer className="pt-10 border-t border-slate-800">
                <p className="text-[10px] text-slate-600 font-bold italic leading-relaxed">
                  Nota: Este informe constituye una evaluación preliminar sensorial basada en inspección observacional.
                  Para una determinación definitiva, se recomienda un levantamiento técnico con instrumental de precisión.
                </p>
              </footer>
            </div>

            {/* Footer del reporte */}
            <div className="bg-slate-900 p-10 flex justify-between items-center border-t border-slate-800">
              <button
                onClick={() => setView('dashboard')}
                className="text-slate-500 font-black text-[10px] uppercase flex items-center gap-2 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} /> Volver al Dashboard
              </button>
              <button
                onClick={() => window.print()}
                className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-400 hover:text-white transition-all shadow-xl"
              >
                Imprimir Reporte
              </button>
            </div>
          </div>
        )}

        {/* ── Historial ── */}
        {view === 'history' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <h2 className="text-5xl font-black italic uppercase text-white tracking-tighter">Archivo de Activos</h2>
            {casos.length === 0 && (
              <p className="text-slate-500 font-bold">No hay casos registrados aún.</p>
            )}
            <div className="grid gap-8">
              {casos.map(c => (
                <div key={c.id} className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 space-y-8 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-3xl font-black text-white italic tracking-tight">{c.contexto}</h4>
                      <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">
                        {new Date(c.fecha).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      c.status === 'solucionado'
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  {c.status === 'pendiente' && (
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <textarea
                        placeholder="Describe cómo se resolvió el caso..."
                        className="w-full p-5 bg-slate-950 rounded-2xl border border-slate-800 text-slate-300 h-24 outline-none focus:border-indigo-500 transition-all text-sm"
                        onChange={e => setResolucionManual(e.target.value)}
                      />
                      <div className="flex gap-4">
                        <button
                          onClick={() => resolverCaso(c.id, 'manual')}
                          className="flex-1 bg-slate-800 p-4 rounded-2xl font-black text-xs uppercase text-slate-300 hover:bg-slate-700 transition-all"
                        >
                          Marcar Resuelto
                        </button>
                        <button
                          onClick={() => resolverCaso(c.id, 'ia')}
                          className="flex-1 bg-indigo-600 p-4 rounded-2xl font-black text-xs uppercase text-white hover:bg-indigo-500 transition-all"
                        >
                          Cerrar con IA
                        </button>
                      </div>
                    </div>
                  )}
                  {c.status === 'solucionado' && c.resolucion && (
                    <p className="text-slate-500 text-xs italic border-l-2 border-emerald-500/30 pl-5">
                      {c.resolucion}
                    </p>
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

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 flex items-center gap-8 shadow-2xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
    <div className={`p-6 rounded-3xl ${
      color === 'indigo'  ? 'bg-indigo-500/10 text-indigo-400'  :
      color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-amber-500/10 text-amber-400'
    }`}>
      <Icon size={32} />
    </div>
    <div>
      <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-1">{label}</p>
      <p className="text-5xl font-black text-white tracking-tighter">{value}</p>
    </div>
  </div>
);

export default App;
