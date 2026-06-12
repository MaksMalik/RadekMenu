import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { MealType } from '../types';
import { useUser } from '../context/UserContext';
import { useToast } from './Toast';
import { estimateMealFromDescription } from '../ai/geminiClient';
import { Modal } from './Modal';

interface AddFromDescriptionModalProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
}

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

export function AddFromDescriptionModal({ date, isOpen, onClose, defaultMealType }: AddFromDescriptionModalProps) {
  const { state, dispatch } = useUser();
  const { showToast } = useToast();

  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<MealType>(defaultMealType || 'Obiad');

  // Reset selectedType and description when modal opens
  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setSelectedType(defaultMealType || 'Obiad');
    }
  }, [isOpen, defaultMealType]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Dodaj z opisu" size="lg">
      {/* Form */}
      <div className="space-y-4">
        {/* Description textarea */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Opisz co zjadłeś
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="np. kanapka z szynką i serem, jogurt naturalny z bananem, kawa z mlekiem..."
            rows={4}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-slate-800 dark:text-white resize-none"
          />
        </div>

        {/* Meal type selector */}
        {!defaultMealType && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Typ posiłku
            </label>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedType === type
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anuluj
        </button>
        <button
          onClick={handleEstimate}
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </Modal>
  );
}

