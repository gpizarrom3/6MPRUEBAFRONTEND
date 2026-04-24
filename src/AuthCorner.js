import React, { useState, useEffect } from 'react';
import { auth, loginConGoogle, cerrarSesion } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';

const AuthCorner = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50">
      {user ? (
        <div className="flex items-center gap-3 bg-white p-2 rounded-full shadow-md border">
          <img src={user.photoURL} alt="pfp" className="w-8 h-8 rounded-full" />
          <span className="text-sm font-medium hidden md:block">{user.displayName}</span>
          <button onClick={cerrarSesion} className="p-2 hover:bg-gray-100 rounded-full text-red-500">
            <LogOut size={18} />
          </button>
        </div>
      ) : (
        <button 
          onClick={loginConGoogle}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 shadow-lg transition-all"
        >
          <LogIn size={18} />
          <span>Ingresar</span>
        </button>
      )}
    </div>
  );
};

export default AuthCorner;