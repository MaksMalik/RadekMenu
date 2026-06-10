import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, X, Loader2, Flame, Zap } from 'lucide-react';
import type { Meal } from '../types';
import { useUser } from '../context/UserContext';
import { useToast } from './Toast';
import { swapMeal } from '../ai/geminiClient';

interface SwapMealModalProps {
  meal: Meal;
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SwapMealModal({ meal, date, isOpen, onClose }: SwapMealModalProps) {
  const { state, dispatch } = useUser();
  const { showToast } = useToast();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSwap = async () => {
    setLoading(true);

    const result = await swapMeal(meal, state.userProfile, state.geminiApiKey, comment || undefined);

    if (result.success && result.data && !Array.isArray(result.data)) {
      dispatch({ type: 'REPLACE_MEAL', date, mealId: meal.id, newMeal: result.data });
      showToast('Posiłek wymieniony pomyślnie!', 'success');
      onClose();
    } else {
      showToast(result.error || 'Nie udało się wymienić posiłku. Spróbuj ponownie.', 'error');
    }

    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-[75] p-4"
          >
            <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Wymiana posiłku</h3>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              {/* Current meal info */}
              <div className="bg-slate-50 rounded-xl p-3 mb-4">
                <p className="font-medium text-slate-700 mb-2">{meal.title}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full text-amber-700">
                    <Flame size={11} /> {meal.kcal} kcal
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-full text-emerald-700">
                    <Zap size={11} /> {meal.protein}g białka
                  </span>
                  <span className="font-mono text-slate-400">W: {meal.carbs}g | T: {meal.fats}g</span>
                </div>
              </div>

              {/* Comment textarea */}
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Komentarz (opcjonalnie)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="np. nie mam ochoty na kurczaka, za drogie, chcę coś z Airfryera..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none mb-4"
              />

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSwap}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generuję...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Wymień
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
