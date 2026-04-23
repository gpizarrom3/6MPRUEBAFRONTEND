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
    // CORRECCIÓN: Se añade /api/diagnostico al final de la URL
    const API_URL = "https://sixmprueba.onrender.com/api/diagnostico"; 

    let retries = 0;
    while (retries <= 3) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, systemPrompt, schema })
        });

        if (!response.ok) throw new Error('Error en el servidor de IA.');
        return await response.json(); 
      } catch (err) {
        if (retries === 3) throw err;
        await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000));
        retries++;
      }
    }
  };

  const refineAudioToProblem = async () => {
    if (!rawTranscript.trim()) return;
    setIsRefiningAudio(true);
    try {
      const systemPrompt = `Eres un Ingeniero Consultor en una reunión inicial. Extrae síntomas: ruidos, vibraciones, cambios visuales. Responde en JSON.`;
      const schema = {
        type: "OBJECT",
        properties: { problemStatement: { type: "STRING" } },
        required: ["problemStatement"]
      };
      const result = await callGemini(rawTranscript, systemPrompt, schema);
      setCapturedProblem(result.problemStatement || "No se detectó un problema claro.");
    } catch (err) {
      setError("No se pudo sintetizar el audio.");
    } finally {
      setIsRefiningAudio(false);
    }
  };

  const handleStartAI = async () => {
    const combinedInput = `NOTAS: ${manualDescription} \n\n SÍNTOMAS: ${capturedProblem}`;
    if (!combinedInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const systemPrompt = `Eres un Ingeniero Consultor. Genera 10 preguntas cualitativas 6M (Material, Maquinaria, Mano de Obra, Método, Medición, Medio Ambiente). Responde en JSON con 'summary' y 'questions'.`;
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
      setError("Error al generar entrevista.");
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
      const prompt = `Genera ACR preliminar. Notas: ${manualDescription}. Problema: ${capturedProblem}. Hallazgos: ${JSON.stringify(findings)}.`;
      const systemPrompt = `Eres experto en ACR. Genera informe con execSummary, analysis6M (array de {m, content}), rootCauseHypothesis, conclusions (array), recommendations (array). Responde en JSON.`;
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
      setError("No se pudo redactar el informe.");
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
                    <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Informe Preliminar de Ingeniería</h1>
                    <p className="text-blue-400 font-bold uppercase text-xs tracking-widest italic">Diagnóstico Primario de Campo</p>
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
                                {acrReport.conclusions?.map((c, i) => <li key={i}>• {c}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h2 className="text-xs font-black text-slate-800 uppercase mb-3">Estudios Recomendados</h2>
                            <ul className="text-xs space-y-2 text-slate-600 font-bold">
                                {acrReport.recommendations?.map((r, i) => <li key={i} className="flex gap-2 text-blue-700"><CheckCircle2 size={12} /> {r}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-slate-50 border-t flex justify-between">
                    <button onClick={() => setView('interview')} className="text-xs font-bold text-slate-400 flex items-center gap-2"><ArrowLeft size={14}/> Volver</button>
                    <button className="bg-slate-900 text-white px-6 py-2 rounded font-black text-xs uppercase" onClick={() => window.print()}>PDF</button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 uppercase italic"><ShieldAlert className="inline text-blue-600 mr-2" /> Auditoría 6M</h1>
        {dynamicQuestions.length > 0 && (
          <button onClick={() => window.location.reload()} className="text-[10px] font-black uppercase text-slate-400"><RefreshCcw className="inline mr-1" size={12} /> Reiniciar</button>
        )}
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white p-6 rounded-3xl shadow-sm border">
            <h2 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">01. Contexto de Visita</h2>
            <textarea className="w-full p-4 bg-slate-50 rounded-2xl text-sm min-h-[100px] outline-none" value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} placeholder="Ubicación, equipo..." />
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">02. Síntomas</h2>
              <button onClick={toggleListening} className={`px-4 py-2 rounded-full text-[10px] font-black text-white ${isListening ? 'bg-red-500' : 'bg-blue-600'}`}>
                {isListening ? 'Finalizar' : 'Escuchar'}
              </button>
            </div>
            {capturedProblem && <div className="p-4 bg-green-50 rounded-xl text-xs italic text-green-800">{capturedProblem}</div>}
            <button onClick={handleStartAI} disabled={isAnalyzing} className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase">
              {isAnalyzing ? <Loader2 className="animate-spin inline mr-2" /> : <Sparkles className="inline mr-2" />} Generar Entrevista
            </button>
          </section>
        </div>

        <div className="lg:col-span-7">
          {dynamicQuestions.length === 0 ? (
            <div className="h-full border-4 border-dashed rounded-[40px] flex items-center justify-center text-slate-300 p-12 text-center">
              <p className="font-black uppercase tracking-widest text-xs">Esperando Entrada...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-5 bg-blue-900 text-white rounded-3xl shadow-xl">
                <p className="text-[10px] font-black text-blue-300 uppercase mb-1">Estrategia</p>
                <p className="text-xs italic">{summary}</p>
              </div>

              {Object.entries(groupedQuestions).map(([cat, qs]) => (
                <div key={cat} className="bg-white rounded-3xl border overflow-hidden">
                  <button onClick={() => setExpandedM(expandedM === cat ? null : cat)} className="w-full p-6 flex justify-between items-center">
                    <span className="font-black text-lg italic text-slate-700">{cat}</span>
                    {expandedM === cat ? <ChevronUp /> : <ChevronDown />}
                  </button>
                  {expandedM === cat && (
                    <div className="p-6 bg-slate-50/50 space-y-4">
                      {qs.map((q) => (
                        <div key={q.id} className="bg-white p-4 rounded-2xl border space-y-3">
                          <p className="font-bold text-sm text-slate-800">{q.question}</p>
                          <div className="flex gap-2">
                            {['sí', 'no', 'unknown'].map(opt => (
                              <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))} 
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border-2 ${answers[q.id] === opt ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-100'}`}>
                                {opt === 'unknown' ? 'S/I' : opt}
                              </button>
                            ))}
                          </div>
                          <textarea className="w-full p-2 bg-slate-50 rounded-xl text-xs outline-none" placeholder="Comentarios..." value={details[q.id] || ''} onChange={(e) => setDetails(prev => ({ ...prev, [q.id]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={handleGenerateReport} disabled={isGeneratingReport || criticalPoints.length === 0} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xl uppercase italic shadow-xl">
                {isGeneratingReport ? 'Redactando...' : 'Generar Reporte ACR'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;