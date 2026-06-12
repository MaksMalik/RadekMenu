import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, ClipboardPaste, Sparkles, ShoppingCart, ChefHat, Loader2,
  Refrigerator, Plus, MessageSquarePlus, AlertTriangle, MoreVertical,
  UtensilsCrossed, CheckSquare, Square, Lightbulb, X, Search
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
import { CustomMealModal } from './CustomMealModal';
import { generateFullDay } from '../ai/geminiClient';
import { generateShoppingList } from '../utils/shoppingList';
import { generateCookingGuide } from '../utils/cookingGuide';
import { formatLong } from '../utils/dateUtils';
import { macroTargetsFromProfile } from '../utils/macroTargets';
import type { Meal, CookingGuideEntry, MealType } from '../types';

type DayTab = 'posilki' | 'zakupy' | 'przepisy';

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

export function DietView() {
  const { state, dispatch } = useUser();
  const { showToast } = useToast();
  const { dayPlans, selectedDate, clipboard, userProfile, geminiApiKey } = state;

  const hasApiKey = Boolean(geminiApiKey);
  const macroTargets = useMemo(() => macroTargetsFromProfile(userProfile), [userProfile]);

  const currentDayPlan = dayPlans.find(dp => dp.date === selectedDate);
  const meals = currentDayPlan?.meals ?? [];

  const totalKcal = meals.reduce((sum, m) => sum + m.kcal, 0);
  const kcalTarget = macroTargets.kcal;
  const isWithinKcalRange = totalKcal >= kcalTarget * 0.98 && totalKcal <= kcalTarget * 1.02;
  const isDayComplete = meals.length >= 5 || (meals.length > 0 && isWithinKcalRange);

  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [deletingMeal, setDeletingMeal] = useState<Meal | null>(null);
  const [swappingMeal, setSwappingMeal] = useState<Meal | null>(null);
  const [showShopping, setShowShopping] = useState(false);
  const [showCooking, setShowCooking] = useState(false);
  const [showFridge, setShowFridge] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showAddFromDescription, setShowAddFromDescription] = useState(false);
  const [showCustomMeal, setShowCustomMeal] = useState(false);
  const [activeMealTypeForAdding, setActiveMealTypeForAdding] = useState<MealType | null>(null);
  const [copyingMeal, setCopyingMeal] = useState<Meal | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [dayTab, setDayTab] = useState<DayTab>('posilki');
  const moreRef = useRef<HTMLDivElement>(null);

  const dayShoppingList = useMemo(
    () => generateShoppingList(currentDayPlan ? [currentDayPlan] : []),
    [currentDayPlan]
  );

  const boughtIngredients = currentDayPlan?.boughtIngredients ?? [];
  const boughtCount = dayShoppingList.filter(item => boughtIngredients.includes(item)).length;

  const dayCookingGuide = useMemo<CookingGuideEntry[]>(
    () =>
      generateCookingGuide(currentDayPlan ? [currentDayPlan] : []).filter(
        entry => entry.steps.length > 0
      ),
    [currentDayPlan]
  );

  const toggleIngredient = (item: string) => {
    dispatch({ type: 'TOGGLE_BOUGHT', date: selectedDate, ingredient: item });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGenerateDay = async () => {
    setFabOpen(false);
    setAiGenerating(true);
    try {
      const otherDays = dayPlans.filter(dp => dp.date !== selectedDate);
      const result = await generateFullDay(userProfile, geminiApiKey || '', otherDays, meals);
      if (result.success && Array.isArray(result.data)) {
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
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <Calendar
        dayPlans={dayPlans}
        selectedDate={selectedDate}
        calorieTarget={macroTargets.kcal}
        proteinTarget={macroTargets.protein}
        onSelectDate={(date) => dispatch({ type: 'SELECT_DATE', date })}
      />

      {!hasApiKey && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          Dodaj klucz API Gemini w ustawieniach, aby korzystać z funkcji AI.
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">{formatLong(selectedDate)}</h2>
        <div className="flex items-center gap-1.5">
          {hasApiKey && !isDayComplete && (
            <button
              onClick={handleGenerateDay}
              disabled={aiGenerating}
              title={meals.length > 0 ? "Uzupełnij plan dnia przez AI" : "Generuj cały dzień z AI"}
              className="px-3 py-1.5 rounded-xl text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors flex items-center gap-1.5 text-xs font-bold border border-emerald-100 dark:border-emerald-900/30"
            >
              {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{meals.length > 0 ? "Uzupełnij AI" : "Generuj AI"}</span>
            </button>
          )}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen(o => !o)}
              aria-label="Więcej opcji"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreVertical size={18} />
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-30 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden"
                >
                  <MenuItem onClick={() => { setMoreOpen(false); dispatch({ type: 'COPY_DAY', date: selectedDate }); showToast('Skopiowano dzień', 'success'); }} icon={<Copy size={15} />} label="Kopiuj dzień" />
                  <MenuItem onClick={() => { setMoreOpen(false); dispatch({ type: 'PASTE_DAY', targetDate: selectedDate }); }} icon={<ClipboardPaste size={15} />} label="Wklej dzień" disabled={clipboard === null} />
                  {hasApiKey && !isDayComplete && (
                    <MenuItem
                      onClick={() => { setMoreOpen(false); handleGenerateDay(); }}
                      disabled={aiGenerating}
                      icon={aiGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                      label={meals.length > 0 ? "Uzupełnij dzień z AI" : "Wygeneruj dzień z AI"}
                    />
                  )}
                  <div className="h-px bg-slate-100 dark:bg-slate-800" />
                  <MenuItem onClick={() => { setMoreOpen(false); setShowShopping(true); }} icon={<ShoppingCart size={15} />} label="Zakupy (kilka dni)" />
                  <MenuItem onClick={() => { setMoreOpen(false); setShowCooking(true); }} icon={<ChefHat size={15} />} label="Przepisy (kilka dni)" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex w-full gap-1 rounded-full bg-slate-100 dark:bg-slate-800 p-1 mt-2">
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
                  className="absolute inset-0 rounded-full bg-white dark:bg-slate-700 shadow-sm"
                />
              )}
              <span className={`relative z-10 inline-flex items-center gap-1.5 ${active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {tab.icon} {tab.label}
              </span>
            </button>
          );
        })}
      </div>

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
            <MacroRings
              meals={meals}
              macroTargets={macroTargets}
            />

            <div className="space-y-4">
              {MEAL_TYPES.map(type => {
                const mealItems = meals.filter(m => m.type === type);
                const mealKcal = mealItems.reduce((sum, m) => sum + m.kcal, 0);
                const mealProtein = mealItems.reduce((sum, m) => sum + m.protein, 0);
                const mealCarbs = mealItems.reduce((sum, m) => sum + m.carbs, 0);
                const mealFats = mealItems.reduce((sum, m) => sum + m.fats, 0);

                return (
                  <div
                    key={type}
                    className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{type}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{mealKcal} kcal</span>
                        {mealKcal > 0 && (
                          <span className="hidden xs:inline">• B: {mealProtein}g • W: {mealCarbs}g • T: {mealFats}g</span>
                        )}
                      </div>
                    </div>

                    {mealItems.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-1.5 italic">Brak produktów</p>
                    ) : (
                      <div className="space-y-2">
                        {mealItems.map(meal => (
                          <MealCard
                            key={meal.id}
                            meal={meal}
                            onToggleEaten={() => dispatch({ type: 'TOGGLE_EATEN', date: selectedDate, mealId: meal.id })}
                            onEdit={() => setEditingMeal(meal)}
                            onSwap={() => setSwappingMeal(meal)}
                            onDelete={() => setDeletingMeal(meal)}
                            onCopy={() => setCopyingMeal(meal)}
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1 flex-wrap xs:flex-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMealTypeForAdding(type);
                          setShowCustomMeal(true);
                        }}
                        className="flex-1 min-w-[70px] py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/45 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-100 dark:border-emerald-900/40 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Search className="w-3.5 h-3.5" /> Baza
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMealTypeForAdding(type);
                          setShowAddMeal(true);
                        }}
                        className="flex-1 min-w-[70px] py-1.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ręcznie
                      </button>
                      <button
                        type="button"
                        disabled={!hasApiKey}
                        onClick={() => {
                          setActiveMealTypeForAdding(type);
                          setShowAddFromDescription(true);
                        }}
                        className="flex-1 min-w-[70px] py-1.5 px-3 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/20 dark:hover:bg-sky-950/45 text-sky-700 dark:text-sky-300 text-xs font-semibold rounded-xl border border-sky-100 dark:border-sky-900/40 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" /> z opisu (AI)
                      </button>
                    </div>
                  </div>
                );
              })}
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
              {dayShoppingList.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto w-16 h-16 mb-4 text-slate-300 dark:text-slate-600">
                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 12 h6 l4 26 h26 l5 -18 H22" />
                        <circle cx="24" cy="50" r="3.5" />
                        <circle cx="44" cy="50" r="3.5" />
                      </g>
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-300 font-medium mb-1">Lista jest pusta</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Dodaj posiłki, aby zobaczyć listę zakupów</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {boughtCount} / {dayShoppingList.length} kupiono
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {dayShoppingList.map(item => {
                      const bought = boughtIngredients.includes(item);
                      return (
                        <li key={item}>
                          <button
                            onClick={() => toggleIngredient(item)}
                            className="flex items-center gap-2 w-full text-left py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            {bought ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span
                              className={`text-sm ${
                                bought ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {item}
                            </span>
                          </button>
                        </li>
                      );
                    })}
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
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 text-center">
                <div className="py-2 text-center">
                  <div className="mx-auto w-16 h-16 mb-4 text-slate-300 dark:text-slate-600">
                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 40 h24 v6 a4 4 0 0 1 -4 4 H24 a4 4 0 0 1 -4 -4 z" />
                        <path d="M20 40 a10 10 0 0 1 -2 -19 a9 9 0 0 1 16 -5 a9 9 0 0 1 16 5 a10 10 0 0 1 -2 19 z" />
                      </g>
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-300 font-medium mb-1">Brak przepisów</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Dodaj posiłki z instrukcją, aby zobaczyć przepisy</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {dayCookingGuide.map((entry, entryIdx) => (
                  <div
                    key={`${entry.date}-${entry.mealType}-${entryIdx}`}
                    className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                        {entry.mealType}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {entry.mealTitle}
                      </span>
                    </div>
                    <ol className="space-y-1.5 ml-1">
                      {entry.steps.map((step, stepIdx) => (
                        <li key={stepIdx} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0">
                            {stepIdx + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    {entry.tip && (
                      <div className="mt-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3">
                        <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-300">{entry.tip}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SpeedDial
        open={fabOpen}
        onToggle={() => setFabOpen(o => !o)}
        hasApiKey={hasApiKey}
        hasMeals={meals.length > 0}
        isDayComplete={isDayComplete}
        aiGenerating={aiGenerating}
        onAddMeal={() => { setFabOpen(false); setShowAddMeal(true); }}
        onAddFromDescription={() => { setFabOpen(false); setShowAddFromDescription(true); }}
        onCustomMeal={() => { setFabOpen(false); setShowCustomMeal(true); }}
        onFridge={() => { setFabOpen(false); setShowFridge(true); }}
        onGenerateDay={handleGenerateDay}
      />

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

      <AddMealModal 
        date={selectedDate} 
        isOpen={showAddMeal} 
        onClose={() => { setShowAddMeal(false); setActiveMealTypeForAdding(null); }} 
        defaultMealType={activeMealTypeForAdding || undefined}
      />
      <AddFromDescriptionModal 
        date={selectedDate} 
        isOpen={showAddFromDescription} 
        onClose={() => { setShowAddFromDescription(false); setActiveMealTypeForAdding(null); }} 
        defaultMealType={activeMealTypeForAdding || undefined}
      />
      <CustomMealModal 
        date={selectedDate} 
        isOpen={showCustomMeal} 
        onClose={() => { setShowCustomMeal(false); setActiveMealTypeForAdding(null); }} 
        defaultMealType={activeMealTypeForAdding || undefined}
      />
      {showFridge && <FridgeModal onClose={() => setShowFridge(false)} />}
      {showShopping && <ShoppingListModal onClose={() => setShowShopping(false)} />}
      {showCooking && <CookingGuideModal onClose={() => setShowCooking(false)} />}
    </div>
  );
}

function SpeedDial({
  open, onToggle, hasApiKey, hasMeals, isDayComplete, aiGenerating,
  onAddMeal, onAddFromDescription, onCustomMeal, onFridge, onGenerateDay,
}: {
  open: boolean;
  onToggle: () => void;
  hasApiKey: boolean;
  hasMeals: boolean;
  isDayComplete: boolean;
  aiGenerating: boolean;
  onAddMeal: () => void;
  onAddFromDescription: () => void;
  onCustomMeal: () => void;
  onFridge: () => void;
  onGenerateDay: () => void;
}) {
  const actions = [
    { label: 'Dodaj posiłek', icon: <Plus size={18} />, onClick: onAddMeal, color: 'bg-slate-700', disabled: false },
    { label: 'Stwórz z produktów', icon: <UtensilsCrossed size={18} />, onClick: onCustomMeal, color: 'bg-orange-500', disabled: false },
    { label: 'Dodaj z opisu (AI)', icon: <MessageSquarePlus size={18} />, onClick: onAddFromDescription, color: 'bg-sky-500', disabled: !hasApiKey },
    { label: 'Co w lodówce? (AI)', icon: <Refrigerator size={18} />, onClick: onFridge, color: 'bg-sky-500', disabled: !hasApiKey },
    // Hide the generate/supplement option when the day is already complete
    ...(!isDayComplete ? [{
      label: hasMeals ? 'Uzupełnij dzień (AI)' : 'Wygeneruj cały dzień (AI)',
      icon: aiGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />,
      onClick: onGenerateDay,
      color: 'bg-emerald-500',
      disabled: !hasApiKey || aiGenerating,
    }] : []),
  ];

  return (
    <>
      {/* Backdrop when open */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-50 flex flex-col items-end gap-3">
        {/* Action buttons */}
        <AnimatePresence>
          {open && (
            <div className="flex flex-col items-end gap-3 mb-1">
              {actions.map((a, i) => (
                <motion.button
                  key={a.label}
                  initial={{ opacity: 0, y: 16, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.8 }}
                  transition={{ delay: open ? (actions.length - 1 - i) * 0.04 : 0, type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={a.disabled ? undefined : a.onClick}
                  disabled={a.disabled}
                  className="flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-md text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {a.label}
                  </span>
                  <span className={`w-12 h-12 rounded-full ${a.color} text-white flex items-center justify-center shadow-lg`}>
                    {a.icon}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onClick={onToggle}
          whileTap={{ scale: 0.9 }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-300/50"
          aria-label={open ? 'Zamknij menu' : 'Dodaj'}
        >
          <motion.span animate={{ rotate: open ? 135 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
            {open ? <X size={28} /> : <Plus size={28} />}
          </motion.span>
        </motion.button>
      </div>
    </>
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
      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
    >
      {icon} {label}
    </button>
  );
}
