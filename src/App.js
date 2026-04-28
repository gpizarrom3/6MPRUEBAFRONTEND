import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Zap, History, Clock, CheckCircle2 } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { db, auth } from './firebase'; 
import AuthCorner from './AuthCorner';

function App() {
  const [tabActiva, setTabActiva] = useState('inicio');
  const [contexto, setContexto] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]); 
  const [respuestas, setRespuestas] = useState({});
  const [reporte, setReporte] = useState(null);
  const [incidencias, setIncidencias] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "customers", user.uid, "incidencias"), orderBy("fecha", "desc"));
      return onSnapshot(q, (snaps) => {
        setIncidencias(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [user]);

  const handleGenerateEntrevista = async () => {
    if (!sintomas) return alert("Por favor, describa la falla.");
    setLoading(true); setCategorias([]); setReporte(null);
    try {
      const res = await fetch('https://sixmprueba.onrender.com/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Eres un consultor experto en 6M. Genera un cuestionario técnico para la falla: ${sintomas}. Responde estrictamente en formato JSON: {"categorias": [{"nombre": "...", "preguntas": [{"texto": "..."}]}]}` 
        })
      });
      const d = await res.json();
      setCategorias(d.categorias || d.categories || []);
    } catch (e) { alert("Error de red"); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <aside className="w-80 bg-[#0F172A] text-white p-8 flex flex-col">
        <h1 className="text-2xl font-black mb-10 text-cyan-500 tracking-tighter">ACR.RADIX</h1>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setTabActiva('inicio')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold ${tabActiva === 'inicio' ? 'bg-slate-800 text-cyan-400' : ''}`}><LayoutDashboard size={18} /> Monitor</button>
          <button onClick={() => setTabActiva('nueva')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold ${tabActiva === 'nueva' ? 'bg-cyan-600 text-white' : ''}`}><Zap size={18} /> Auditoría</button>
          <button onClick={() => setTabActiva('bitacora')} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold ${tabActiva === 'bitacora' ? 'bg-slate-800 text-cyan-400' : ''}`}><History size={18} /> Historial</button>
        </nav>
        <AuthCorner />
      </aside>

      <main className="flex-1 overflow-y-auto p-12">
        {tabActiva === 'nueva' && (
          <div className="max-w-2xl mx-auto">
            {!categorias.length ? (
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border space-y-6">
                <h2 className="text-2xl font-black uppercase italic">Nuevo Análisis</h2>
                <textarea className="w-full p-4 bg-slate-50 rounded-xl border h-32" value={sintomas} onChange={(e)=>setSintomas(e.target.value)} placeholder="¿Qué falla detectó?" />
                <button onClick={handleGenerateEntrevista} disabled={loading} className="w-full bg-slate-900 text-white p-5 rounded-xl font-black">{loading ? "Analizando..." : "Iniciar Protocolo"}</button>
              </div>
            ) : (
              <div className="space-y-6">
                {categorias.map((cat, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-3xl border">
                    <h4 className="font-black text-cyan-600 uppercase text-xs mb-4">{cat.nombre}</h4>
                    {cat.preguntas.map((pre, pIdx) => (
                      <div key={pIdx} className="mb-4">
                        <p className="font-bold text-slate-700 mb-2">{pre.texto}</p>
                        <input className="w-full p-3 bg-slate-50 rounded-lg border" placeholder="Respuesta técnica..." />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tabActiva === 'inicio' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl border shadow-sm">
              <Clock className="text-cyan-500 mb-2" />
              <p className="text-4xl font-black">{incidencias.length}</p>
              <p className="text-slate-500 font-bold uppercase text-xs">Total Eventos</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
