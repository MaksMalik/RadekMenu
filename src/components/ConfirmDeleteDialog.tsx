import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import type { Meal } from '../types';

interface ConfirmDeleteDialogProps {
  meal: Meal;
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ConfirmDeleteDialog({ meal, date, isOpen, onClose }: ConfirmDeleteDialogProps) {
  const { dispatch } = useUser();

  const handleConfirm = () => {
    dispatch({ type: 'DELETE_MEAL', date, mealId: meal.id });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 text-center"
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Usunąć posiłek?
            </h3>

            {/* Body */}
            <p className="text-slate-600 text-sm mb-6">
              Czy na pewno chcesz usunąć &ldquo;{meal.title}&rdquo;?
            </p>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors"
              >
                Usuń
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
