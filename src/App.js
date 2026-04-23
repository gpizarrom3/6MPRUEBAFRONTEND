import React, { useState } from 'react';
import { 
  FileText, Activity, ClipboardCheck, Briefcase, 
  Info, ChevronRight, AlertTriangle, Settings 
} from 'lucide-react';

function App() {
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);

  // --- LÓGICA (Mantenida exactamente igual) ---
  const handleGenerateEntrevista = async () => {
    setLoading(true);
    setQuestions([]);
    setReporte(null);
    setRespuestas({});
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `SÍNTOMA: ${sintomas}. CONTEXTO: ${contexto}.`,
          systemPrompt: `Eres un Consultor Senior de Mantenimiento experto en metodología 6M (Ishikawa). Genera una auditoría preliminar. REGLAS: 1. Preguntas cualitativas. 2. PROHIBIDO datos duros. 3. 3 preguntas por cada 6M. Responde ÚNICAMENTE en JSON: { "categorias": [ { "nombre": "...", "preguntas": ["..."] } ] }`
        })
      });
      const data = await response.json();
      setQuestions(data.categorias || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleOptionChange = (qIdx, catIdx, valor, pregunta, categoria) => {
    const id = `${catIdx}-${qIdx}`;
    setRespuestas(prev => ({ ...prev, [id]: { ...prev[id], opcion: valor, pregunta, categoria } }));
  };

  const handleCommentChange = (qIdx, catIdx, texto) => {
    const id = `${catIdx}-${qIdx}`;
    setRespuestas(prev => ({ ...prev, [id]: { ...prev[id], comentario: texto } }));
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const promptACR = `SÍNTOMA: ${sintomas}. RESPUESTAS: ${JSON.stringify(respuestas)}`;
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptACR,
          systemPrompt: `Eres un Experto en Confiabilidad. Analiza y responde en JSON: { "resumen": "...", "analisis_6m": { "Maquinaria": "...", "Mano_Obra": "...", "Metodos": "...", "Materiales": "...", "Medicion": "...", "Medio_Ambiente": "..." }, "hipotesis": "...", "conclusiones": "...", "solucion_profesional": "..." }`
        })
      });
      const data = await response.json();
      setReporte(data);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (error) { alert("Error"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* HEADER DINÁMICO */}
      <header className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-8 shadow-2xl border-b-4 border-blue-500">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500 p-3 rounded-2xl shadow-inner animate-pulse">
              <Activity size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">Auditoría 6M Pro</h1>
              <p className="text-blue-200 text-sm font-medium">Inteligencia Artificial aplicada a Confiabilidad Industrial</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="bg-blue-800/50 px-3 py-1 rounded-full text-xs font-bold border border-blue-400/30">v2.5 Flash</span>
            <span className="bg-green-500/20 px-3 py-1 rounded-full text-xs font-bold border border-green-400 text-green-400 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" /> Online
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-10">
        
        {/* SECCIÓN DE ENTRADA - DISEÑO DE CARD */}
        <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 transform transition-all">
          <div className="bg-slate-50 p-4 border-b font-bold text-slate-500 flex items-center gap-2">
            <Settings size={18} /> CONFIGURACIÓN DEL DIAGNÓSTICO
          </div>
          <div className="p-8 grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-blue-900 uppercase tracking-widest ml-1">Contexto de la Planta</label>
              <input 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm"
                value={contexto} 
                onChange={(e) => setContexto(e.target.value)} 
                placeholder="Ej: Planta Térmica, Caldera N°2..." 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-blue-900 uppercase tracking-widest ml-1">Síntoma Detectado</label>
              <textarea 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm h-20"
                value={sintomas} 
                onChange={(e) => setSintomas(e.target.value)} 
                placeholder="Ej: Vibración excesiva y ruido metálico..." 
              />
            </div>
            <button 
              onClick={handleGenerateEntrevista} 
              disabled={loading}
              className="md:col-span-2 group relative overflow-hidden bg-blue-700 text-white p-5 rounded-2xl font-black text-lg shadow-lg hover:shadow-blue-200 transition-all active:scale-95"
            >
              <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-500 -skew-x-12 -translate-x-full" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? "PROCESANDO DATOS..." : "GENERAR ENTREVISTA DE CAMPO"} <ChevronRight />
              </span>
            </button>
          </div>
        </section>

        {/* LISTADO DE PREGUNTAS 6M - DISEÑO INTERACTIVO */}
        <section className="grid gap-8">
          {questions.map((cat, catIdx) => (
            <div key={catIdx} className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 text-white p-4 px-8 font-black uppercase tracking-widest flex justify-between items-center">
                <span>{cat.nombre}</span>
                <div className="bg-blue-500 px-3 py-1 rounded text-[10px]">M-ISO 9001</div>
              </div>
              <div className="divide-y divide-slate-50">
                {(cat.preguntas || []).map((p, qIdx) => (
                  <div key={qIdx} className="p-6 hover:bg-slate-50 transition-colors space-y-4">
                    <p className="text-lg font-bold text-slate-700 leading-tight">
                      <span className="text-blue-500 mr-2">#0{qIdx+1}</span> {p}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {['SI', 'NO', 'S.I.'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleOptionChange(qIdx, catIdx, opt, p, cat.nombre)}
                            className={`px-6 py-2 rounded-lg font-black text-xs transition-all ${
                              respuestas[`${catIdx}-${qIdx}`]?.opcion === opt 
                              ? 'bg-blue-600 text-white shadow-lg scale-110' 
                              : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <input 
                        className="flex-1 min-w-[200px] p-2 bg-transparent border-b-2 border-slate-100 focus:border-blue-400 outline-none text-sm italic text-slate-500"
                        placeholder="Añadir comentario técnico..."
                        onChange={(e) => handleCommentChange(qIdx, catIdx, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* BOTÓN ACR */}
        {questions.length > 0 && !reporte && (
          <button 
            onClick={handleGenerateACR} 
            disabled={loading}
            className="w-full bg-emerald-600 text-white p-8 rounded-3xl font-black text-2xl shadow-2xl hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 border-b-8 border-emerald-900"
          >
            <ClipboardCheck size={40} /> {loading ? "PROCESANDO INFORME..." : "GENERAR INFORME ACR FINAL"}
          </button>
        )}

        {/* REPORTE FINAL - DISEÑO DE IMPACTO */}
        {reporte && (
          <section className="mt-16 bg-white rounded-[40px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] border-t-8 border-emerald-500 overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="p-10 space-y-10">
              <div className="flex items-center gap-4 border-b-2 border-slate-100 pb-6">
                <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
                  <ClipboardCheck size={48} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Análisis de Causa Raíz</h2>
                  <p className="text-slate-400 font-bold">REPORTE TÉCNICO PRELIMINAR DE CAMPO</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-2">Resumen Ejecutivo</h3>
                <p className="text-slate-600 leading-relaxed font-medium italic">"{reporte.resumen}"</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(reporte.analisis_6m || {}).map(([key, val]) => (
                  <div key={key} className="p-5 bg-white border-2 border-slate-50 rounded-2xl shadow-sm hover:border-blue-100 transition-all">
                    <h4 className="font-black text-blue-900 text-[10px] uppercase tracking-tighter mb-1 border-b border-blue-50 pb-1">{key}</h4>
                    <p className="text-xs text-slate-500 leading-snug">{val}</p>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-amber-50 border-2 border-amber-100 rounded-[32px] relative overflow-hidden">
                <AlertTriangle className="absolute right-[-10px] top-[-10px] text-amber-200/50" size={120} />
                <h3 className="font-black text-amber-900 flex items-center gap-2 mb-2 uppercase italic tracking-tighter">
                  <Info size={24} /> Hipótesis Técnica Sugerida
                </h3>
                <p className="text-amber-900 font-bold text-lg leading-tight relative z-10">{reporte.hipotesis}</p>
              </div>

              <div className="p-8 bg-blue-900 text-white rounded-[32px] shadow-2xl border-b-8 border-blue-950 relative">
                <Briefcase className="mb-4 text-blue-400" size={32} />
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter">Propuesta de Solución Profesional</h3>
                <p className="text-blue-100 leading-relaxed font-medium text-lg italic">
                  {reporte.solucion_profesional}
                </p>
                <div className="mt-8 pt-6 border-t border-blue-800 flex justify-between items-center text-xs font-bold text-blue-400">
                  <span>CONSULTORÍA 6M ESTRATÉGICA</span>
                  <span>CERRAR REVISIÓN</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="text-center p-10 text-slate-400 text-xs font-bold">
        © 2026 SISTEMA DE AUDITORÍA INDUSTRIAL 6M - PROPIEDAD INTELECTUAL RESERVADA
      </footer>
    </div>
  );
}

export default App;
