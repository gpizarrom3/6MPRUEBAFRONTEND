import React, { useState, useEffect } from 'react';
import { Activity, ClipboardCheck, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { db, auth } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]); // Nueva estructura
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  const [aviso, setAviso] = useState(null); // Para el Pop-up

  const handleGenerateEntrevista = async () => {
    setLoading(true); setCategorias([]); setReporte(null);
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `SÍNTOMA: ${sintomas}. CONTEXTO: ${contexto}.` })
      });
      const data = await response.json();
      if (data.categorias) setCategorias(data.categorias);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleGenerateACR = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `RESPUESTAS: ${JSON.stringify(respuestas)}` })
      });
      const data = await response.json();
      setReporte(data);
    } catch (e) { alert("Error"); } finally { setLoading(false); }
  };

  // Función para mostrar el Pop-up de aviso
  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">
      <AuthCorner />
      
      {/* POP-UP FLOTANTE (Toast) */}
      {aviso && (
        <div className="fixed bottom-10 right-10 z-[100] bg-blue-900 text-white p-5 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 border-l-8 border-yellow-400 max-w-sm">
          <AlertTriangle className="text-yellow-400 shrink-0" />
          <p className="text-sm font-bold">{aviso}</p>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 p-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl"><Activity className="text-white" /></div>
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-blue-600">Auditoría 6M Pro</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 mt-10 space-y-10">
        
        {/* INPUTS INICIALES */}
        <section className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200">
          <h2 className="text-3xl font-black mb-6">Diagnóstico de Fallos</h2>
          <div className="space-y-4">
            <input className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600 outline-none" value={contexto} onChange={(e)=>setContexto(e.target.value)} placeholder="Ej: Laboratorio de Electrónica - Sección B" />
            <textarea className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 h-32" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="¿Qué está fallando?" />
            <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 transition-all">
              {loading ? "PROCESANDO CON IA..." : "INICIAR ANÁLISIS 6M"}
            </button>
          </div>
        </section>

        {/* PREGUNTAS POR CATEGORÍA */}
        {categorias.length > 0 && (
          <div className="space-y-10">
            {categorias.map((cat, idx) => (
              <section key={idx} className="space-y-4">
                <h3 className="text-xl font-black flex items-center gap-2 text-blue-900 px-2 uppercase tracking-widest">
                  <span className="bg-blue-100 text-blue-600 p-1 rounded-lg text-sm">{idx+1}</span> {cat.nombre}
                </h3>
                <div className="grid gap-4">
                  {cat.preguntas.map((pre, pIdx) => (
                    <div key={pIdx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <p className="font-bold text-slate-700 mb-4">{pre.texto}</p>
                      <input 
                        onFocus={() => mostrarAviso(pre.aviso)}
                        onChange={(e) => setRespuestas({...respuestas, [`${idx}-${pIdx}`]: e.target.value})}
                        className="w-full p-3 bg-slate-50 rounded-xl border focus:border-blue-500 outline-none"
                        placeholder="Escribe aquí..."
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <button onClick={handleGenerateACR} className="w-full bg-green-600 text-white p-6 rounded-3xl font-black text-2xl shadow-2xl hover:scale-[1.02] transition-transform">
              GENERAR INFORME FINAL
            </button>
          </div>
        )}

        {/* REPORTE ACR FINAL */}
        {reporte && (
          <div className="bg-slate-900 text-white p-10 rounded-[50px] shadow-2xl space-y-10 border-t-[12px] border-blue-500">
            <div className="text-center">
              <CheckCircle2 className="mx-auto text-green-400 mb-4" size={50} />
              <h2 className="text-4xl font-black">Informe ACR Final</h2>
              <p className="text-slate-400">Resultados de la Auditoría Preventiva</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(reporte.resumen_6m || {}).map(([m, desc]) => (
                <div className="bg-white/5 p-5 rounded-3xl border border-white/10">
                  <h4 className="text-blue-400 font-black text-xs uppercase mb-2">{m}</h4>
                  <p className="text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-600 p-8 rounded-3xl">
              <h4 className="font-black text-xl mb-2">Hipótesis de Causa Raíz</h4>
              <p className="text-blue-50 leading-relaxed">{reporte.hipotesis}</p>
            </div>

            <div className="space-y-4">
              <h4 className="font-black text-xl px-2">Plan de Acción</h4>
              {reporte.recomendaciones.map((r, i) => (
                <div key={i} className="flex gap-4 items-start bg-white/5 p-4 rounded-2xl">
                  <div className="bg-green-500 text-white p-1 px-3 rounded-full text-xs font-black">{i+1}</div>
                  <p className="text-sm">{r}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
