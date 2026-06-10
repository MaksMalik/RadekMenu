import { useState } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Dumbbell, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'unknown';
      console.error('[Login] sign-in failed:', code, err);
      setError(`Logowanie nie powiodło się (${code}). Spróbuj ponownie.`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-10"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Utensils size={28} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-amber-400 flex items-center justify-center shadow-md">
              <Dumbbell size={14} className="text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">
          Silhouette Planner
        </h1>
        <p className="text-sm text-slate-500 text-center mb-8">
          Twój osobisty asystent rekompozycji sylwetki — 14-dniowy plan diety i treningu z AI.
        </p>

        {/* Features */}
        <div className="space-y-2.5 mb-8">
          <Feature icon={<Sparkles size={15} className="text-emerald-500" />} text="Generowanie posiłków przez AI" />
          <Feature icon={<Utensils size={15} className="text-amber-500" />} text="14-dniowy planer diety" />
          <Feature icon={<Dumbbell size={15} className="text-sky-500" />} text="Plan treningowy i licznik kroków" />
        </div>

        {/* Google login button */}
        <motion.button
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 transition-all disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Logowanie...' : 'Zaloguj się przez Google'}
        </motion.button>

        {error && (
          <p className="text-sm text-red-500 text-center mt-4">{error}</p>
        )}

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Twoje dane są bezpiecznie zapisywane w chmurze i dostępne na każdym urządzeniu.
        </p>
      </motion.div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl">
      <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm flex-shrink-0">
        {icon}
      </div>
      <span className="text-sm text-slate-600">{text}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
