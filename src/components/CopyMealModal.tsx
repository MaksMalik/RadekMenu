import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import type { Meal } from '../types';
import { useUser } from '../context/UserContext';
import { useToast } from './Toast';

const SHORT_DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

interface CopyMealModalProps {
  meal: Meal;
  currentDay: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CopyMealModal({ meal, currentDay, isOpen, onClose }: CopyMealModalProps) {
  const { dispatch } = useUser();
  const { showToast } = useToast();
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());

  // Reset selection whenever the modal opens or closes.
  useEffect(() => {
    setSelectedDays(new Set());
  }, [isOpen]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const handleCopy = () => {
    if (selectedDays.size === 0) return;

    selectedDays.forEach((day) => {
      dispatch({
        type: 'ADD_MEAL',
        day,
        meal: { ...meal, id: crypto.randomUUID(), eaten: false },
      });
    });

    showToast(`Skopiowano posiłek do ${selectedDays.size} dni`, 'success');
    onClose();
  };

  const days = Array.from({ length: 14 }, (_, i) => i + 1);

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

              {/* Day grid */}
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                Wybierz dni
              </p>
              <div className="grid grid-cols-7 gap-2 mb-5">
                {days.map((day) => {
                  const isCurrent = day === currentDay;
                  const isSelected = selectedDays.has(day);

                  return (
                    <motion.button
                      key={day}
                      whileHover={isCurrent ? undefined : { scale: 1.05 }}
                      whileTap={isCurrent ? undefined : { scale: 0.95 }}
                      onClick={() => !isCurrent && toggleDay(day)}
                      disabled={isCurrent}
                      className={`relative flex flex-col items-center justify-center w-full min-h-[52px] py-2 px-1 rounded-xl text-xs font-medium transition-colors ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          : isSelected
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[10px] leading-tight opacity-70">
                        {SHORT_DAYS[(day - 1) % 7]}
                      </span>
                      <span className="font-bold leading-tight">{day}</span>
                      {isCurrent && (
                        <span className="text-[8px] leading-tight uppercase">obecny</span>
                      )}
                      {isSelected && !isCurrent && (
                        <span className="absolute top-1 right-1">
                          <Check size={11} strokeWidth={3} />
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
                  disabled={selectedDays.size === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Copy size={16} />
                  Kopiuj do {selectedDays.size} dni
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
