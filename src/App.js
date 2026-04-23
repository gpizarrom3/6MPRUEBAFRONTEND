import React, { useState } from 'react';
import { FileText, Activity, ClipboardCheck, Briefcase, Info } from 'lucide-react';

function App() {
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);

  // 1. Generar la Auditoría (Preguntas cualitativas de preventa)
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
          systemPrompt: `Eres un Consultor Senior de Mantenimiento experto en metodología 6M (Ishikawa). 
          Genera una auditoría preliminar para una primera reunión.
          REGLAS:
          1. Preguntas 100% relacionadas al síntoma y contexto.
          2. PROHIBIDO pedir datos duros (medidas, seriales, fechas exactas).
          3. Las preguntas deben ser CUALITATIVAS (ej: "¿Se percibe vibración al tacto?", "¿El personal ha reportado ruidos?", "¿Se ve fuga de fluidos?").
          4. Estructura: 3 preguntas por cada una de las 6M (Maquinaria, Mano de Obra, Métodos, Materiales, Medición, Medio Ambiente).
          Responde ÚNICAMENTE en JSON: { "categorias": [ { "nombre": "...", "preguntas": ["..."] } ] }`
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

  const handleOptionChange = (qIdx, catIdx, valor) => {
    const id = `${catIdx}-${qIdx}`;
    setRespuestas(prev => ({ ...prev, [id]: { ...prev[id], opcion: valor } }));
  };

  const handleCommentChange = (qIdx, catIdx, texto) => {
    const id = `${catIdx}-${qIdx}`;
    setRespuestas(prev => ({ ...prev, [id]: { ...prev[id], comentario: texto } }));
  };

  // 2. Generar Informe ACR (Enfoque 6M y Comercial)
  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const promptACR = `SÍNTOMA INICIAL: ${sintomas}. RESPUESTAS AUDITORÍA: ${JSON.stringify(respuestas)}`;
      
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptACR,
          systemPrompt: `Eres un experto en Análisis de Causa Raíz (ACR). Analiza los datos de la auditoría 6M.
          ESTRUCTURA DE RESPUESTA (JSON PURO):
          {
            "resumen": "Resumen técnico de la situación.",
            "analisis_6m": { "Maquinaria": "...", "Mano_Obra": "...", "Metodos": "...", "Materiales": "...", "Medicion": "...", "Medio_Ambiente": "..." },
            "hipotesis": "Hipótesis principal del fallo.",
            "conclusiones": "Conclusión técnica general.",
            "solucion_profesional": "Explicación de la solución necesaria y por qué es vital contratarnos para ejecutar el servicio definitivo."
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
          <h1 className="text-2xl font-bold uppercase tracking-tight">Auditoría Industrial 6M</h1>
        </header>

        <main className="bg-white p-6 rounded-b-xl shadow-md space-y-6">
          <section className="grid gap-4 bg-slate-50 p-4 rounded-lg border">
            <div>
              <label className="block text-sm font-black text-blue-900 mb-1 uppercase">Contexto:</label>
              <input className="w-full p-3 border rounded shadow-sm" value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Ej: Planta de Procesos, Motor de Inducción..." />
            </div>
            <div>
              <label className="block text-sm font-black text-blue-900 mb-1 uppercase">Síntoma Detectado:</label>
              <textarea className="w-full p-3 border rounded shadow-sm h-24" value={sintomas} onChange={(e) => setSintomas(e.target.value)} placeholder="Ej: Ruido intermitente y aumento de temperatura..." />
            </div>
            <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-blue-700 text-white p-4 rounded-xl font-black hover:bg-blue-800">
              {loading ? "PROCESANDO..." : "INICIAR AUDITORÍA PRELIMINAR"}
            </button>
          </section>

          <section className="space-y-8">
            {questions.map((cat, catIdx) => (
              <div key={catIdx} className="border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-800 text-white p-3 font-bold uppercase text-center">{cat.nombre}</div>
                <div className="divide-y">
                  {(cat.preguntas || []).map((p, qIdx) => (
                    <div key={qIdx} className="p-4 bg-white space-y-3">
                      <p className="font-semibold text-slate-800">{p}</p>
                      <div className="flex flex-wrap gap-2">
                        {['SI', 'NO', 'S.I.'].map((opt) => (
                          <button key={opt} onClick={() => handleOptionChange(qIdx, catIdx, opt)}
                            className={`px-4 py-2 rounded-md font-bold text-xs transition-all ${respuestas[`${catIdx}-${qIdx}`]?.opcion === opt ? 'bg-blue-600 text-white shadow-inner' : 'bg-slate-100 text-slate-500'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                      <textarea className="w-full p-2 text-sm border rounded bg-slate-50" placeholder="Observaciones del cliente..." onChange={(e) => handleCommentChange(qIdx, catIdx, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {questions.length > 0 && !reporte && (
            <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-green-600 text-white p-5 rounded-xl font-black text-xl shadow-xl hover:bg-green-700 mt-10 flex items-center justify-center gap-3">
              <ClipboardCheck size={28} /> {loading ? "GENERANDO INFORME..." : "GENERAR INFORME ACR PROFESIONAL"}
            </button>
          )}

          {reporte && (
            <section className="mt-10 p-8 bg-white border-2 border-green-500 rounded-3xl shadow-2xl space-y-6">
              <h2 className="text-3xl font-black text-green-900 border-b-4 border-green-500 pb-2 flex items-center gap-2 uppercase">
                <ClipboardCheck size={36} /> Informe ACR Preliminar
              </h2>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-bold text-slate-700 uppercase text-xs mb-2">Resumen General:</h3>
                <p className="text-slate-700 italic">{reporte.resumen}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(reporte.analisis_6m || {}).map(([key, val]) => (
                  <div key={key} className="p-3 border-l-4 border-blue-900 bg-slate-50 rounded-r-lg">
                    <h4 className="font-black text-blue-900 text-xs uppercase">{key}</h4>
                    <p className="text-sm text-slate-600 leading-tight">{val}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <h3 className="font-black text-amber-900 flex items-center gap-2 uppercase"><Info size={20}/> Hipótesis Técnica:</h3>
                <p className="mt-2 text-amber-900 leading-relaxed font-medium">{reporte.hipotesis}</p>
              </div>

              <div className="p-5 border border-slate-200 rounded-xl">
                <h3 className="font-black text-slate-800 mb-2 uppercase text-sm">Conclusiones:</h3>
                <p className="text-slate-700">{reporte.conclusiones}</p>
              </div>

              <div className="p-6 bg-blue-900 text-white rounded-2xl shadow-xl border-b-8 border-blue-700">
                <h3 className="font-black text-xl mb-3 flex items-center gap-2 uppercase">
                  <Briefcase /> Propuesta de Servicio Profesional:
                </h3>
                <p className="text-blue-50 leading-relaxed italic font-medium">
                  {reporte.solucion_profesional}
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
