import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, ClipboardPaste, Sparkles, ShoppingCart, ChefHat, Loader2,
  Refrigerator, Plus, MessageSquarePlus, AlertTriangle, MoreVertical,
  UtensilsCrossed, CheckSquare, Square, Lightbulb, X,
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

  // Day is "complete" when AI supplement shouldn't be offered anymore:
  // either 5 meals present OR total kcal is within ±2% of the daily target.
  const totalKcal = meals.reduce((sum, m) => sum + m.kcal, 0);
  const kcalTarget = userProfile.dailyCalorieTarget;
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

      {/* Selected day header + kebab menu */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800 capitalize">{formatLong(selectedDate)}</h2>
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen(o => !o)}
            aria-label="Więcej opcji"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                className="absolute right-0 z-30 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
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

      {/* Inline AI generate — ONLY when the day is empty */}
      {meals.length === 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: aiGenerating || !hasApiKey ? 1 : 1.01 }}
          whileTap={{ scale: aiGenerating || !hasApiKey ? 1 : 0.99 }}
          onClick={handleGenerateDay}
          disabled={aiGenerating || !hasApiKey}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {aiGenerating ? (
            <><Loader2 size={16} className="animate-spin" /> Generuję plan...</>
          ) : (
            <><Sparkles size={16} /> Wygeneruj cały dzień przez AI</>
          )}
        </motion.button>
      )}

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
            <MacroRings
              meals={meals}
              calorieTarget={userProfile.dailyCalorieTarget}
              proteinTarget={userProfile.dailyProteinTarget}
            />

            <div className="space-y-3">
              {meals.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
                  <p className="text-slate-400 text-sm">Brak posiłków na ten dzień. Użyj przycisku + lub wygeneruj plan przez AI.</p>
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
                            className="flex items-center gap-2 w-full text-left py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            {bought ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span
                              className={`text-sm ${
                                bought ? 'text-slate-400 line-through' : 'text-slate-700'
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
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {entry.mealType}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {entry.mealTitle}
                      </span>
                    </div>
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

      {/* Floating Action Button (speed dial) */}
      <SpeedDial
        open={fabOpen}
        onToggle={() => setFabOpen(o => !o)}
        hasApiKey={hasApiKey}
        hasMeals={meals.length > 0}
        isDayComplete={isDayComplete}
        aiGenerating={aiGenerating}
        onAddMeal={() => { setFabOpen(false); setShowAddMeal(true); }}
        onAddFromDescription={() => { setFabOpen(false); setShowAddFromDescription(true); }}
        onFridge={() => { setFabOpen(false); setShowFridge(true); }}
        onGenerateDay={handleGenerateDay}
      />

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

// ─── Floating Action Button / Speed Dial ────────────────────────────────────

function SpeedDial({
  open, onToggle, hasApiKey, hasMeals, isDayComplete, aiGenerating,
  onAddMeal, onAddFromDescription, onFridge, onGenerateDay,
}: {
  open: boolean;
  onToggle: () => void;
  hasApiKey: boolean;
  hasMeals: boolean;
  isDayComplete: boolean;
  aiGenerating: boolean;
  onAddMeal: () => void;
  onAddFromDescription: () => void;
  onFridge: () => void;
  onGenerateDay: () => void;
}) {
  const actions = [
    { label: 'Dodaj posiłek', icon: <Plus size={18} />, onClick: onAddMeal, color: 'bg-slate-700', disabled: false },
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
                  <span className="px-3 py-1.5 rounded-xl bg-white shadow-md text-sm font-medium text-slate-700 whitespace-nowrap">
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
      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
    >
      {icon} {label}
    </button>
  );
}
