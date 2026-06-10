import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChefHat, Lightbulb, CheckSquare, Square } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { generateCookingGuide } from '../utils/cookingGuide';
import { formatLong } from '../utils/dateUtils';
import type { CookingGuideEntry } from '../types';

interface CookingGuideModalProps {
  onClose: () => void;
}

export function CookingGuideModal({ onClose }: CookingGuideModalProps) {
  const { state } = useUser();
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // Dates that have meals, sorted ascending.
  const availablePlans = useMemo(
    () => [...state.dayPlans].sort((a, b) => a.date.localeCompare(b.date)),
    [state.dayPlans]
  );

  const toggleDate = (date: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const allDaysSelected =
    availablePlans.length > 0 && selectedDates.size === availablePlans.length;

  const toggleAllDays = () => {
    if (allDaysSelected) {
      setSelectedDates(new Set());
    } else {
      setSelectedDates(new Set(availablePlans.map(dp => dp.date)));
    }
  };

  const selectedDayPlans = useMemo(
    () => availablePlans.filter(dp => selectedDates.has(dp.date)),
    [availablePlans, selectedDates]
  );

  const cookingGuide = useMemo(
    () => generateCookingGuide(selectedDayPlans),
    [selectedDayPlans]
  );

  // Group entries by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, CookingGuideEntry[]>();
    for (const entry of cookingGuide) {
      const existing = groups.get(entry.date);
      if (existing) {
        existing.push(entry);
      } else {
        groups.set(entry.date, [entry]);
      }
    }
    return groups;
  }, [cookingGuide]);

  return (
    <AnimatePresence>
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
          className="relative bg-white rounded-3xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-800">Przepisy & Instrukcje</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Date Selector */}
          {availablePlans.length > 0 ? (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Wybierz dni:</p>
                <button
                  onClick={toggleAllDays}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {allDaysSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                </button>
              </div>
              <div className="space-y-1.5">
                {availablePlans.map(dp => (
                  <button
                    key={dp.date}
                    onClick={() => toggleDate(dp.date)}
                    className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-xl border transition-colors ${
                      selectedDates.has(dp.date)
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    {selectedDates.has(dp.date) ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-sm text-slate-700 capitalize">
                      {formatLong(dp.date)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">
              Brak dni z posiłkami. Dodaj posiłki, aby wygenerować przewodnik kulinarny.
            </p>
          )}

          {/* Cooking Guide */}
          {availablePlans.length > 0 && (
            cookingGuide.length > 0 ? (
              <div className="space-y-6">
                {Array.from(groupedByDate.entries()).map(([date, entries]) => (
                  <div key={date}>
                    {/* Date heading */}
                    <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3 pb-2 border-b border-emerald-100 capitalize">
                      {entries[0].dayLabel}
                    </h3>

                    <div className="space-y-4">
                      {entries.map((entry, entryIdx) => (
                        <div
                          key={`${date}-${entryIdx}`}
                          className="bg-slate-50 rounded-2xl p-4"
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
                              <li
                                key={stepIdx}
                                className="flex gap-2 text-sm text-slate-700"
                              >
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
                              <p className="text-xs text-amber-800">
                                {entry.tip}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">
                {selectedDates.size === 0
                  ? 'Wybierz dni, aby wygenerować przewodnik kulinarny.'
                  : 'Brak przepisów dla wybranych dni.'}
              </p>
            )
          )}

          {/* Footer */}
          <div className="flex items-center justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Zamknij
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
