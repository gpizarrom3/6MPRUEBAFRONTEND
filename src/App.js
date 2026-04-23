import React, { useState } from 'react';
import { FileText, Activity, ClipboardCheck, Briefcase, Info } from 'lucide-react';

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
          systemPrompt: `Eres un Consultor Senior de Mantenimiento. Tu objetivo es captar la problemática del cliente de forma preliminar.
          REGLAS PARA LAS PREGUNTAS:
          1. Genera una auditoría basada estrictamente en las 6M (Maquinaria, Mano de Obra, Métodos, Materiales, Medición, Medio Ambiente).
          2. Las preguntas deben ser CUALITATIVAS (ej: "¿Se percibe olor a quemado?", "¿El ruido es constante?", "¿El personal ha notado cambios?").
          3. PROHIBIDO pedir datos duros (serial, modelo, medidas exactas, fechas de manual). 
          4. Solo 3 preguntas por categoría.
          Responde ÚNICAMENTE en JSON: { "categorias": [ { "nombre": "...", "preguntas": ["..."] } ] }`
        })
      });
      const data = await response.json();
      setQuestions(data.categorias || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (qIdx, catIdx, valor, pregunta, categoria) => {
    const id = `${catIdx}-${qIdx}`;
    setRespuestas(prev => ({
      ...prev,
      [id]: { ...prev[id], opcion: valor, pregunta, categoria }
    }));
  };

  const handleCommentChange = (qIdx, catIdx, texto) => {
    const id = `${catIdx}-${qIdx}`;
    setRespuestas(prev => ({
      ...prev,
      [id]: { ...prev[id], comentario: texto }
    }));
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const promptACR = `SÍNTOMA: ${sintomas}. CONTEXTO: ${contexto}. RESPUESTAS: ${JSON.stringify(respuestas)}`;
      
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptACR,
          systemPrompt: `Eres un Experto en Confiabilidad Industrial. Analiza los síntomas y las respuestas de la auditoría 6M.
          ESTRUCTURA JSON REQUERIDA:
          {
            "resumen_general": "Descripción breve del caso.",
            "analisis_6m": { "Maquinaria": "...", "Mano_Obra": "...", "Metodos": "...", "Materiales": "...", "Medicion": "...", "Medio_Ambiente": "..." },
            "hipotesis": "Cuál crees que es el problema real basado en el síntoma.",
            "conclusiones_generales": "Hallazgos principales de la reunión.",
            "recomendacion_comercial": "Solución propuesta enfocada a que el cliente entienda que necesita contratarnos para ejecutar la solución definitiva."
          }`
        })
      });
      const data = await response.json();
      setReporte(data);
      window.scrollTo(0, document.body.scrollHeight);
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
          <h1 className="text-2xl font-bold uppercase tracking-tight">Consultoría Técnica Preliminar 6M</h1>
        </header>

        <main className="bg-white p-6 rounded-b-xl shadow-md space-y-6">
          <section className="grid gap-4 bg-slate-50 p-4 rounded-lg border">
            <div>
              <label className="block text-sm font-black text-blue-900 mb-1">DÓNDE ES EL PROBLEMA (CONTEXTO):</label>
              <input className="w-full p-3 border rounded shadow-sm" value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Ej: Planta de alimentos, Línea de envasado..." />
            </div>
            <div>
              <label className="block text-sm font-black text-blue-900 mb-1">¿QUÉ SUCEDE? (SÍNTOMA):</label>
              <textarea className="w-full p-3 border rounded shadow-sm h-24" value={sintomas} onChange={(e) => setSintomas(e.target.value)} placeholder="Ej: La cinta transportadora se detiene de forma intermitente con ruido metálico..." />
            </div>
            <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-blue-700 text-white p-4 rounded-xl font-black hover:bg-blue-800 transition-all">
              {loading ? "INICIANDO CONSULTORÍA..." : "IDENTIFICAR PUNTOS CRÍTICOS (6M)"}
            </button>
          </section>

          <section className="space-y-8">
            {questions.map((cat, catIdx) => (
              <div key={catIdx} className="border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-800 text-white p-3 font-bold uppercase tracking-widest text-center">
                  {cat.nombre}
                </div>
                <div className="divide-y">
                  {(cat.preguntas || []).map((p, qIdx) => (
                    <div key={qIdx} className="p-4 bg-white space-y-3">
                      <p className="font-semibold text-slate-800">{p}</p>
                      <div className="flex flex-wrap gap-2">
                        {['SI', 'NO', 'S.I.'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleOptionChange(qIdx, catIdx, opt, p, cat.nombre)}
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
                        placeholder="Observaciones del cliente..."
                        onChange={(e) => handleCommentChange(qIdx, catIdx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {questions.length > 0 && !reporte && (
            <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-green-600 text-white p-5 rounded-xl font-black text-xl shadow-xl hover:bg-green-700 mt-10 flex items-center justify-center gap-3">
              <ClipboardCheck size={28} /> {loading ? "ANALIZANDO CAUSA RAÍZ..." : "GENERAR INFORME PRELIMINAR"}
            </button>
          )}

          {reporte && (
            <section className="mt-10 p-8 bg-white border-2 border-green-500 rounded-3xl shadow-2xl space-y-6">
              <h2 className="text-3xl font-black text-green-900 border-b-4 border-green-500 pb-2 flex items-center gap-2">
                <ClipboardCheck size={36} /> REPORTE ACR PRELIMINAR
              </h2>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-bold text-slate-700 uppercase text-sm mb-1">Resumen del Diagnóstico:</h3>
                <p className="text-slate-700">{reporte.resumen_general}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(reporte.analisis_6m || {}).map(([key, val]) => (
                  <div key={key} className="p-3 border-l-4 border-blue-900 bg-slate-50 rounded-r-lg">
                    <h4 className="font-black text-blue-900 text-xs uppercase">{key}</h4>
                    <p className="text-sm text-slate-600 italic">{val}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <h3 className="font-black text-amber-900 flex items-center gap-2"><Info size={20}/> HIPÓTESIS TÉCNICA:</h3>
                <p className="mt-2 text-amber-800 leading-relaxed font-medium">{reporte.hipotesis}</p>
              </div>

              <div className="p-5 bg-white border border-slate-200 rounded-xl">
                <h3 className="font-black text-slate-900 mb-2">CONCLUSIONES GENERALES:</h3>
                <p className="text-slate-700">{reporte.conclusiones_generales}</p>
              </div>

              <div className="p-6 bg-blue-900 text-white rounded-2xl shadow-xl border-b-8 border-blue-700">
                <h3 className="font-black text-xl mb-3 flex items-center gap-2">
                  <Briefcase /> SOLUCIÓN Y PROPUESTA PROFESIONAL:
                </h3>
                <p className="text-blue-50 leading-relaxed italic">
                  {reporte.recomendacion_comercial}
                </p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
