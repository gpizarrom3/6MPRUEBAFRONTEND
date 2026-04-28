// --- SUSTITUYE TUS FUNCIONES DE GENERACIÓN POR ESTAS QUE TIENEN CONTROL DE ERRORES ---

  const handleGenerateEntrevista = async () => {
    if (!sintomas || !contexto) return alert("Por favor, completa los campos.");
    setLoading(true);
    setCategorias([]);
    setReporte(null);
    setAntecedenteEncontrado(null);

    // Normalización de búsqueda de antecedentes
    const norm = (t) => t ? t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const pals = norm(sintomas).split(/\s+/).filter(p => p.length > 4);
    const coinc = incidencias.find(i => i.estado === 'resuelto' && pals.some(p => norm(`${i.titulo} ${i.descripcion}`).includes(p)));
    
    let promptFinal = `CONTEXTO: ${contexto}. SÍNTOMA: ${sintomas}.`;
    if (coinc) {
      setAntecedenteEncontrado(coinc);
      promptFinal = `[REF. HISTÓRICA]: Solución previa: "${coinc.solucion_final}". ${promptFinal}`;
    }

    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptFinal })
      });

      // Si el servidor tira error 500
      if (!response.ok) {
        throw new Error(`Error del servidor (${response.status})`);
      }

      const data = await response.json();
      if (data.categorias) {
        setCategorias(data.categorias);
      } else {
        throw new Error("El servidor no devolvió el formato 6M esperado.");
      }
    } catch (e) {
      console.error("Error en Diagnóstico:", e);
      alert("⚠️ El servidor de IA está saturado o tardó demasiado en responder. Por favor, intenta con una descripción más breve.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `SÍNTOMA: ${sintomas}. RESPUESTAS TÉCNICAS: ${JSON.stringify(respuestas)}. Genera un análisis ACR completo.` 
        })
      });

      if (!response.ok) throw new Error("Error en generación de informe");

      const data = await response.json();
      
      // Validamos que la data traiga lo necesario para no romper la bitácora
      if (data) {
        setReporte(data);
        if (user) {
          await addDoc(collection(db, "customers", user.uid, "incidencias"), {
            titulo: `Auditoría: ${contexto}`,
            descripcion: sintomas,
            informe_completo: data, // Aquí guardamos todo para el Modal
            solucion: data.hipotesis || "Revisar informe detallado",
            estado: "pendiente",
            fecha: serverTimestamp()
          });
          mostrarAviso("✅ Informe guardado con éxito.");
        }
      }
    } catch (e) {
      console.error("Error en ACR:", e);
      alert("❌ Error 500: El servidor no pudo procesar el informe completo. Es posible que el análisis sea demasiado extenso.");
    } finally {
      setLoading(false);
    }
  };
