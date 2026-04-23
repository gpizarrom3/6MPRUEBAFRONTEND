import React, { useState } from 'react';
import { Mic, MicOff, Send, FileText, CheckCircle2 } from 'lucide-react';

function App() {
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]); // Aquí se guardan las preguntas

  const handleGenerateEntrevista = async () => {
    setLoading(true);
    setQuestions([]); // Limpiamos antes de empezar
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analiza este síntoma: "${sintomas}". Contexto: "${contexto}".`,
          systemPrompt: "Actúa como experto en mantenimiento industrial. Genera una auditoría 6M. RESPONDE ÚNICAMENTE EN FORMATO JSON con esta estructura exacta: { \"categorias\": [ { \"nombre\": \"MAQUINARIA\", \"preguntas\": [\"¿Pregunta 1?\", \"¿Pregunta 2?\"] } ] }"
        })
      });

      const data = await response.json();
      console.log("Datos recibidos:", data);

      // --- EL PUENTE ---
      // Verificamos si la IA usó 'categorias' o 'categories'
      const rawQuestions = data.categorias || data.categories || [];
      setQuestions(rawQuestions);

    } catch (error) {
      console.error("Error al procesar:", error);
      alert("La IA respondió pero hubo un problema al mostrar las preguntas. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans">
      <header className="bg-blue-900 text-white p-6 rounded-xl shadow-lg mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText /> Auditoría de Campo 6M - IA
        </h1>
      </header>

      <main className="max-w-4xl mx-auto grid gap-6">
        {/* Entrada de Datos */}
        <section className="bg-white p-6 rounded-xl shadow-md">
          <label className="block text-sm font-bold mb-2">Contexto de la Visita:</label>
          <input 
            className="w-full p-2 border rounded mb-4"
            placeholder="Ej: Planta de Celulosa, Línea 3..."
            value={contexto}
            onChange={(e) => setContexto(e.target.setContexto)}
          />
          
          <label className="block text-sm font-bold mb-2">Síntomas detectados (Voz o Texto):</label>
          <textarea 
            className="w-full p-2 border rounded h-24 mb-4"
            value={sintomas}
            onChange={(e) => setSintomas(e.target.value)}
          />

          <button 
            onClick={handleGenerateEntrevista}
            disabled={loading}
            className="w-full bg-black text-white p-4 rounded-lg font-bold hover:bg-gray-800 transition-colors"
          >
            {loading ? "GENERANDO AUDITORÍA..." : "GENERAR ENTREVISTA DE CAMPO"}
          </button>
        </section>

        {/* Mapeo de Preguntas en Pantalla */}
        <section className="grid gap-4">
          {questions.length > 0 ? (
            questions.map((cat, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                <h3 className="text-lg font-bold text-blue-900 mb-4 uppercase">{cat.nombre || cat.category}</h3>
                <div className="space-y-3">
                  {cat.preguntas && cat.preguntas.map((p, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded">
                      <input type="checkbox" className="mt-1 h-5 w-5" />
                      <p className="text-gray-700">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            !loading && <p className="text-center text-gray-500 italic">No hay preguntas generadas aún.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
