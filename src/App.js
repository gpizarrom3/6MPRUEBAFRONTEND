import React, { useState } from 'react';
import { FileText, Activity, ClipboardCheck, Briefcase } from 'lucide-react';

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
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `SÍNTOMAS: ${sintomas}. CONTEXTO: ${contexto}.`,
          systemPrompt: `Eres un Consultor Senior de Mantenimiento. Genera una auditoría 6M preliminar.
          REGLAS:
          1. Preguntas 100% relacionadas al síntoma indicado.
          2. PROHIBIDO pedir datos duros (medidas exactas, fechas, modelos, seriales).
          3. Las preguntas deben ser cualitativas y observables (ej: ¿Se escuchan ruidos?, ¿Hay manchas de aceite?, ¿El personal ha notado cambios?).
          Responde ÚNICAMENTE en JSON: { "categorias": [ { "nombre": "...", "preguntas": ["..."] } ] }`
        })
      });
      const data = await response.json();
      setQuestions(data.categorias || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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
          systemPrompt: `Eres un Ingeniero Experto en Confiabilidad. Genera un Informe ACR Preliminar.
          ESTRUCTURA JSON REQUERIDA:
          {
            "resumen_general": "Resumen del caso",
            "analisis_6m": { "maquinaria": "...", "mano_obra": "...", "metodos": "...", "materiales": "...", "medicion": "...", "medio_ambiente": "..." },
            "hipotesis": "Hipótesis técnica de la falla",
            "conclusiones": "Conclusión de hallazgos",
            "recomendacion_comercial": "Solución propuesta + invitación a contratarnos para el servicio definitivo"
          }`
        })
      });
      const data = await response.json();
      setReporte(data);
    } catch (error) {
      alert("Error en el reporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-blue-900 text-white p-6 rounded-xl shadow-lg flex items-center gap-3">
          <Briefcase size={32} />
          <h1 className="text-2xl font-bold uppercase">Auditoría Técnica Preliminar</h1>
        </header>

        <section className="bg-white p-6 rounded-xl shadow-md border space-y-4">
          <input className="w-full p-3 border rounded" value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="¿Dónde nos encontramos? (Planta, Equipo...)" />
          <textarea className="w-full p-3 border rounded h-24" value={sintomas} onChange={(e) => setSintomas(e.target.value)} placeholder="¿Qué síntomas presenta el equipo?" />
          <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-blue-700 text-white p-4 rounded-xl font-bold">
            {loading ? "ANALIZANDO..." : "INICIAR AUDITORÍA 6M"}
          </button>
        </section>

        {/* PREGUNTAS 6M */}
        <div className="space-y-4">
          {questions.map((cat, catIdx) => (
            <div key={catIdx} className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-800 text-white p-2 text-sm font-bold text-center">{cat.nombre}</div>
              {cat.preguntas.map((p, qIdx) => (
                <div key={qIdx} className="p-4 border-b last:border-0">
                  <p className="text-slate-800 font-medium mb-3">{p}</p>
                  <div className="flex gap-2">
                    {['SI', 'NO', 'S.I.'].map(opt => (
                      <button key={opt} onClick={() => setRespuestas({...respuestas, [`${catIdx}-${qIdx}`]: {...respuestas[`${catIdx}-${qIdx}`], opcion: opt, pregunta: p, categoria: cat.nombre}})}
                        className={`px-3 py-1 rounded border text-xs font-bold ${respuestas[`${catIdx}-${qIdx}`]?.opcion === opt ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {questions.length > 0 && !reporte && (
          <button onClick={handleGenerateACR} disabled={loading} className="w-full bg-green-600 text-white p-5 rounded-xl font-black shadow-lg">
            GENERAR INFORME ACR PROFESIONAL
          </button>
        )}

        {/* INFORME ACR COMPLETO */}
        {reporte && (
          <div className="bg-white p-8 rounded-2xl shadow-2xl border-t-8 border-green-500 space-y-6">
            <h2 className="text-2xl font-black text-green-800 border-b pb-2 flex items-center gap-2">
              <ClipboardCheck /> REPORTE DE CAUSA RAÍZ (PRELIMINAR)
            </h2>
            
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-bold text-slate-700">RESUMEN GENERAL:</h3>
              <p className="text-slate-600">{reporte.resumen_general}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(reporte.analisis_6m || {}).map(([key, val]) => (
                <div key={key} className="p-3 bg-white border rounded shadow-sm">
                  <span className="text-xs font-black text-blue-700 uppercase">{key}</span>
                  <p className="text-sm text-slate-600">{val}</p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-amber-50 border-l-4 border-amber-400">
              <h3 className="font-bold text-amber-800">HIPÓTESIS DEL PROBLEMA:</h3>
              <p className="text-amber-900">{reporte.hipotesis}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-700">CONCLUSIONES:</h3>
              <p className="text-slate-600">{reporte.conclusiones}</p>
            </div>

            <div className="p-6 bg-blue-900 text-white rounded-xl shadow-xl">
              <h3 className="font-bold mb-2 flex items-center gap-2"><Briefcase /> RECOMENDACIÓN Y SOLUCIÓN PROFESIONAL:</h3>
              <p className="italic text-blue-100">{reporte.recomendacion_comercial}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
