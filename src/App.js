{reporte && (
  <section className="bg-white p-10 rounded-[40px] shadow-2xl border-t-8 border-blue-600 space-y-8 animate-in zoom-in duration-500">
    <div className="text-center border-b pb-6">
      <h3 className="text-3xl font-black text-blue-900">INFORME TÉCNICO ACR</h3>
      <p className="text-slate-500 font-bold">Metodología Ishikawa 6M</p>
    </div>

    {/* RESUMEN 6M */}
    <div className="grid md:grid-cols-2 gap-4">
      {Object.entries(reporte.resumen_6m || {}).map(([key, value]) => (
        <div key={key} className="bg-slate-50 p-4 rounded-2xl border">
          <h4 className="font-black text-blue-600 uppercase text-xs mb-1">{key.replace(/_/g, ' ')}</h4>
          <p className="text-slate-700 text-sm">{value}</p>
        </div>
      ))}
    </div>

    {/* HIPÓTESIS */}
    <div className="bg-blue-50 p-6 rounded-2xl border-l-8 border-blue-600">
      <h4 className="font-black text-blue-900 mb-2 flex items-center gap-2">
        <Activity size={20} /> HIPÓTESIS DE CAUSA RAÍZ
      </h4>
      <p className="text-blue-800 italic">{reporte.hipotesis}</p>
    </div>

    {/* RECOMENDACIONES */}
    <div className="space-y-4">
      <h4 className="font-black text-slate-800 flex items-center gap-2">
        <ClipboardCheck size={20} className="text-green-600" /> PLAN DE ACCIÓN RECOMENDADO
      </h4>
      <ul className="grid gap-2">
        {reporte.recomendaciones?.map((rec, i) => (
          <li key={i} className="flex gap-3 bg-green-50 p-3 rounded-xl text-green-800 text-sm border border-green-100">
            <span className="font-black">0{i+1}</span> {rec}
          </li>
        ))}
      </ul>
    </div>

    <button 
      onClick={() => window.print()} 
      className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 transition-all"
    >
      DESCARGAR O IMPRIMIR REPORTE
    </button>
  </section>
)}
