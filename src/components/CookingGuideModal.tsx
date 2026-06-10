import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChefHat, Lightbulb } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { generateCookingGuide } from '../utils/cookingGuide';

interface CookingGuideModalProps {
  onClose: () => void;
}

const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

export function CookingGuideModal({ onClose }: CookingGuideModalProps) {
  const { state } = useUser();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const selectedDayPlans = useMemo(
    () => state.dayPlans.filter(dp => selectedDays.includes(dp.day)),
    [state.dayPlans, selectedDays]
  );

  const cookingGuide = useMemo(
    () => generateCookingGuide(selectedDayPlans),
    [selectedDayPlans]
  );

  // Group entries by day
  const groupedByDay = useMemo(() => {
    const groups: Map<number, typeof cookingGuide> = new Map();
    for (const entry of cookingGuide) {
      if (!groups.has(entry.day)) {
        groups.set(entry.day, []);
      }
      groups.get(entry.day)!.push(entry);
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

          {/* Day Selector */}
          <div className="mb-5">
            <p className="text-sm font-medium text-slate-700 mb-2">Wybierz dni:</p>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 14 }, (_, i) => i + 1).map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    selectedDays.includes(day)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div>{DAY_NAMES[(day - 1) % 7]}</div>
                  <div className="text-[10px] opacity-75">Dz. {day}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Cooking Guide */}
          {cookingGuide.length > 0 ? (
            <div className="space-y-6">
              {Array.from(groupedByDay.entries()).map(([day, entries]) => (
                <div key={day}>
                  {/* Day heading */}
                  <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3 pb-2 border-b border-emerald-100">
                    {entries[0].dayName} — Dzień {day}
                  </h3>

                  <div className="space-y-4">
                    {entries.map((entry, entryIdx) => (
                      <div
                        key={`${day}-${entryIdx}`}
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
              {selectedDays.length === 0
                ? 'Wybierz dni, aby wygenerować przewodnik kulinarny.'
                : 'Brak przepisów dla wybranych dni.'}
            </p>
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
