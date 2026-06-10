import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Modal } from './Modal';
import type { Meal } from '../types';

interface EditMealModalProps {
  meal: Meal;
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

export function EditMealModal({ meal, date, isOpen, onClose }: EditMealModalProps) {
  const { dispatch } = useUser();

  const [title, setTitle] = useState(meal.title);
  const [kcal, setKcal] = useState(meal.kcal);
  const [protein, setProtein] = useState(meal.protein);
  const [carbs, setCarbs] = useState(meal.carbs);
  const [fats, setFats] = useState(meal.fats);
  const [ingredients, setIngredients] = useState(meal.ingredients.join('\n'));
  const [instruction, setInstruction] = useState(meal.instruction);

  // Re-initialize local state when meal prop changes
  useEffect(() => {
    setTitle(meal.title);
    setKcal(meal.kcal);
    setProtein(meal.protein);
    setCarbs(meal.carbs);
    setFats(meal.fats);
    setIngredients(meal.ingredients.join('\n'));
    setInstruction(meal.instruction);
  }, [meal]);

  const handleSave = () => {
    const updatedMeal: Meal = {
      ...meal,
      title,
      kcal,
      protein,
      carbs,
      fats,
      ingredients: ingredients.split('\n').filter((line) => line.trim() !== ''),
      instruction,
    };
    dispatch({ type: 'UPDATE_MEAL', date, mealId: meal.id, meal: updatedMeal });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edytuj posiłek">
      {/* Form */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tytuł</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Białko (g)</label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Węglowodany (g)</label>
            <input
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tłuszcze (g)</label>
            <input
              type="number"
              value={fats}
              onChange={(e) => setFats(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Instrukcja przygotowania</label>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
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
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
        >
          Zapisz
        </button>
      </div>
    </Modal>
  );
}
