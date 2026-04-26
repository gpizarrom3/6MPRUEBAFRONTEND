import React, { useState } from 'react';
import { 
  Activity, ClipboardCheck, Briefcase, 
  Info, ChevronRight, MessageSquare, MapPin 
} from 'lucide-react';
import AuthCorner from './AuthCorner';
import { auth, guardarReporteEnNube } from './firebase'; // <-- IMPORTANTE

function App() {
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);

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
          systemPrompt: `Eres un Consultor Senior de Mantenimiento. Genera una auditoría preliminar cualitativa 6M. Responde ÚNICAMENTE en JSON: { "categorias": [ { "nombre": "...", "preguntas": ["..."] } ] }`
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
          systemPrompt: `Eres un Experto en ACR. Analiza y responde en JSON: { "resumen": "...", "analisis_6m": { "Maquinaria": "...", "Mano_Obra": "...", "Metodos": "...", "Materiales": "...", "Medicion": "...", "Medio_Ambiente": "..." }, "hipotesis": "...", "conclusiones": "...", "solucion_profesional": "..." }`
        })
      });
      const data = await response.json();
      setReporte(data);

      // --- LOGICA DE GUARDADO AUTOMÁTICO ---
      if (auth.currentUser) {
        await guardarReporteEnNube(
          auth.currentUser.uid,
          auth.currentUser.email,
          contexto,
          sintomas,
          data
        );
      }

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (error) { alert("Error al generar reporte"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <AuthCorner />

      <header className="bg-white border-b border-slate-200 p-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-blue-900 uppercase">Auditoría 6M</h1>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs font-black text-slate-400 uppercase">Sistema de Diagnóstico Inteligente</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 py-12 space-y-12">
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              ¡Hola! <span className="text-blue-600">Cuéntanos tu problema.</span>
            </h2>
          </div>

          <div className="bg-white rounded-[32px] shadow-2xl shadow-blue-100 p-8 md:p-12 border border-slate-100 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-black text-blue-900 uppercase tracking-widest">
                  <MapPin size={18} className="text-blue-500" /> ¿Lugar o equipo?
                </label>
                <input 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg"
                  value={contexto} 
                  onChange={(e) => setContexto(e.target.value)} 
                  placeholder="Ej: Caldera N°2..." 
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-black text-blue-900 uppercase tracking-widest">
                  <MessageSquare size={18} className="text-blue-500" /> ¿Qué pasa?
                </label>
                <textarea 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg h-28"
                  value={sintomas} 
                  onChange={(e) => setSintomas(e.target.value)} 
                  placeholder="Ej: Hay un ruido metálico..." 
                />
              </div>
            </div>
            <button 
              onClick={handleGenerateEntrevista} 
              disabled={loading || !sintomas}
              className="w-full bg-blue-600 text-white p-6 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "ANALIZANDO..." : "EMPEZAR DIAGNÓSTICO"}
            </button>
          </div>
        </section>

        <section className="space-y-8">
          {questions.map((cat, catIdx) => (
            <div key={catIdx} className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 text-white p-4 px-8 font-black uppercase text-sm">
                Categoría: {cat.nombre}
              </div>
              <div className="divide-y divide-slate-100">
                {(cat.preguntas || []).map((p, qIdx) => (
                  <div key={qIdx} className="p-8 space-y-6">
                    <p className="text-xl font-bold text-slate-800">{p}</p>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                        {['SI', 'NO', 'S.I.'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleOptionChange(qIdx, catIdx, opt, p, cat.nombre)}
                            className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${
                              respuestas[`${catIdx}-${qIdx}`]?.opcion === opt 
                              ? 'bg-blue-600 text-white shadow-lg scale-105' 
                              : 'text-slate-400'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <input 
                        className="flex-1 p-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-400 outline-none italic text-slate-500"
                        placeholder="Detalle adicional..."
                        onChange={(e) => handleCommentChange(qIdx, catIdx, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {questions.length > 0 && !reporte && (
          <button 
            onClick={handleGenerateACR} 
            disabled={loading}
            className="w-full bg-emerald-600 text-white p-8 rounded-[32px] font-black text-2xl shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-4"
          >
            <ClipboardCheck size={36} /> {loading ? "GENERANDO..." : "GENERAR REPORTE FINAL"}
          </button>
        )}

        {reporte && (
          <section id="reporte-final" className="bg-white rounded-[40px] shadow-2xl border-t-8 border-emerald-500 overflow-hidden animate-in zoom-in duration-500 p-10 space-y-10">
            <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
              <ClipboardCheck size={40} className="text-emerald-500" /> Informe ACR
            </h2>
            <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl">
              {Object.entries(reporte.analisis_6m || {}).map(([key, val]) => (
                <div key={key} className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-blue-600 uppercase">{key}</span>
                  <p className="text-sm text-slate-600 mt-1">{val}</p>
                </div>
              ))}
            </div>
            <div className="p-8 bg-amber-50 border-2 border-amber-100 rounded-3xl">
              <h3 className="font-black text-amber-900 flex items-center gap-2 mb-2 uppercase italic">
                <Info size={24} /> Hipótesis
              </h3>
              <p className="text-amber-900 font-bold text-lg">{reporte.hipotesis}</p>
            </div>
            <div className="p-8 bg-blue-900 text-white rounded-[32px] shadow-2xl">
              <h3 className="text-2xl font-black mb-4 uppercase flex items-center gap-3">
                 <Briefcase size={28} className="text-blue-400" /> Solución
              </h3>
              <p className="text-blue-100 leading-relaxed font-medium text-lg italic">{reporte.solucion_profesional}</p>
            </div>
          </section>
        )}
      </main>

      <footer className="text-center p-10 text-slate-400 text-xs font-bold border-t border-slate-200 mt-20">
        POWERED BY IA 6M • 2026
      </footer>
    </div>
  );
}

export default App;
