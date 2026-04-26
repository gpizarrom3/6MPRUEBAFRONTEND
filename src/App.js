import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db, auth } from './firebase';

// ... dentro de tu función App() ...
const [isSubscribed, setIsSubscribed] = useState(false);
const [checkingSubscription, setCheckingSubscription] = useState(true);

// 1. ESCUCHAR SI EL USUARIO TIENE UNA SUSCRIPCIÓN ACTIVA
useEffect(() => {
  if (auth.currentUser) {
    const subscriptionsRef = collection(db, "customers", auth.currentUser.uid, "subscriptions");
    const q = query(subscriptionsRef, where("status", "in", ["trailing", "active"]));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Si el snapshot no está vacío, es que hay una suscripción activa
      setIsSubscribed(!snapshot.empty);
      setCheckingSubscription(false);
    });
    return () => unsubscribe();
  } else {
    setCheckingSubscription(false);
  }
}, [auth.currentUser]);

// 2. FUNCIÓN PARA REDIRIGIR A STRIPE (Usando la extensión)
const handleCheckout = async () => {
  const userId = auth.currentUser.uid;
  const checkoutSessionsRef = collection(db, "customers", userId, "checkout_sessions");
  
  // Creamos un documento que la extensión de Stripe detectará automáticamente
  const docRef = await addDoc(checkoutSessionsRef, {
    price: "TU_CODIGO_PRICE_AQUI", // <--- PEGA AQUÍ TU price_...
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });

  // La extensión nos devolverá una URL de Stripe en ese mismo documento
  onSnapshot(docRef, (snap) => {
    const { url } = snap.data();
    if (url) window.location.assign(url); // Esto manda al usuario a pagar
  });
};

// ... EN TU RETURN ...

if (checkingSubscription) return <div className="p-20 text-center">Verificando credenciales...</div>;

return (
  <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
    <AuthCorner />
    
    {!isSubscribed ? (
      // --- MURO DE PAGO (Lo que verá quien no ha pagado) ---
      <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[40px] shadow-2xl border-2 border-blue-100 text-center space-y-6">
        <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
          <Briefcase size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-900">Acceso Profesional</h2>
        <p className="text-slate-500 font-medium">
          Hola <strong>{auth.currentUser?.displayName}</strong>, para realizar auditorías 6M y generar informes con IA, necesitas activar el Plan Senior.
        </p>
        <button 
          onClick={handleCheckout}
          className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all transform hover:-translate-y-1"
        >
          ACTIVAR POR $29.990/mes
        </button>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Pago seguro vía Stripe</p>
      </div>
    ) : (
      // --- APP COMPLETA (Lo que ya tienes) ---
      <>
        <header>...</header>
        <main>...</main>
      </>
    )}
  </div>
);
