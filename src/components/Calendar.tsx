import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import type { DayPlan, Meal } from '../types';
import {
  WEEKDAY_HEADERS,
  addMonths,
  addDays,
  dayOfMonth,
  getMonthMatrix,
  getWeekDates,
  isSameMonth,
  monthLabel,
  todayISO,
} from '../utils/dateUtils';
import { dayScore } from '../utils/macros';

interface CalendarProps {
  dayPlans: DayPlan[];
  selectedDate: string; // ISO
  calorieTarget: number;
  proteinTarget: number;
  onSelectDate: (date: string) => void;
}

type Tint = { backgroundColor: string } | undefined;

/**
 * Map a 0..1 score to a heatmap background tint.
 * 0 = no tint, low = emerald-50, mid = emerald-200, high = emerald-400.
 * Days with meals but a poor score (low ratio) lean amber to flag attention.
 */
function heatmapTint(score: number, hasMeals: boolean): Tint {
  if (!hasMeals || score <= 0) return undefined;
  if (score < 0.34) {
    // some food logged but far from targets → warm amber hint
    return { backgroundColor: 'rgba(251, 191, 36, 0.22)' }; // amber-400 @ low alpha
  }
  // interpolate emerald intensity from light to strong
  const alpha = 0.18 + score * 0.62; // 0.18 .. 0.8
  return { backgroundColor: `rgba(16, 185, 129, ${alpha.toFixed(3)})` }; // emerald-500 base
}

/**
 * Variants for the calendar grid swap.
 * - Month navigation slides horizontally (driven by `dir`: 1 next, -1 prev).
 * - Collapse/expand (dir = 0) is a pure cross-fade; the smooth height change
 *   is handled by the parent's `layout` animation, so no vertical jump occurs.
 */
const gridVariants = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 28 : d < 0 ? -28 : 0 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -28 : d < 0 ? 28 : 0 }),
};

export function Calendar({
  dayPlans,
  selectedDate,
  calorieTarget,
  proteinTarget,
  onSelectDate,
}: CalendarProps) {
  const [viewDate, setViewDate] = useState<string>(selectedDate);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  // Slide direction for month navigation: 1 = next, -1 = prev, 0 = no slide.
  const [dir, setDir] = useState<number>(0);

  // Fast lookup of meals by date.
  const mealsByDate = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const dp of dayPlans) map.set(dp.date, dp.meals);
    return map;
  }, [dayPlans]);

  const today = todayISO();

  // Keep the view anchored to the selected date when it changes from outside.
  const effectiveView = useMemo(() => {
    if (collapsed) {
      // In week mode, always show the week containing the selected date.
      return selectedDate;
    }
    return viewDate;
  }, [collapsed, selectedDate, viewDate]);

  const weeks = useMemo(() => getMonthMatrix(effectiveView), [effectiveView]);
  const weekRow = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const navPrev = () => {
    setDir(-1);
    if (collapsed) {
      const target = addDays(selectedDate, -7);
      onSelectDate(target);
      setViewDate(target);
    } else {
      setViewDate((v) => addMonths(v, -1));
    }
  };

  const navNext = () => {
    setDir(1);
    if (collapsed) {
      const target = addDays(selectedDate, 7);
      onSelectDate(target);
      setViewDate(target);
    } else {
      setViewDate((v) => addMonths(v, 1));
    }
  };

  const goToday = () => {
    setDir(0);
    onSelectDate(today);
    setViewDate(today);
  };

  const handleSelect = (date: string) => {
    setDir(0);
    onSelectDate(date);
    setViewDate(date);
  };

  const toggleCollapsed = () => {
    setDir(0);
    setCollapsed((c) => !c);
  };

  // Key used to drive AnimatePresence transitions.
  const headerLabel = collapsed ? monthLabel(selectedDate) : monthLabel(effectiveView);

  const renderCell = (date: string, dimOutside: boolean) => {
    const meals = mealsByDate.get(date) ?? [];
    const hasMeals = meals.length > 0;
    const score = dayScore(meals, calorieTarget, proteinTarget);
    const isSelected = date === selectedDate;
    const isToday = date === today;
    const outside = dimOutside && !isSameMonth(date, effectiveView);
    const tint = heatmapTint(score, hasMeals);

    let base =
      'relative flex items-center justify-center w-full aspect-square min-h-[40px] rounded-xl text-sm font-medium transition-colors';

    if (isSelected) {
      base += ' bg-emerald-600 text-white shadow-md';
    } else if (outside) {
      base += ' text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700';
    } else {
      base += ' text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700';
    }

    const ringClass = isToday && !isSelected ? ' ring-2 ring-emerald-300' : '';

    return (
      <motion.button
        key={date}
        type="button"
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={() => handleSelect(date)}
        className={base + ringClass}
        // Tint only applies when the cell isn't selected (selection overrides it).
        style={!isSelected && tint ? tint : undefined}
        aria-label={date}
        aria-pressed={isSelected}
      >
        <span className="leading-none">{dayOfMonth(date)}</span>
        {hasMeals && !isSelected && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
        )}
      </motion.button>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">{headerLabel}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          >
            Dziś
          </button>
          <button
            type="button"
            onClick={navPrev}
            aria-label="Poprzedni"
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={navNext}
            aria-label="Następny"
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Rozwiń' : 'Zwiń'}
            aria-expanded={!collapsed}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAY_HEADERS.map((h) => (
          <div
            key={h}
            className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
          >
            {h}
          </div>
        ))}
      </div>

      {/* Animated grid.
          The outer `layout` container animates its height smoothly whenever the
          content height changes (week <-> month, or 5 <-> 6 week rows). Keeping
          `overflow-hidden` here means the horizontal month slide is clipped to a
          clean edge, while the `p-1 -m-1` buffer leaves room for the "today"
          ring (ring-2) so it is never clipped during the transition. The inner
          AnimatePresence handles the cross-fade / horizontal slide of content. */}
      <motion.div
        layout
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden p-1 -m-1"
      >
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div
            key={collapsed ? 'week' : `month-${monthLabel(effectiveView)}`}
            custom={dir}
            variants={gridVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="space-y-1.5"
          >
            {collapsed ? (
              <div className="grid grid-cols-7 gap-1.5">
                {weekRow.map((date) => renderCell(date, false))}
              </div>
            ) : (
              weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1.5">
                  {week.map((date) => renderCell(date, true))}
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default Calendar;
