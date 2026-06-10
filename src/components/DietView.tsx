import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, ClipboardPaste, Sparkles, ShoppingCart, ChefHat, Loader2, Refrigerator, Plus, MessageSquarePlus, AlertTriangle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useToast } from './Toast';
import { DayGrid } from './DayGrid';
import { MacroRings } from './MacroRings';
import { MealCard } from './MealCard';
import { EditMealModal } from './EditMealModal';
import { AddMealModal } from './AddMealModal';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { SwapMealModal } from './SwapMealModal';
import { CopyMealModal } from './CopyMealModal';
import { FridgeModal } from './FridgeModal';
import { ShoppingListModal } from './ShoppingListModal';
import { CookingGuideModal } from './CookingGuideModal';
import { AddFromDescriptionModal } from './AddFromDescriptionModal';
import { generateFullDay } from '../ai/geminiClient';
import type { Meal } from '../types';

const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

function getDayName(dayNumber: number): string {
  return DAY_NAMES[(dayNumber - 1) % 7];
}

export function DietView() {
  const { state, dispatch } = useUser();
  const { showToast } = useToast();
  const { dayPlans, selectedDay, clipboard, userProfile, geminiApiKey } = state;

  const hasApiKey = Boolean(geminiApiKey);

  const currentDayPlan = dayPlans.find(dp => dp.day === selectedDay);
  const meals = currentDayPlan?.meals ?? [];

  // Modal states
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [deletingMeal, setDeletingMeal] = useState<Meal | null>(null);
  const [swappingMeal, setSwappingMeal] = useState<Meal | null>(null);
  const [showShopping, setShowShopping] = useState(false);
  const [showCooking, setShowCooking] = useState(false);
  const [showFridge, setShowFridge] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showAddFromDescription, setShowAddFromDescription] = useState(false);
  const [copyingMeal, setCopyingMeal] = useState<Meal | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleGenerateDay = async () => {
    setAiGenerating(true);

    const key = geminiApiKey || '';
    const result = await generateFullDay(userProfile, key, dayPlans);

    if (result.success && Array.isArray(result.data)) {
      dispatch({ type: 'SET_DAY_MEALS', day: selectedDay, meals: result.data });
      showToast('Plan dnia wygenerowany pomyślnie!', 'success');
    } else {
      showToast(result.error || 'Nie udało się wygenerować dnia. Spróbuj ponownie.', 'error');
    }
    setAiGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Day Grid */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <DayGrid
          dayPlans={dayPlans}
          selectedDay={selectedDay}
          onSelectDay={(day) => dispatch({ type: 'SELECT_DAY', day })}
        />
      </div>

      {/* API Key Warning */}
      {!hasApiKey && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          Dodaj klucz API Gemini w ustawieniach, aby korzystać z funkcji AI.
        </div>
      )}

      {/* Day Title + AI generate */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">
          {getDayName(selectedDay)} <span className="text-slate-400 font-medium">· Dzień {selectedDay}</span>
        </h2>
        <motion.button
          whileHover={{ scale: (aiGenerating || !hasApiKey) ? 1 : 1.03 }}
          whileTap={{ scale: (aiGenerating || !hasApiKey) ? 1 : 0.97 }}
          onClick={handleGenerateDay}
          disabled={aiGenerating || !hasApiKey}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {aiGenerating ? (
            <><Loader2 size={16} className="animate-spin" /> Generuję plan...</>
          ) : (
            <><Sparkles size={16} /> Wygeneruj dzień przez AI</>
          )}
        </motion.button>
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <SecondaryButton onClick={() => setShowFridge(true)} icon={<Refrigerator size={14} />} label="Co w lodówce?" highlight disabled={!hasApiKey} />
        <SecondaryButton onClick={() => setShowAddFromDescription(true)} icon={<MessageSquarePlus size={14} />} label="Dodaj z opisu" highlight disabled={!hasApiKey} />
        <SecondaryButton onClick={() => setShowAddMeal(true)} icon={<Plus size={14} />} label="Dodaj posiłek" />
        <SecondaryButton onClick={() => dispatch({ type: 'COPY_DAY', day: selectedDay })} icon={<Copy size={14} />} label="Kopiuj dzień" />
        <SecondaryButton onClick={() => dispatch({ type: 'PASTE_DAY', targetDay: selectedDay })} disabled={clipboard === null} icon={<ClipboardPaste size={14} />} label="Wklej dzień" />
        <SecondaryButton onClick={() => setShowShopping(true)} icon={<ShoppingCart size={14} />} label="Lista zakupów" />
        <SecondaryButton onClick={() => setShowCooking(true)} icon={<ChefHat size={14} />} label="Przepisy" />
      </div>

      {/* Macro Rings */}
      <MacroRings
        meals={meals}
        calorieTarget={userProfile.dailyCalorieTarget}
        proteinTarget={userProfile.dailyProteinTarget}
      />

      {/* Meal Cards */}
      <div className="space-y-4">
        {meals.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
            <p className="text-slate-400">Brak posiłków na ten dzień. Użyj AI, aby wygenerować plan.</p>
          </div>
        ) : (
          meals.map(meal => (
            <MealCard
              key={meal.id}
              meal={meal}
              onToggleEaten={() => dispatch({ type: 'TOGGLE_EATEN', day: selectedDay, mealId: meal.id })}
              onEdit={() => setEditingMeal(meal)}
              onSwap={() => setSwappingMeal(meal)}
              onDelete={() => setDeletingMeal(meal)}
              onCopy={() => setCopyingMeal(meal)}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          dayNumber={selectedDay}
          isOpen={editingMeal !== null}
          onClose={() => setEditingMeal(null)}
        />
      )}

      {deletingMeal && (
        <ConfirmDeleteDialog
          meal={deletingMeal}
          dayNumber={selectedDay}
          isOpen={deletingMeal !== null}
          onClose={() => setDeletingMeal(null)}
        />
      )}

      {swappingMeal && (
        <SwapMealModal
          meal={swappingMeal}
          dayNumber={selectedDay}
          isOpen={!!swappingMeal}
          onClose={() => setSwappingMeal(null)}
        />
      )}

      {copyingMeal && (
        <CopyMealModal
          meal={copyingMeal}
          currentDay={selectedDay}
          isOpen={!!copyingMeal}
          onClose={() => setCopyingMeal(null)}
        />
      )}

      <AddMealModal dayNumber={selectedDay} isOpen={showAddMeal} onClose={() => setShowAddMeal(false)} />
      <AddFromDescriptionModal dayNumber={selectedDay} isOpen={showAddFromDescription} onClose={() => setShowAddFromDescription(false)} />
      {showFridge && <FridgeModal onClose={() => setShowFridge(false)} />}
      {showShopping && <ShoppingListModal onClose={() => setShowShopping(false)} />}
      {showCooking && <CookingGuideModal onClose={() => setShowCooking(false)} />}
    </div>
  );
}

function SecondaryButton({
  onClick,
  icon,
  label,
  disabled,
  highlight,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl shadow-sm border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        highlight
          ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:shadow-md'
          : 'bg-white text-slate-600 border-slate-200 hover:shadow-md hover:text-slate-800'
      }`}
    >
      {icon} {label}
    </motion.button>
  );
}
