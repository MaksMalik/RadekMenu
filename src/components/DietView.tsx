import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, ClipboardPaste, Sparkles, ShoppingCart, ChefHat, Loader2,
  Refrigerator, Plus, MessageSquarePlus, AlertTriangle, MoreHorizontal,
  UtensilsCrossed, CheckSquare, Square, Lightbulb,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useToast } from './Toast';
import { Calendar } from './Calendar';
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
import { generateShoppingList } from '../utils/shoppingList';
import { generateCookingGuide } from '../utils/cookingGuide';
import { formatLong } from '../utils/dateUtils';
import type { Meal, CookingGuideEntry } from '../types';

type DayTab = 'posilki' | 'zakupy' | 'przepisy';

export function DietView() {
  const { state, dispatch } = useUser();
  const { showToast } = useToast();
  const { dayPlans, selectedDate, clipboard, userProfile, geminiApiKey } = state;

  const hasApiKey = Boolean(geminiApiKey);

  const currentDayPlan = dayPlans.find(dp => dp.date === selectedDate);
  const meals = currentDayPlan?.meals ?? [];

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
  const [moreOpen, setMoreOpen] = useState(false);
  const [dayTab, setDayTab] = useState<DayTab>('posilki');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const moreRef = useRef<HTMLDivElement>(null);

  // Per-day shopping list (current day only).
  const dayShoppingList = useMemo(
    () => generateShoppingList(currentDayPlan ? [currentDayPlan] : []),
    [currentDayPlan]
  );

  // Per-day cooking guide (current day only), keeping only meals that have steps.
  const dayCookingGuide = useMemo<CookingGuideEntry[]>(
    () =>
      generateCookingGuide(currentDayPlan ? [currentDayPlan] : []).filter(
        entry => entry.steps.length > 0
      ),
    [currentDayPlan]
  );

  const toggleIngredient = (item: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGenerateDay = async () => {
    setAiGenerating(true);
    const otherDays = dayPlans.filter(dp => dp.date !== selectedDate);
    const result = await generateFullDay(userProfile, geminiApiKey || '', otherDays, meals);
    if (result.success && Array.isArray(result.data)) {
      // Keep existing meals, append the AI-generated ones, sort by meal-type order
      const order = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];
      const merged = [...meals, ...result.data].sort(
        (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
      );
      dispatch({ type: 'SET_DAY_MEALS', date: selectedDate, meals: merged });
      showToast(
        meals.length > 0 ? 'Uzupełniono plan dnia przez AI!' : 'Plan dnia wygenerowany pomyślnie!',
        'success'
      );
    } else {
      showToast(result.error || 'Nie udało się wygenerować dnia. Spróbuj ponownie.', 'error');
    }
    setAiGenerating(false);
  };

  return (
    <div className="space-y-5">
      {/* Calendar */}
      <Calendar
        dayPlans={dayPlans}
        selectedDate={selectedDate}
        calorieTarget={userProfile.dailyCalorieTarget}
        proteinTarget={userProfile.dailyProteinTarget}
        onSelectDate={(date) => dispatch({ type: 'SELECT_DATE', date })}
      />

      {/* API key warning */}
      {!hasApiKey && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          Dodaj klucz API Gemini w ustawieniach, aby korzystać z funkcji AI.
        </div>
      )}

      {/* Selected day header */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 capitalize">{formatLong(selectedDate)}</h2>
      </div>

      {/* Primary AI button */}
      <motion.button
        whileHover={{ scale: aiGenerating || !hasApiKey ? 1 : 1.01 }}
        whileTap={{ scale: aiGenerating || !hasApiKey ? 1 : 0.99 }}
        onClick={handleGenerateDay}
        disabled={aiGenerating || !hasApiKey}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {aiGenerating ? (
          <><Loader2 size={16} className="animate-spin" /> Generuję plan...</>
        ) : meals.length > 0 ? (
          <><Sparkles size={16} /> Uzupełnij dzień przez AI</>
        ) : (
          <><Sparkles size={16} /> Wygeneruj cały dzień przez AI</>
        )}
      </motion.button>

      {/* Quick actions: 2 AI shortcuts + Add + More */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <ActionButton onClick={() => setShowFridge(true)} icon={<Refrigerator size={15} />} label="Co w lodówce?" tone="sky" disabled={!hasApiKey} />
        <ActionButton onClick={() => setShowAddFromDescription(true)} icon={<MessageSquarePlus size={15} />} label="Dodaj z opisu" tone="sky" disabled={!hasApiKey} />
        <ActionButton onClick={() => setShowAddMeal(true)} icon={<Plus size={15} />} label="Dodaj posiłek" tone="slate" />

        {/* More menu */}
        <div className="relative" ref={moreRef}>
          <ActionButton onClick={() => setMoreOpen(o => !o)} icon={<MoreHorizontal size={15} />} label="Więcej" tone="slate" fullWidth />
          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-30 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
              >
                <MenuItem onClick={() => { setMoreOpen(false); dispatch({ type: 'COPY_DAY', date: selectedDate }); showToast('Skopiowano dzień', 'success'); }} icon={<Copy size={15} />} label="Kopiuj dzień" />
                <MenuItem onClick={() => { setMoreOpen(false); dispatch({ type: 'PASTE_DAY', targetDate: selectedDate }); }} icon={<ClipboardPaste size={15} />} label="Wklej dzień" disabled={clipboard === null} />
                <div className="h-px bg-slate-100" />
                <MenuItem onClick={() => { setMoreOpen(false); setShowShopping(true); }} icon={<ShoppingCart size={15} />} label="Zakupy (kilka dni)" />
                <MenuItem onClick={() => { setMoreOpen(false); setShowCooking(true); }} icon={<ChefHat size={15} />} label="Przepisy (kilka dni)" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Per-day tab bar */}
      <div className="flex w-full gap-1 rounded-full bg-slate-100 p-1">
        {([
          { id: 'posilki', label: 'Posiłki', icon: <UtensilsCrossed size={15} /> },
          { id: 'zakupy', label: 'Zakupy', icon: <ShoppingCart size={15} /> },
          { id: 'przepisy', label: 'Przepisy', icon: <ChefHat size={15} /> },
        ] as { id: DayTab; label: string; icon: React.ReactNode }[]).map(tab => {
          const active = dayTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDayTab(tab.id)}
              className="relative flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors"
            >
              {active && (
                <motion.div
                  layoutId="dayTabIndicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-white shadow-sm"
                />
              )}
              <span className={`relative z-10 inline-flex items-center gap-1.5 ${active ? 'text-emerald-700' : 'text-slate-500'}`}>
                {tab.icon} {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {dayTab === 'posilki' && (
          <motion.div
            key="posilki"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Macro Rings */}
            <MacroRings
              meals={meals}
              calorieTarget={userProfile.dailyCalorieTarget}
              proteinTarget={userProfile.dailyProteinTarget}
            />

            {/* Meal Cards */}
            <div className="space-y-3">
              {meals.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
                  <p className="text-slate-400 text-sm">Brak posiłków na ten dzień. Wygeneruj plan przez AI lub dodaj posiłek ręcznie.</p>
                </div>
              ) : (
                meals.map(meal => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onToggleEaten={() => dispatch({ type: 'TOGGLE_EATEN', date: selectedDate, mealId: meal.id })}
                    onEdit={() => setEditingMeal(meal)}
                    onSwap={() => setSwappingMeal(meal)}
                    onDelete={() => setDeletingMeal(meal)}
                    onCopy={() => setCopyingMeal(meal)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}

        {dayTab === 'zakupy' && (
          <motion.div
            key="zakupy"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
              {dayShoppingList.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">
                  Brak składników — dodaj posiłki na ten dzień.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">
                      {checkedIngredients.size} / {dayShoppingList.length} zaznaczono
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {dayShoppingList.map(item => (
                      <li key={item}>
                        <button
                          onClick={() => toggleIngredient(item)}
                          className="flex items-center gap-2 w-full text-left py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          {checkedIngredients.has(item) ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm ${
                              checkedIngredients.has(item)
                                ? 'text-slate-400 line-through'
                                : 'text-slate-700'
                            }`}
                          >
                            {item}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        )}

        {dayTab === 'przepisy' && (
          <motion.div
            key="przepisy"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {dayCookingGuide.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
                <p className="text-slate-400 text-sm">Brak przepisów — dodaj posiłki na ten dzień.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dayCookingGuide.map((entry, entryIdx) => (
                  <div
                    key={`${entry.date}-${entry.mealType}-${entryIdx}`}
                    className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4"
                  >
                    {/* Meal title */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {entry.mealType}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {entry.mealTitle}
                      </span>
                    </div>

                    {/* Numbered steps */}
                    <ol className="space-y-1.5 ml-1">
                      {entry.steps.map((step, stepIdx) => (
                        <li key={stepIdx} className="flex gap-2 text-sm text-slate-700">
                          <span className="font-mono text-xs font-semibold text-emerald-600 mt-0.5 flex-shrink-0">
                            {stepIdx + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>

                    {/* Tip */}
                    {entry.tip && (
                      <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">{entry.tip}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {editingMeal && (
        <EditMealModal meal={editingMeal} date={selectedDate} isOpen={editingMeal !== null} onClose={() => setEditingMeal(null)} />
      )}
      {deletingMeal && (
        <ConfirmDeleteDialog meal={deletingMeal} date={selectedDate} isOpen={deletingMeal !== null} onClose={() => setDeletingMeal(null)} />
      )}
      {swappingMeal && (
        <SwapMealModal meal={swappingMeal} date={selectedDate} isOpen={!!swappingMeal} onClose={() => setSwappingMeal(null)} />
      )}
      {copyingMeal && (
        <CopyMealModal meal={copyingMeal} currentDate={selectedDate} isOpen={!!copyingMeal} onClose={() => setCopyingMeal(null)} />
      )}

      <AddMealModal date={selectedDate} isOpen={showAddMeal} onClose={() => setShowAddMeal(false)} />
      <AddFromDescriptionModal date={selectedDate} isOpen={showAddFromDescription} onClose={() => setShowAddFromDescription(false)} />
      {showFridge && <FridgeModal onClose={() => setShowFridge(false)} />}
      {showShopping && <ShoppingListModal onClose={() => setShowShopping(false)} />}
      {showCooking && <CookingGuideModal onClose={() => setShowCooking(false)} />}
    </div>
  );
}

function ActionButton({
  onClick, icon, label, tone, disabled, fullWidth,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: 'sky' | 'slate';
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const toneClass = tone === 'sky'
    ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800';
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? 'w-full ' : ''}inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl shadow-sm border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${toneClass}`}
    >
      {icon} {label}
    </motion.button>
  );
}

function MenuItem({
  onClick, icon, label, disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
    >
      {icon} {label}
    </button>
  );
}
