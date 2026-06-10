import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ShoppingCart, CheckSquare, Square } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { generateShoppingList } from '../utils/shoppingList';
import { formatLong } from '../utils/dateUtils';

interface ShoppingListModalProps {
  onClose: () => void;
}

export function ShoppingListModal({ onClose }: ShoppingListModalProps) {
  const { state } = useUser();
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

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

  const shoppingList = useMemo(
    () => generateShoppingList(selectedDayPlans),
    [selectedDayPlans]
  );

  const toggleItem = (item: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const allChecked = shoppingList.length > 0 && checkedItems.size === shoppingList.length;

  const toggleAll = () => {
    if (allChecked) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(shoppingList));
    }
  };

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
          className="relative bg-white rounded-3xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-800">Lista Zakupów</h2>
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
              Brak dni z posiłkami. Dodaj posiłki, aby wygenerować listę zakupów.
            </p>
          )}

          {/* Shopping List */}
          {availablePlans.length > 0 && (
            shoppingList.length > 0 ? (
              <div>
                {/* Toggle all */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">
                    {checkedItems.size} / {shoppingList.length} zaznaczono
                  </span>
                  <button
                    onClick={toggleAll}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {allChecked ? 'Odznacz' : 'Zaznacz wszystkie'}
                  </button>
                </div>

                {/* Items */}
                <ul className="space-y-1.5">
                  {shoppingList.map(item => (
                    <li key={item}>
                      <button
                        onClick={() => toggleItem(item)}
                        className="flex items-center gap-2 w-full text-left py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        {checkedItems.has(item) ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            checkedItems.has(item)
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
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">
                {selectedDates.size === 0
                  ? 'Wybierz dni, aby wygenerować listę zakupów.'
                  : 'Brak składników dla wybranych dni.'}
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
