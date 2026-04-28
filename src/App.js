// ... (Importaciones iniciales iguales)

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Complete los campos.");
    setLoading(true);
    setCategorias([]);
    setReporte(null);

    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `SÍNTOMA: ${sintomas}. CONTEXTO: ${contexto}` })
      });
      
      const d = await res.json();
      console.log("DATOS RECIBIDOS:", d);

      // --- ESTRATEGIA DE EXTRACCIÓN MAESTRA ---
      // Buscamos cualquier propiedad que sea una lista (array)
      let listaEncontrada = [];
      
      if (d.categorias && Array.isArray(d.categorias)) {
        listaEncontrada = d.categorias;
      } else if (d.categories && Array.isArray(d.categories)) {
        listaEncontrada = d.categories;
      } else {
        // Si la IA mandó el array suelto o bajo otro nombre, lo buscamos
        const key = Object.keys(d).find(k => Array.isArray(d[k]));
        if (key) listaEncontrada = d[key];
      }

      if (listaEncontrada.length > 0) {
        setCategorias(listaEncontrada);
      } else {
        alert("La IA respondió pero no encontramos las preguntas. Revise la consola.");
      }

    } catch (e) {
      alert("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

// ... (En el render, asegúrate de usar nombres genéricos para las preguntas)

// Dentro de tu return, donde mapeas las categorías:
{categorias.map((cat, idx) => (
  <div key={idx} className="bg-white p-8 rounded-3xl border mb-6 shadow-sm">
    <h4 className="font-black text-cyan-600 uppercase text-xs mb-4">
      {cat.nombre || cat.category || "Categoría"}
    </h4>
    {(cat.preguntas || cat.questions || []).map((pre, pIdx) => (
      <div key={pIdx} className="mb-4">
        <p className="font-bold text-slate-700 mb-2">{pre.texto || pre.question || pre}</p>
        <input 
          onChange={(e) => setRespuestas({...respuestas, [`${idx}-${pIdx}`]: e.target.value})}
          className="w-full p-3 bg-slate-50 rounded-lg ring-1 ring-slate-200 border-none"
          placeholder="Respuesta técnica..."
        />
      </div>
    ))}
  </div>
))}
