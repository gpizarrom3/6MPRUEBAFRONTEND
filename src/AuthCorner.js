import React from 'react';

const AuthCorner = ({ user }) => {
  if (!user) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="text-right hidden sm:block">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Operador Senior</p>
        <p className="text-sm font-bold text-slate-800">{user.displayName}</p>
      </div>
      <img 
        src={user.photoURL} 
        alt="Perfil" 
        className="w-10 h-10 rounded-xl border-2 border-blue-500 shadow-sm"
      />
    </div>
  );
};

export default AuthCorner;
