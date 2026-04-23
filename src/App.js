import React, { useState } from 'react';
import { FileText, Activity, ClipboardCheck, Send } from 'lucide-react';

function App() {
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [respuestas, setRespuestas] = useState({}); // Para guardar SI/NO y comentarios
  const [reporte, setReporte] = useState(null); // Para el Informe ACR final

  // 1. Generar la Auditoría (Lo que ya te funciona)
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
          prompt: `Analiza: ${sintomas}. Contexto: ${contexto}`,
          systemPrompt: "Genera una auditoría 6M en JSON: { \"categorias\": [ { \"nombre\": \"...\", \"preguntas\": [\"...\"] } ] }"
        })
      });
      const data = await response.json();
      const listaExtraida = data.categorias || data.categories || data.preguntas || [];
      setQuestions(listaExtraida);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Manejar las respuestas (SI, NO, S.I. y Texto)
  const handleOptionChange = (qIdx, catIdx, valor) => {
    const id = `${catIdx}-${qIdx}`;
    setRespuestas(prev => ({
      ...prev,
      [id]: { ...prev[id], opcion: valor }
    }));
  };

  const handleCommentChange = (qIdx, catIdx, texto) => {
    const id = `${catIdx}-${qIdx}`;
    setRespuestas(prev => ({
      ...prev,
      [id]: { ...prev[id], comentario: texto }
    }));
  };

  // 3. Generar Informe ACR (La parte final)
  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const promptACR = `Basado en estas respuestas de auditoría: ${JSON.stringify(respuestas)}, genera un informe ACR (Análisis de Causa Raíz) con conclusiones y recomendaciones técnicas.`;
      
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptACR,
          systemPrompt: "Genera un informe técnico estructurado en JSON: { \"conclusion\": \"...\", \"recomendaciones\": [\"...\", \"...\"] }"
        })
      });
      const data = await response.json();
      setReporte(data);
      window.scrollTo(0, document.body.scrollHeight); // Bajar al reporte
    } catch (error) {
      alert("Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <header className="bg-blue-900 text-white p-6 rounded-t-xl shadow-lg flex items-center gap-3">
          <Activity size={32} />
          <h1 className="text-2xl font-bold uppercase tracking-tight">Auditoría Industrial 6M</h1>
        </header>

        <main className="bg-white p-6 rounded-b-xl shadow-md space-y-6">
          {/* SECCIÓN DE ENTRADA */}
          <section className="grid gap-4 bg-slate-50 p-4 rounded-lg border">
            <div>
              <label className="block text-sm font-black text-blue-900 mb-1">CONTEXTO:</label>
              <input className="w-full p-3 border rounded shadow-sm" value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Ej: Planta Térmica, Caldera N°2..." />
            </div>
            <div>
              <label className="block text-sm font-black text-blue-900 mb-1">SÍNTOMA DETECTADO:</label>
              <textarea className="w-full p-3 border rounded shadow-sm h-24" value={sintomas} onChange={(e) => setSintomas(e.target.value)} placeholder="Ej: Vibración excesiva en el rodamiento lado acople..." />
            </div>
            <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-blue-700 text-white p-4 rounded-xl font-black hover:bg-blue-800 transition-all">
              {loading ? "PROCESANDO CON Gemini 2.5..." : "GENERAR ENTREVISTA DE CAMPO"}
            </button>
          </section>

          {/* LISTADO DE PREGUNTAS 6M */}
          <section className="space-y-8">
            {questions.map((cat, catIdx) => (
              <div key={catIdx} className="border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-800 text-white p-3 font-bold uppercase tracking-widest text-center">
                  {cat.nombre || cat.categoria}
                </div>
                <div className="divide-y">
                  {(cat.preguntas || []).map((p, qIdx) => (
                    <div key={qIdx} className="p-4 bg-white space-y-3">
                      <p className="font-semibold text-slate-800">{p}</p>
                      <div className="flex flex-wrap gap-2">
                        {['SI', 'NO', 'S.I.'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleOptionChange(qIdx, catIdx, opt)}
                            className={`px-4 py-2 rounded-md font-bold text-xs transition-all ${
                              respuestas[`${catIdx}-${qIdx}`]?.opcion === opt 
                              ? 'bg-blue-600 text-white shadow-inner' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="w-full p-2 text-sm border rounded bg-slate-50"
                        placeholder="Observaciones adicionales..."
                        onChange={(e) => handleCommentChange(qIdx, catIdx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* BOTÓN REPORTE ACR */}
          {questions.length > 0 && !reporte && (
            <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-green-600 text-white p-5 rounded-xl font-black text-xl shadow-xl hover:bg-green-700 mt-10 flex items-center justify-center gap-3">
              <ClipboardCheck size={28} /> {loading ? "GENERANDO INFORME..." : "GENERAR INFORME ACR FINAL"}
            </button>
          )}

          {/* RESULTADO INFORME ACR */}
          {reporte && (
            <section className="mt-10 p-6 bg-green-50 border-2 border-green-200 rounded-2xl shadow-inner animate-pulse-once">
              <h2 className="text-2xl font-black text-green-900 mb-4 flex items-center gap-2">
                <ClipboardCheck /> RESULTADO DEL ANÁLISIS (ACR)
              </h2>
              <div className="bg-white p-4 rounded-lg border border-green-100 mb-4">
                <h3 className="font-bold text-green-800 mb-2">CONCLUSIÓN TÉCNICA:</h3>
                <p className="text-slate-700 leading-relaxed">{reporte.conclusion}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-100">
                <h3 className="font-bold text-green-800 mb-2">RECOMENDACIONES:</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-700">
                  {reporte.recomendaciones?.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
