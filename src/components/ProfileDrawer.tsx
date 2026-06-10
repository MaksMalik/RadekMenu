import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Target, Key, Plus, Trash2 } from 'lucide-react';
import { useUser } from '../context/UserContext';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { state, dispatch } = useUser();
  const { userProfile, geminiApiKey } = state;

  const [newDislike, setNewDislike] = useState('');
  const [newPreferred, setNewPreferred] = useState('');

  const addDislike = () => {
    const trimmed = newDislike.trim();
    if (trimmed && !userProfile.dislikedIngredients.includes(trimmed)) {
      dispatch({
        type: 'UPDATE_PROFILE',
        profile: { dislikedIngredients: [...userProfile.dislikedIngredients, trimmed] },
      });
      setNewDislike('');
    }
  };

  const removeDislike = (item: string) => {
    dispatch({
      type: 'UPDATE_PROFILE',
      profile: { dislikedIngredients: userProfile.dislikedIngredients.filter(i => i !== item) },
    });
  };

  const addPreferred = () => {
    const trimmed = newPreferred.trim();
    if (trimmed && !userProfile.preferredIngredients.includes(trimmed)) {
      dispatch({
        type: 'UPDATE_PROFILE',
        profile: { preferredIngredients: [...userProfile.preferredIngredients, trimmed] },
      });
      setNewPreferred('');
    }
  };

  const removePreferred = (item: string) => {
    dispatch({
      type: 'UPDATE_PROFILE',
      profile: { preferredIngredients: userProfile.preferredIngredients.filter(i => i !== item) },
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[420px] max-w-[90vw] bg-white shadow-xl z-[60] rounded-l-3xl overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Profil &amp; Cele</h2>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Editable metrics */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Dane & Cele
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Waga (kg)"
                    value={userProfile.weight}
                    onChange={(v) => dispatch({ type: 'UPDATE_PROFILE', profile: { weight: v } })}
                  />
                  <NumberField
                    label="Wzrost (cm)"
                    value={userProfile.height}
                    onChange={(v) => dispatch({ type: 'UPDATE_PROFILE', profile: { height: v } })}
                  />
                  <NumberField
                    label="Kalorie (kcal)"
                    value={userProfile.dailyCalorieTarget}
                    onChange={(v) => dispatch({ type: 'UPDATE_PROFILE', profile: { dailyCalorieTarget: v } })}
                  />
                  <NumberField
                    label="Białko (g)"
                    value={userProfile.dailyProteinTarget}
                    onChange={(v) => dispatch({ type: 'UPDATE_PROFILE', profile: { dailyProteinTarget: v } })}
                  />
                </div>
              </section>

              {/* Disliked ingredients */}
              <section>
                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
                  🚫 AI ma unikać
                </h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newDislike}
                    onChange={(e) => setNewDislike(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addDislike()}
                    placeholder="Dodaj składnik..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                  />
                  <button
                    onClick={addDislike}
                    className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {userProfile.dislikedIngredients.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs"
                    >
                      {item}
                      <button onClick={() => removeDislike(item)} className="hover:text-red-900">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </section>

              {/* Preferred ingredients */}
              <section>
                <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-3">
                  ✅ Lubiane składniki
                </h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newPreferred}
                    onChange={(e) => setNewPreferred(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPreferred()}
                    placeholder="Dodaj składnik..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  />
                  <button
                    onClick={addPreferred}
                    className="p-2 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-100 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {userProfile.preferredIngredients.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs"
                    >
                      {item}
                      <button onClick={() => removePreferred(item)} className="hover:text-emerald-900">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </section>

              {/* Equipment */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Sprzęt
                </h3>
                <div className="flex flex-wrap gap-2">
                  {userProfile.equipment.map((eq) => (
                    <span key={eq} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600">
                      {eq}
                    </span>
                  ))}
                </div>
              </section>

              {/* API Key */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Key size={14} /> Klucz API Gemini
                </h3>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => dispatch({ type: 'SET_API_KEY', key: e.target.value })}
                  placeholder="Wklej klucz API..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Klucz jest zapisywany lokalnie. Wymagany do funkcji AI.
                </p>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v > 0) onChange(v);
        }}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}
