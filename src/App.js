import React, { useState } from 'react';
import { FileText, Activity, AlertCircle } from 'lucide-react';

function App() {
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);

  const handleGenerateEntrevista = async () => {
    setLoading(true);
    setQuestions([]); 
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
      console.log("DATOS RECIBIDOS:", data);

      // --- LÓGICA DE DETECCIÓN AUTOMÁTICA ---
      // Buscamos dentro del objeto 'data' cualquier cosa que parezca una lista
      const listaExtraida = data.categorias || data.categories || data.preguntas || data.audit || (Array.isArray(data) ? data : []);
      
      if (listaExtraida.length > 0) {
        setQuestions(listaExtraida);
        console.log("Estado 'questions' actualizado con:", listaExtraida);
      } else {
        console.error("No se encontró una lista válida en el JSON");
      }

    } catch (error) {
      console.error("Error en el proceso:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-3xl mx-auto">
        <header className="bg-blue-900 text-white p-6 rounded-t-xl shadow-lg">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity /> Auditoría 6M Pro
          </h1>
        </header>

        <main className="bg-white p-6 rounded-b-xl shadow-md space-y-4">
          <section className="space-y-2">
            <label className="font-bold text-gray-700">Contexto de la planta:</label>
            <input 
              className="w-full p-2 border rounded"
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder="Ej: Planta de vapor, caldera 2..."
            />
            <label className="font-bold text-gray-700">Síntoma observado:</label>
            <textarea 
              className="w-full p-2 border rounded h-24"
              value={sintomas}
              onChange={(e) => setSintomas(e.target.value)}
              placeholder="Describe el ruido, vibración o falla..."
            />
            <button 
              onClick={handleGenerateEntrevista}
              disabled={loading}
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700"
            >
              {loading ? "PROCESANDO..." : "GENERAR AUDITORÍA 6M"}
            </button>
          </section>

          {/* ESTA ES LA PARTE QUE MUESTRA LAS PREGUNTAS */}
          <section className="mt-8 space-y-6">
            {questions.length > 0 ? (
              questions.map((cat, idx) => (
                <div key={idx} className="border-l-4 border-blue-600 pl-4 py-2 bg-blue-50 rounded-r-lg">
                  <h2 className="font-black text-blue-900 uppercase tracking-wider mb-3">
                    {cat.nombre || cat.categoria || cat.name || "CATEGORÍA"}
                  </h2>
                  <div className="space-y-2">
                    {(cat.preguntas || cat.questions || []).map((p, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-3 bg-white p-2 rounded shadow-sm">
                        <input type="checkbox" className="w-5 h-5" />
                        <span className="text-gray-800">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              !loading && (
                <div className="text-center p-10 text-gray-400 border-2 border-dashed rounded-xl">
                  <FileText className="mx-auto mb-2" size={48} />
                  <p>Las preguntas aparecerán aquí después de generar la auditoría.</p>
                </div>
              )
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
