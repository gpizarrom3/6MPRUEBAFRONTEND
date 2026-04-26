// ... (Tus imports se mantienen igual)

// --- DENTRO DE LA FUNCIÓN handleGenerateEntrevista ---
const handleGenerateEntrevista = async () => {
  setLoading(true);
  setQuestions([]); // Limpiamos preguntas anteriores
  setReporte(null);
  setRespuestas({});
  try {
    const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `SÍNTOMA: ${sintomas}. CONTEXTO: ${contexto}.`
        // Nota: El systemPrompt ahora ya está configurado en tu server.js, así que es más limpio
      })
    });
    const data = await response.json();
    
    // CAMBIO CLAVE AQUÍ: Usamos data.preguntas porque así lo configuramos en el server.js
    if (data.preguntas) {
      setQuestions(data.preguntas);
    } else {
      console.error("El servidor no envió 'preguntas'", data);
    }
  } catch (error) { 
    console.error("Error al llamar a la IA:", error); 
  } finally { 
    setLoading(false); 
  }
};

// --- DENTRO DEL RETURN (Abajo de los inputs) ---
// Busca donde dice {/* (No olvides incluir el mapeo de questions...) */} y pega esto:

{questions.length > 0 && (
  <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center gap-2 text-blue-900 mb-4">
      <ClipboardCheck size={28} />
      <h3 className="text-2xl font-black">Auditoría 6M en curso</h3>
    </div>
    
    <div className="grid gap-4">
      {questions.map((q, index) => (
        <div key={index} className="bg-white p-6 rounded-2xl shadow-md border border-slate-100">
          <p className="font-bold text-slate-800 mb-3">{q}</p>
          <input 
            className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Escribe tu respuesta aquí..."
            onChange={(e) => setRespuestas({...respuestas, [index]: e.target.value})}
          />
        </div>
      ))}
    </div>

    <button 
      onClick={handleGenerateACR}
      disabled={loading}
      className="w-full bg-green-600 hover:bg-green-700 text-white p-5 rounded-2xl font-black text-xl shadow-lg transition-all"
    >
      {loading ? "PROCESANDO ACR..." : "GENERAR REPORTE FINAL"}
    </button>
  </section>
)}

{/* MOSTRAR REPORTE FINAL SI EXISTE */}
{reporte && (
  <section className="bg-blue-900 text-white p-8 rounded-[40px] shadow-2xl space-y-6">
    <h3 className="text-3xl font-black flex items-center gap-3">
      <Info /> Diagnóstico Final
    </h3>
    <div className="prose prose-invert max-w-none">
      <pre className="whitespace-pre-wrap font-sans text-lg leading-relaxed">
        {JSON.stringify(reporte, null, 2)}
      </pre>
    </div>
  </section>
)}
