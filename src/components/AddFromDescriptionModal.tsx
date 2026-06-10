import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, MessageSquarePlus } from 'lucide-react';
import type { MealType } from '../types';
import { useUser } from '../context/UserContext';
import { useToast } from './Toast';
import { estimateMealFromDescription } from '../ai/geminiClient';

interface AddFromDescriptionModalProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

export function AddFromDescriptionModal({ date, isOpen, onClose }: AddFromDescriptionModalProps) {
  const { state, dispatch } = useUser();
  const { showToast } = useToast();

  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<MealType>('Obiad');
  const [loading, setLoading] = useState(false);

  const canSubmit = description.trim() !== '' && !loading;

  const handleEstimate = async () => {
    if (!canSubmit) return;
    setLoading(true);

    const apiKey = state.geminiApiKey || '';

    try {
      const result = await estimateMealFromDescription(description.trim(), selectedType, apiKey);

      if (result.success && result.data && !Array.isArray(result.data)) {
        dispatch({ type: 'ADD_MEAL', date, meal: result.data });
        showToast('Posiłek dodany pomyślnie!', 'success');
        setDescription('');
        onClose();
      } else {
        showToast(result.error || 'Nie udało się oszacować posiłku. Spróbuj ponownie.', 'error');
      }
    } finally {
      setLoading(false);
    }
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
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600">
                    <MessageSquarePlus size={20} />
                  </span>
                  <h3 className="text-lg font-bold text-slate-800">Dodaj z opisu</h3>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              {/* Description textarea */}
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Opisz co zjadłeś
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="np. kanapka z szynką i serem, jogurt naturalny z bananem, kawa z mlekiem..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none mb-4"
              />

              {/* Meal type selector */}
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Typ posiłku</label>
              <div className="flex flex-wrap gap-2 mb-5">
                {MEAL_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedType === type
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

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
                  onClick={handleEstimate}
                  disabled={!canSubmit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Szacuję...
                    </>
                  ) : (
                    'Oszacuj i dodaj'
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
