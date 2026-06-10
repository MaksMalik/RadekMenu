import { motion } from 'framer-motion';
import { Salad, Sparkles, ShoppingCart, CalendarDays, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: <CalendarDays size={16} className="text-emerald-500" />, text: 'Kalendarz posiłków z heatmapą', tint: 'bg-emerald-50' },
  { icon: <Sparkles size={16} className="text-violet-500" />, text: 'Generowanie posiłków przez AI (Gemini)', tint: 'bg-violet-50' },
  { icon: <Flame size={16} className="text-amber-500" />, text: 'Śledzenie kalorii i makro', tint: 'bg-amber-50' },
  { icon: <ShoppingCart size={16} className="text-sky-500" />, text: 'Lista zakupów i przepisy', tint: 'bg-sky-50' },
];

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-100 via-white to-sky-100 px-4 py-10 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-sky-200/40 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-900/10 border border-white/60 p-8 sm:p-10 relative z-10"
      >
        {/* Hero logo */}
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-300/60"
          >
            <Salad size={36} className="text-white" />
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent"
        >
          Silhouette Planner
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="text-sm text-slate-500 text-center mb-8 leading-relaxed"
        >
          Inteligentny planer diety z kalendarzem, sterowany przez AI — planuj posiłki i śledź makroskładniki każdego dnia.
        </motion.p>

        {/* Feature highlights */}
        <div className="space-y-2.5 mb-8">
          {features.map((f, i) => (
            <motion.div
              key={f.text}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.36 + i * 0.09 }}
              className="flex items-center gap-3 px-3 py-2.5 bg-white/80 rounded-2xl border border-slate-100 shadow-sm"
            >
              <div className={`w-9 h-9 rounded-xl ${f.tint} flex items-center justify-center flex-shrink-0`}>
                {f.icon}
              </div>
              <span className="text-sm font-medium text-slate-700">{f.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Simple redirect-based Google login — no popup needed */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.76 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-semibold text-slate-700 shadow-md hover:shadow-lg hover:border-slate-300 transition-all"
        >
          <GoogleIcon />
          Kontynuuj z Google
        </motion.button>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Twoje dane są bezpiecznie zapisywane w chmurze.
        </p>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
