import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Key, Eye, EyeOff } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { writeUserStateOrThrow } from '../firebase/firestoreStorage';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { state, dispatch } = useUser();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { userProfile } = state;

  const [newDislike, setNewDislike] = useState('');
  const [newPreferred, setNewPreferred] = useState('');
  const [newEquipment, setNewEquipment] = useState('');

  // Local editing state for the API key so the stored value is only overwritten
  // by an explicit, validated save (Requirements 10.1, 10.5, 10.6).
  const [apiKeyInput, setApiKeyInput] = useState(state.geminiApiKey);
  const [revealKey, setRevealKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // Sync the local editor with the stored key whenever the drawer (re)opens or
  // the stored key changes from elsewhere, and reset the reveal toggle so the
  // key is masked again after navigating away (Requirement 10.7).
  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(state.geminiApiKey);
      setRevealKey(false);
    }
  }, [isOpen, state.geminiApiKey]);

  const saveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    // Reject empty/whitespace saves: keep the stored key, surface a Polish error
    // (Requirement 10.5).
    if (!trimmed) {
      setApiKeyInput(state.geminiApiKey);
      showToast('Klucz API jest wymagany.', 'error');
      return;
    }
    // No change — nothing to persist.
    if (trimmed === state.geminiApiKey) {
      return;
    }
    if (!user) {
      showToast('Nie udało się zapisać klucza API.', 'error');
      return;
    }

    setSavingKey(true);
    try {
      // Persist directly so a Firestore rejection is observable here; on success
      // update app state via the existing SET_API_KEY path (Requirement 10.1).
      await writeUserStateOrThrow(user.uid, { ...state, geminiApiKey: trimmed });
      dispatch({ type: 'SET_API_KEY', key: trimmed });
      showToast('Zapisano klucz API.', 'success');
    } catch {
      // Retain the previously stored key and surface a Polish save error
      // (Requirement 10.6).
      setApiKeyInput(state.geminiApiKey);
      showToast('Nie udało się zapisać klucza API.', 'error');
    } finally {
      setSavingKey(false);
    }
  };

  const chipTransition = { type: 'spring', stiffness: 500, damping: 30 } as const;

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

  const addEquipment = () => {
    const trimmed = newEquipment.trim();
    if (trimmed && !userProfile.equipment.includes(trimmed)) {
      dispatch({
        type: 'UPDATE_PROFILE',
        profile: { equipment: [...userProfile.equipment, trimmed] },
      });
      setNewEquipment('');
    }
  };

  const removeEquipment = (item: string) => {
    dispatch({
      type: 'UPDATE_PROFILE',
      profile: { equipment: userProfile.equipment.filter(i => i !== item) },
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
                  <AnimatePresence>
                    {userProfile.dislikedIngredients.map((item) => (
                      <motion.span
                        key={item}
                        layout
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={chipTransition}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs"
                      >
                        {item}
                        <button onClick={() => removeDislike(item)} className="hover:text-red-900">
                          <X size={12} />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
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
                  <AnimatePresence>
                    {userProfile.preferredIngredients.map((item) => (
                      <motion.span
                        key={item}
                        layout
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={chipTransition}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs"
                      >
                        {item}
                        <button onClick={() => removePreferred(item)} className="hover:text-emerald-900">
                          <X size={12} />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </section>

              {/* Gemini API Key */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Key size={14} /> Klucz API Gemini
                </h3>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={revealKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void saveApiKey();
                        }
                      }}
                      placeholder="Wklej klucz API..."
                      className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setRevealKey((v) => !v)}
                      aria-label={revealKey ? 'Ukryj klucz API' : 'Pokaż klucz API'}
                      aria-pressed={revealKey}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {revealKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveApiKey()}
                    disabled={savingKey}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Zapisz
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Pobierz z{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-500 underline">
                    https://aistudio.google.com/apikey
                  </a>
                </p>
              </section>

              {/* Equipment */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Sprzęt
                </h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newEquipment}
                    onChange={(e) => setNewEquipment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addEquipment()}
                    placeholder="Dodaj sprzęt..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
                  />
                  <button
                    onClick={addEquipment}
                    className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {userProfile.equipment.map((eq) => (
                      <motion.span
                        key={eq}
                        layout
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={chipTransition}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600"
                      >
                        {eq}
                        <button onClick={() => removeEquipment(eq)} className="hover:text-slate-900">
                          <X size={12} />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
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
