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

export function Calendar({
  dayPlans,
  selectedDate,
  calorieTarget,
  proteinTarget,
  onSelectDate,
}: CalendarProps) {
  const [viewDate, setViewDate] = useState<string>(selectedDate);
  const [collapsed, setCollapsed] = useState<boolean>(false);

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
    if (collapsed) {
      const target = addDays(selectedDate, -7);
      onSelectDate(target);
      setViewDate(target);
    } else {
      setViewDate((v) => addMonths(v, -1));
    }
  };

  const navNext = () => {
    if (collapsed) {
      const target = addDays(selectedDate, 7);
      onSelectDate(target);
      setViewDate(target);
    } else {
      setViewDate((v) => addMonths(v, 1));
    }
  };

  const goToday = () => {
    onSelectDate(today);
    setViewDate(today);
  };

  const handleSelect = (date: string) => {
    onSelectDate(date);
    setViewDate(date);
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
      base += ' text-slate-300 hover:bg-slate-50';
    } else {
      base += ' text-slate-700 hover:bg-slate-50';
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
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 sm:p-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-800">{headerLabel}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            Dziś
          </button>
          <button
            type="button"
            onClick={navPrev}
            aria-label="Poprzedni"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={navNext}
            aria-label="Następny"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Rozwiń' : 'Zwiń'}
            aria-expanded={!collapsed}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
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

      {/* Animated grid: height animates smoothly between week and month modes. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={collapsed ? 'week' : 'month'}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="space-y-1.5">
            {collapsed ? (
              <div className="grid grid-cols-7 gap-1.5">
                {weekRow.map((date) => renderCell(date, false))}
              </div>
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={monthLabel(effectiveView)}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="space-y-1.5"
                >
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1.5">
                      {week.map((date) => renderCell(date, true))}
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Heatmap legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-slate-400">
        <span>Mniej</span>
        <span className="inline-block w-3 h-3 rounded-[4px] bg-emerald-50" />
        <span className="inline-block w-3 h-3 rounded-[4px] bg-emerald-200" />
        <span className="inline-block w-3 h-3 rounded-[4px] bg-emerald-400" />
        <span className="inline-block w-3 h-3 rounded-[4px] bg-emerald-600" />
        <span>Więcej</span>
      </div>
    </div>
  );
}

export default Calendar;
