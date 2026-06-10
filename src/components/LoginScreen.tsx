import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Salad, Sparkles, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { renderGoogleButton } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Retry rendering until GIS script is loaded
    const interval = setInterval(() => {
      if (buttonRef.current) {
        renderGoogleButton(buttonRef.current);
        // Check if button was actually rendered (has children)
        if (buttonRef.current.children.length > 0) {
          clearInterval(interval);
        }
      }
    }, 200);
    return () => clearInterval(interval);
  }, [renderGoogleButton]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-10"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
            <Salad size={28} className="text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">
          Silhouette Planner
        </h1>
        <p className="text-sm text-slate-500 text-center mb-8">
          Twój osobisty asystent rekompozycji sylwetki — 14-dniowy plan diety z AI.
        </p>

        {/* Features */}
        <div className="space-y-2.5 mb-8">
          <Feature icon={<Sparkles size={15} className="text-emerald-500" />} text="Generowanie posiłków przez AI" />
          <Feature icon={<Salad size={15} className="text-amber-500" />} text="14-dniowy planer diety" />
          <Feature icon={<ShoppingCart size={15} className="text-sky-500" />} text="Lista zakupów i przepisy" />
        </div>

        {/* Google Sign In Button rendered by GIS */}
        <div className="flex justify-center">
          <div ref={buttonRef} />
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Twoje dane są bezpiecznie zapisywane w chmurze.
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
