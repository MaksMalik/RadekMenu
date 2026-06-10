import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Meal } from '../types';
import { useUser } from '../context/UserContext';
import { useToast } from './Toast';
import {
  getMonthMatrix,
  addMonths,
  monthLabel,
  dayOfMonth,
  isSameMonth,
  WEEKDAY_HEADERS,
} from '../utils/dateUtils';

interface CopyMealModalProps {
  meal: Meal;
  currentDate: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CopyMealModal({ meal, currentDate, isOpen, onClose }: CopyMealModalProps) {
  const { dispatch } = useUser();
  const { showToast } = useToast();
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [viewMonth, setViewMonth] = useState(currentDate);

  // Reset selection and view month whenever the modal opens.
  useEffect(() => {
    setSelectedDates(new Set());
    setViewMonth(currentDate);
  }, [isOpen, currentDate]);

  const toggleDate = (date: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const handleCopy = () => {
    if (selectedDates.size === 0) return;

    selectedDates.forEach((date) => {
      dispatch({
        type: 'ADD_MEAL',
        date,
        meal: { ...meal, id: crypto.randomUUID(), eaten: false },
      });
    });

    showToast(`Skopiowano posiłek do ${selectedDates.size} dni`, 'success');
    onClose();
  };

  const weeks = getMonthMatrix(viewMonth);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-[75] p-4"
          >
            <div
              className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Copy size={18} className="text-emerald-600" />
                  Kopiuj posiłek do dni
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              {/* Meal being copied */}
              <div className="bg-slate-50 rounded-2xl p-3 mb-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-700 truncate">{meal.title}</p>
                  <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 rounded-full text-xs font-medium text-emerald-700">
                    {meal.type}
                  </span>
                </div>
                <p className="text-xs text-amber-700 mt-1">{meal.kcal} kcal</p>
              </div>

              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                  className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                  aria-label="Poprzedni miesiąc"
                >
                  <ChevronLeft size={18} className="text-slate-500" />
                </button>
                <span className="text-sm font-semibold text-slate-700 capitalize">
                  {monthLabel(viewMonth)}
                </span>
                <button
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                  aria-label="Następny miesiąc"
                >
                  <ChevronRight size={18} className="text-slate-500" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAY_HEADERS.map((header) => (
                  <div
                    key={header}
                    className="text-center text-[11px] font-semibold text-slate-400 uppercase py-1"
                  >
                    {header}
                  </div>
                ))}
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-7 gap-1 mb-5">
                {weeks.flat().map((date) => {
                  const isCurrent = date === currentDate;
                  const isSelected = selectedDates.has(date);
                  const inMonth = isSameMonth(date, viewMonth);

                  return (
                    <motion.button
                      key={date}
                      whileHover={isCurrent ? undefined : { scale: 1.05 }}
                      whileTap={isCurrent ? undefined : { scale: 0.95 }}
                      onClick={() => !isCurrent && toggleDate(date)}
                      disabled={isCurrent}
                      className={`relative flex items-center justify-center aspect-square rounded-xl text-sm font-medium transition-colors ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          : isSelected
                            ? 'bg-emerald-600 text-white shadow-md'
                            : inMonth
                              ? 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              : 'bg-transparent text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {dayOfMonth(date)}
                      {isSelected && !isCurrent && (
                        <span className="absolute top-0.5 right-0.5">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleCopy}
                  disabled={selectedDates.size === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Copy size={16} />
                  Kopiuj do {selectedDates.size} dni
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
