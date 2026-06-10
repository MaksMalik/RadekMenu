import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useUser } from '../context/UserContext';
import type { Meal, MealType } from '../types';

interface AddMealModalProps {
  dayNumber: number;
  isOpen: boolean;
  onClose: () => void;
}

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

export function AddMealModal({ dayNumber, isOpen, onClose }: AddMealModalProps) {
  const { dispatch } = useUser();

  const [type, setType] = useState<MealType>('Śniadanie');
  const [title, setTitle] = useState('');
  const [kcal, setKcal] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fats, setFats] = useState(0);
  const [ingredients, setIngredients] = useState('');
  const [instruction, setInstruction] = useState('');
  const [tip, setTip] = useState('');

  // Reset the form whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setType('Śniadanie');
      setTitle('');
      setKcal(0);
      setProtein(0);
      setCarbs(0);
      setFats(0);
      setIngredients('');
      setInstruction('');
      setTip('');
    }
  }, [isOpen]);

  const isValid = title.trim() !== '';

  const handleAdd = () => {
    if (!isValid) return;
    const trimmedTip = tip.trim();
    const newMeal: Meal = {
      id: crypto.randomUUID(),
      type,
      title: title.trim(),
      kcal,
      protein,
      carbs,
      fats,
      ingredients: ingredients.split('\n').filter((line) => line.trim() !== ''),
      instruction,
      ...(trimmedTip !== '' ? { tip: trimmedTip } : {}),
      eaten: false,
    };
    dispatch({ type: 'ADD_MEAL', day: dayNumber, meal: newMeal });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-3xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-800">Dodaj posiłek</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Meal type — segmented control */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Typ posiłku</label>
                <div className="flex flex-wrap gap-2">
                  {MEAL_TYPES.map((mt) => (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setType(mt)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        type === mt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {mt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tytuł</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Macro Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kalorie (kcal)</label>
                  <input
                    type="number"
                    value={kcal}
                    onChange={(e) => setKcal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Białko (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Węglowodany (g)</label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tłuszcze (g)</label>
                  <input
                    type="number"
                    value={fats}
                    onChange={(e) => setFats(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Składniki (po jednym w linii)</label>
                <textarea
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instrukcja przygotowania</label>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Tip */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Wskazówka (opcjonalnie)</label>
                <input
                  type="text"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleAdd}
                disabled={!isValid}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Dodaj posiłek
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
