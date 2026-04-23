import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ShieldAlert, Hammer, Settings, Truck, Users, Ruler, CheckCircle2, 
  AlertTriangle, Factory, Pickaxe, ChevronDown, ChevronUp, Info, 
  ClipboardList, MessageSquare, Sparkles, Loader2, RefreshCcw, 
  PlusCircle, BookOpen, FileText, ArrowLeft, Printer, Mic, MicOff,
  Radio, BrainCircuit, Headphones, Waves, ListFilter, Target,
  Wind
} from 'lucide-react';

const App = () => {
  // Estados de Entrada
  const [manualDescription, setManualDescription] = useState('');
  const [rawTranscript, setRawTranscript] = useState(''); 
  const [capturedProblem, setCapturedProblem] = useState(''); 
  
  // Estados de Control
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefiningAudio, setIsRefiningAudio] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [details, setDetails] = useState({});
  const [expandedM, setExpandedM] = useState(null);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState('');
  const [view, setView] = useState('interview'); 
  const [acrReport, setAcrReport] = useState(null);

  // Estados de Voz
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const apiKey = ""; 

  // --- Lógica de Agrupación y Cálculo ---
  const groupedQuestions = useMemo(() => {
    const groups = {};
    if (!Array.isArray(dynamicQuestions)) return groups;
    dynamicQuestions.forEach(q => {
      const cat = q.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(q);
    });
    return groups;
  }, [dynamicQuestions]);

  const criticalPoints = useMemo(() => {
    if (!Array.isArray(dynamicQuestions)) return [];
    return dynamicQuestions.filter(q => {
      const ans = answers[q.id];
      const det = details[q.id] || '';
      return ans === 'no' || ans === 'unknown' || det.length > 2;
    });
  }, [answers, details, dynamicQuestions]);

  // --- Configuración de Reconocimiento de Voz ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setRawTranscript(prev => prev + " " + currentTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Error en reconocimiento:", event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      refineAudioToProblem();
    } else {
      setRawTranscript('');
      setCapturedProblem('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

const callGemini = async (prompt, systemPrompt, schema) => {
    // REEMPLAZA ESTA URL con la que copiaste de Render
    const API_URL = "https://sixmprueba.onrender.com"; 

    let retries = 0;
    while (retries <= 3) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, systemPrompt, schema })
        });

        if (!response.ok) throw new Error('Error en el servidor de IA.');
        
        // El backend ya devuelve el objeto JSON directamente
        return await response.json(); 
      } catch (err) {
        if (retries === 3) throw err;
        // Reintento exponencial en caso de que el servidor esté "durmiendo" [cite: 19]
        await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000));
        retries++;
      }
    }
};

  const refineAudioToProblem = async () => {
    if (!rawTranscript.trim()) return;
    setIsRefiningAudio(true);
    try {
      const systemPrompt = `Eres un Ingeniero Consultor en una reunión inicial. Tu tarea es extraer EXCLUSIVAMENTE los síntomas del problema descritos por el cliente (ruidos, vibraciones, cambios visuales, fallas recientes). Ignora tecnicismos que el cliente no maneje. Redacta el problema como una observación de campo inicial. Responde en JSON.`;
      const schema = {
        type: "OBJECT",
        properties: {
          problemStatement: { type: "STRING" }
        },
        required: ["problemStatement"]
      };
      const result = await callGemini(rawTranscript, systemPrompt, schema);
      setCapturedProblem(result.problemStatement || "No se detectó un problema claro en la conversación.");
    } catch (err) {
      setError("No se pudo sintetizar el audio.");
    } finally {
      setIsRefiningAudio(false);
    }
  };

  const handleStartAI = async () => {
    const combinedInput = `NOTAS MANUALES: ${manualDescription} \n\n SÍNTOMAS DEL CLIENTE: ${capturedProblem}`;
    if (!combinedInput.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const systemPrompt = `Eres un Ingeniero Consultor experto. Estás realizando un DIAGNÓSTICO PRIMARIO.
      El cliente NO es un experto técnico y NO tiene datos duros (presiones, micras, grados de acero).
      Genera 10 preguntas de observación CUALITATIVA bajo las 6M.
      
      REGLAS PARA LAS PREGUNTAS:
      1. Usa lenguaje sencillo (ej: "¿Siente más calor?", "¿Escucha algo distinto?", "¿El material se ve más sucio?").
      2. Enfócate en los sentidos: tacto, vista, oído.
      3. Pregunta sobre cambios en la rutina u operarios nuevos.
      4. NADA de datos numéricos exactos.
      5. El 'blockArgument' sí debe ser técnico para que el ingeniero entienda el riesgo científico detrás de la respuesta del cliente.
      
      Responde en JSON con 'summary' (enfoque de la visita) y 'questions' (array de objetos con id, category, question, blockArgument).`;
      
      const schema = {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          questions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                category: { type: "STRING" },
                question: { type: "STRING" },
                blockArgument: { type: "STRING" }
              },
              required: ["id", "category", "question", "blockArgument"]
            }
          }
        },
        required: ["summary", "questions"]
      };

      const result = await callGemini(combinedInput, systemPrompt, schema);
      setDynamicQuestions(result.questions || []);
      setSummary(result.summary || "");
      if (result.questions?.length > 0) setExpandedM(result.questions[0].category);
    } catch (err) {
      setError("Error al generar la entrevista cualitativa.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const findings = dynamicQuestions.map(q => ({
        cat: q.category,
        preg: q.question,
        ans: answers[q.id] || 'N/A',
        obs: details[q.id] || ''
      }));

      const prompt = `Diagnóstico Primario. Notas: ${manualDescription}. Problema detectado: ${capturedProblem}. Observaciones de campo: ${JSON.stringify(findings)}. Genera un Informe ACR preliminar que justifique la necesidad de un estudio de ingeniería profundo.`;
      const systemPrompt = `Eres un experto en ACR. Genera un informe que conecte los síntomas cualitativos con posibles fallas mecánicas graves. El informe debe concluir recomendando un estudio técnico (metalografía, escaneo, etc.) para obtener los datos duros que hoy faltan.`;
      const schema = {
        type: "OBJECT",
        properties: {
          execSummary: { type: "STRING" },
          analysis6M: { type: "ARRAY", items: { type: "OBJECT", properties: { m: { type: "STRING" }, content: { type: "STRING" } } } },
          rootCauseHypothesis: { type: "STRING" },
          conclusions: { type: "ARRAY", items: { type: "STRING" } },
          recommendations: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["execSummary", "analysis6M", "rootCauseHypothesis", "conclusions", "recommendations"]
      };

      const result = await callGemini(prompt, systemPrompt, schema);
      setAcrReport(result);
      setView('report');
    } catch (err) {
      setError("No se pudo redactar el informe preliminar.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getIcon = (cat) => {
    const category = String(cat || '');
    if (category.includes('Material')) return <Hammer size={20} />;
    if (category.includes('Maquinaria')) return <Settings size={20} />;
    if (category.includes('Mano')) return <Users size={20} />;
    if (category.includes('Metodo') || category.includes('Método')) return <Truck size={20} />;
    if (category.includes('Medicion') || category.includes('Medición')) return <Ruler size={20} />;
    if (category.includes('Medio')) return <Wind size={20} />;
    return <Info size={20} />;
  };

  if (view === 'report' && acrReport) {
    return (
        <div className="min-h-screen bg-slate-200 p-4 md:p-12 font-sans text-slate-900">
            <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden border border-slate-300">
                <div className="bg-slate-900 text-white p-10 border-b-4 border-blue-600">
                    <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Informe Preliminar de Ingeniería</h1>
                        <p className="text-blue-400 font-bold uppercase text-xs tracking-widest italic">Diagnóstico Primario de Campo</p>
                    </div>
                    </div>
                </div>
                <div className="p-12 space-y-8">
                    <section>
                        <h2 className="text-xs font-black text-blue-700 uppercase mb-2 border-b pb-1">Contexto Detectado</h2>
                        <p className="text-sm text-slate-600 italic leading-relaxed">{acrReport.execSummary}</p>
                    </section>
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {acrReport.analysis6M?.map((item, i) => (
                            <div key={i} className="p-4 bg-slate-50 border rounded-lg">
                                <h3 className="text-[10px] font-black text-slate-800 uppercase mb-1">{item.m}</h3>
                                <p className="text-xs text-slate-500 leading-tight">{item.content}</p>
                            </div>
                        ))}
                    </section>
                    <section className="bg-blue-900 text-white p-6 rounded-xl shadow-lg border-l-4 border-blue-400">
                        <h2 className="text-xs font-black text-blue-300 uppercase mb-2">Hipótesis Técnica Preliminar</h2>
                        <p className="text-sm font-medium">{acrReport.rootCauseHypothesis}</p>
                    </section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-8">
                        <div>
                            <h2 className="text-xs font-black text-slate-800 uppercase mb-3">Conclusiones</h2>
                            <ul className="text-xs space-y-2 text-slate-500 italic">
                                {acrReport.conclusions?.map((c, i) => <li key={i} className="flex gap-2"><span>•</span> {c}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h2 className="text-xs font-black text-slate-800 uppercase mb-3">Estudios Recomendados</h2>
                            <ul className="text-xs space-y-2 text-slate-600 font-bold">
                                {acrReport.recommendations?.map((r, i) => <li key={i} className="flex gap-2 text-blue-700"><CheckCircle2 size={12} className="shrink-0 mt-0.5" /> {r}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-slate-50 border-t flex justify-between">
                    <button onClick={() => setView('interview')} className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-2"><ArrowLeft size={14}/> Volver</button>
                    <button className="bg-slate-900 text-white px-6 py-2 rounded font-black text-xs uppercase tracking-widest shadow-lg" onClick={() => window.print()}>Generar Documento PDF</button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3 italic leading-none">
            <ShieldAlert className="text-blue-600" /> Auditoría <span className="text-slate-400 font-light tracking-normal lowercase text-xl">primaria-6m</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 italic">Enfoque Cualitativo y Observacional</p>
        </div>
        {dynamicQuestions.length > 0 && (
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-400 flex items-center gap-2 hover:bg-slate-50 transition uppercase tracking-widest">
            <RefreshCcw size={12} /> Reiniciar Diagnóstico
          </button>
        )}
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PANEL IZQUIERDO: CAPTURA DE SÍNTOMAS */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-800 rounded-full"></span> 01. Contexto de Visita
            </h2>
            <textarea 
              className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 focus:bg-white rounded-2xl text-sm min-h-[100px] outline-none transition resize-none shadow-inner"
              placeholder="Notas manuales: Ubicación, tipo de equipo, lo que se ve a simple vista..."
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              disabled={dynamicQuestions.length > 0}
            />
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <BrainCircuit size={14} className={isListening ? "animate-pulse" : ""} /> 02. Síntomas en Reunión
              </h2>
              <button 
                onClick={toggleListening}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all shadow-lg ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {isListening ? <><MicOff size={14} /> Finalizar Escucha</> : <><Mic size={14} /> Escuchar al Cliente</>}
              </button>
            </div>
            
            <div className="relative">
                {isListening ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-blue-50 rounded-2xl border-2 border-dashed border-blue-200 text-blue-600">
                        <Waves className="animate-bounce mb-3" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Capturando observaciones...</p>
                        <p className="text-[9px] text-blue-400 mt-1 italic leading-none">La IA está filtrando problemas técnicos</p>
                    </div>
                ) : isRefiningAudio ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border-2 border-slate-100 text-slate-400">
                        <Loader2 className="animate-spin mb-3" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Analizando Conversación...</p>
                    </div>
                ) : capturedProblem ? (
                    <div className="p-5 bg-green-50 border-2 border-green-100 rounded-2xl animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <Target size={14} className="text-green-600" />
                            <span className="text-[10px] font-black text-green-700 uppercase italic">Problema Detectado:</span>
                        </div>
                        <p className="text-xs text-green-900 leading-relaxed italic">{capturedProblem}</p>
                    </div>
                ) : (
                    <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300">
                        <Radio size={40} strokeWidth={1} className="mx-auto mb-2 opacity-50" />
                        <p className="text-[9px] font-black uppercase">Sin síntomas capturados</p>
                        <p className="text-[8px] mt-1 max-w-[150px] mx-auto italic">Active el micrófono para que la IA extraiga el problema de la reunión.</p>
                    </div>
                )}
            </div>

            <div className="mt-8">
              <button 
                onClick={handleStartAI}
                disabled={isAnalyzing || (!manualDescription && !capturedProblem) || isListening || isRefiningAudio}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-blue-800 transition disabled:opacity-50 shadow-xl tracking-widest uppercase"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {isAnalyzing ? 'GENERANDO PREGUNTAS...' : 'GENERAR ENTREVISTA DE CAMPO'}
              </button>
            </div>
          </section>
        </div>

        {/* PANEL DERECHO: AUDITORÍA 6M CUALITATIVA */}
        <div className="lg:col-span-7">
          {dynamicQuestions.length === 0 ? (
            <div className="h-full min-h-[500px] border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center text-slate-300 bg-white p-12 text-center shadow-inner">
                <div className="p-6 bg-slate-50 rounded-full mb-6">
                    <ListFilter size={64} strokeWidth={1} className="text-slate-200" />
                </div>
              <h3 className="text-xl font-black text-slate-300 uppercase italic tracking-tighter">Esperando Análisis de Entrada</h3>
              <p className="text-[10px] max-w-xs mt-2 text-slate-400 font-bold uppercase tracking-widest">Las preguntas cualitativas se generarán aquí para guiar su conversación con el cliente.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 pb-12">
              <div className="p-5 bg-blue-900 text-white rounded-3xl shadow-xl flex items-start gap-4 border-b-4 border-blue-600">
                <Sparkles className="text-blue-300 shrink-0 mt-1" size={20} />
                <div>
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Estrategia de Diagnóstico</p>
                    <p className="text-[12px] italic leading-tight text-blue-50 font-medium">{String(summary)}</p>
                </div>
              </div>

              {Object.entries(groupedQuestions).map(([cat, qs]) => (
                <div key={cat} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <button onClick={() => setExpandedM(expandedM === cat ? null : cat)} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">{getIcon(cat)}</div>
                      <div className="text-left">
                        <span className="font-black text-lg text-slate-700 block leading-none italic">{String(cat)}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Observación Directa</span>
                      </div>
                    </div>
                    {expandedM === cat ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {expandedM === cat && (
                    <div className="p-6 border-t border-slate-50 space-y-6 bg-slate-50/20">
                      {qs.map((q) => (
                        <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                          <p className="font-bold text-slate-800 text-sm flex gap-3 leading-snug">
                            <MessageSquare size={16} className="text-blue-500 shrink-0 mt-1" /> {String(q.question)}
                          </p>
                          <div className="flex gap-2">
                            {['sí', 'no', 'unknown'].map(opt => (
                              <button 
                                key={opt} 
                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))} 
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition ${
                                  answers[q.id] === opt 
                                    ? (opt === 'sí' ? 'bg-green-600 border-green-600 text-white' : opt === 'no' ? 'bg-red-600 border-red-600 text-white' : 'bg-slate-800 border-slate-800 text-white') 
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                }`}
                              >
                                {opt === 'unknown' ? 'S/I' : opt}
                              </button>
                            ))}
                          </div>
                          <textarea 
                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs outline-none focus:bg-white min-h-[60px]" 
                            placeholder="Anotar comentario del cliente..." 
                            value={details[q.id] || ''} 
                            onChange={(e) => setDetails(prev => ({ ...prev, [q.id]: e.target.value }))} 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="mt-8 bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Pickaxe size={120} />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Resumen de Incertidumbres</h2>
                    <p className="text-slate-400 text-[10px] mb-8 uppercase font-bold tracking-[0.3em]">Puntos Críticos Detectados: {criticalPoints.length}</p>
                    <button 
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport || criticalPoints.length === 0}
                        className="w-full py-5 bg-blue-600 rounded-3xl font-black text-xl uppercase italic tracking-widest shadow-xl shadow-blue-500/40 hover:bg-blue-500 transition disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isGeneratingReport ? <><Loader2 className="animate-spin" size={24} /> REDACTANDO...</> : <><Sparkles size={24} /> GENERAR REPORTE PRELIMINAR</>}
                    </button>
                  </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;