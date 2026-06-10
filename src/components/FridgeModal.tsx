import { useState } from 'react';
import { Refrigerator, Sparkles, Loader2, Flame, Zap, Plus, Check } from 'lucide-react';
import type { Meal, MealType } from '../types';
import { useUser } from '../context/UserContext';
import { useToast } from './Toast';
import { generateFromFridge } from '../ai/geminiClient';
import { formatLong } from '../utils/dateUtils';
import { Modal } from './Modal';

interface FridgeModalProps {
  onClose: () => void;
}

type SelectableType = MealType | 'dowolny';

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];
const TYPE_OPTIONS: SelectableType[] = ['dowolny', ...MEAL_TYPES];
const TYPE_LABELS: Record<SelectableType, string> = {
  dowolny: 'Dowolny',
  'Śniadanie': 'Śniadanie',
  'II Śniadanie': 'II Śniadanie',
  'Obiad': 'Obiad',
  'Przekąska': 'Przekąska',
  'Kolacja': 'Kolacja',
};

export function FridgeModal({ onClose }: FridgeModalProps) {
  const { state, dispatch } = useUser();
  const { showToast } = useToast();

  const apiKey = state.geminiApiKey || '';

  const [ingredients, setIngredients] = useState('');
  const [selectedType, setSelectedType] = useState<SelectableType>('dowolny');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Meal[]>([]);
  const [dateByOption, setDateByOption] = useState<Record<string, string>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const canGenerate = ingredients.trim() !== '' && !loading;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);

    const mealTypeArg = selectedType === 'dowolny' ? 'dowolny' : selectedType;

    try {
      const result = await generateFromFridge(ingredients.trim(), mealTypeArg, state.userProfile, apiKey);

      if (result.success && result.data && Array.isArray(result.data)) {
        const meals = result.data;
        setOptions(meals);
        setDateByOption(
          meals.reduce<Record<string, string>>((acc, m) => {
            acc[m.id] = state.selectedDate;
            return acc;
          }, {})
        );
        setAddedIds(new Set());
      } else {
        showToast(result.error || 'Nie udało się wygenerować propozycji. Spróbuj ponownie.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (option: Meal) => {
    const chosenDate = dateByOption[option.id] ?? state.selectedDate;
    const meal: Meal = {
      ...option,
      id: crypto.randomUUID(),
      eaten: false,
    };
    dispatch({ type: 'ADD_MEAL', date: chosenDate, meal });
    setAddedIds(prev => {
      const next = new Set(prev);
      next.add(option.id);
      return next;
    });
    showToast(`Dodano posiłek: ${formatLong(chosenDate)}`, 'success');
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Co mam w lodówce?">
      {/* Fridge icon header accent */}
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600">
          <Refrigerator size={20} />
        </span>
        <span className="text-sm text-slate-500">Wpisz składniki, AI zaproponuje posiłki</span>
      </div>

      {/* Ingredients textarea */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Wpisz składniki które masz (np. jajka, ser, kurczak, pomidor...)
        </label>
        <textarea
          value={ingredients}
          onChange={e => setIngredients(e.target.value)}
          placeholder="np. jajka, ser żółty, pierś z kurczaka, pomidor, ryż, cebula..."
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none"
        />
      </div>

      {/* Meal type selector */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Typ posiłku</label>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setSelectedType(opt)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedType === opt
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {TYPE_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Generuję...
          </>
        ) : (
          <>
            <Sparkles size={18} />
            Wygeneruj propozycje
          </>
        )}
      </button>

      {/* Results / empty state */}
      {options.length === 0 ? (
        <div className="mt-6 text-center text-sm text-slate-400 py-6">
          Wpisz co masz w lodówce, a AI zaproponuje 3 pomysły na posiłek dopasowane do Twoich makro.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {options.map(option => {
            const isAdded = addedIds.has(option.id);
            return (
              <div
                key={option.id}
                className="rounded-2xl border border-slate-200 p-4 shadow-sm"
              >
                {/* Type badge + title */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                    {option.type}
                  </span>
                </div>
                <p className="font-bold text-slate-800 mb-2">{option.title}</p>

                {/* Macro row */}
                <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full text-amber-700">
                    <Flame size={11} /> {option.kcal} kcal
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-full text-emerald-700">
                    <Zap size={11} /> {option.protein}g białka
                  </span>
                  <span className="font-mono text-slate-400">
                    W: {option.carbs}g | T: {option.fats}g
                  </span>
                </div>

                {/* Ingredients */}
                {option.ingredients.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-slate-600 mb-3 space-y-0.5">
                    {option.ingredients.map((ing, idx) => (
                      <li key={idx}>{ing}</li>
                    ))}
                  </ul>
                )}

                {/* Instruction */}
                {option.instruction && (
                  <p className="text-xs italic text-slate-500 mb-3">{option.instruction}</p>
                )}

                {/* Date picker + add */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateByOption[option.id] ?? state.selectedDate}
                    onChange={e =>
                      setDateByOption(prev => ({ ...prev, [option.id]: e.target.value }))
                    }
                    disabled={isAdded}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={() => handleAdd(option)}
                    disabled={isAdded}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isAdded ? (
                      <>
                        <Check size={16} />
                        Dodano
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Dodaj
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
