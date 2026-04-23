import React, { useState } from 'react';
import { FileText, Activity } from 'lucide-react';

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
      
      // AQUÍ ES DONDE VEÍAS LAS PREGUNTAS EN LA CONSOLA
      console.log("DATOS RECIBIDOS:", data);

      // Lógica para intentar capturar las preguntas
      const listaExtraida = data.categorias || data.categories || data.preguntas || [];
      setQuestions(listaExtraida);

    } catch (error) {
      console.error("Error en el proceso:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-3xl mx-auto">
        <header className="bg-blue-900 text-white p-6 rounded-t-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Activity /> Auditoría 6M Pro
          </h1>
        </header>

        <main className="bg-white p-6 rounded-b-xl shadow-md space-y-4">
          <label className="font-bold text-gray-700">Contexto:</label>
          <input className="w-full p-2 border rounded" value={contexto} onChange={(e) => setContexto(e.target.value)} />
          
          <label className="font-bold text-gray-700">Síntoma:</label>
          <textarea className="w-full p-2 border rounded h-24" value={sintomas} onChange={(e) => setSintomas(e.target.value)} />
          
          <button 
            onClick={handleGenerateEntrevista}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold"
          >
            {loading ? "PROCESANDO..." : "GENERAR AUDITORÍA"}
          </button>

          <section className="mt-8">
            {questions.length > 0 ? (
              questions.map((cat, idx) => (
                <div key={idx} className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-600">
                  <h2 className="font-bold text-blue-900 uppercase">{cat.nombre || "Categoría"}</h2>
                  <div className="mt-2">
                    {(cat.preguntas || []).map((p, pIdx) => (
                      <div key={pIdx} className="flex gap-2 mb-1">
                        <input type="checkbox" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              !loading && <p className="text-gray-400 text-center">Las preguntas aparecerán aquí.</p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
