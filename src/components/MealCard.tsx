import { motion } from 'framer-motion';
import { Flame, Zap, CheckCircle, Pencil, RefreshCw, Trash2, CopyPlus } from 'lucide-react';
import type { Meal } from '../types';

interface MealCardProps {
  meal: Meal;
  onToggleEaten: () => void;
  onEdit: () => void;
  onSwap: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

function getMealTypeBadgeColors(type: string): string {
  switch (type) {
    case 'Śniadanie':
      return 'bg-orange-50 text-orange-600 border border-orange-200';
    case 'II Śniadanie':
      return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    case 'Obiad':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'Przekąska':
      return 'bg-violet-50 text-violet-600 border border-violet-200';
    case 'Kolacja':
      return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
    default:
      return 'bg-slate-50 text-slate-600 border border-slate-200';
  }
}

export function MealCard({ meal, onToggleEaten, onEdit, onSwap, onDelete, onCopy }: MealCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: '0 8px 25px -5px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl bg-white shadow-sm border border-slate-100 p-5 transition-all ${
        meal.eaten ? 'opacity-50 bg-slate-50' : ''
      }`}
    >
      {/* Top Bar: badges */}
      <div className="flex items-center flex-wrap gap-2 mb-3">
        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getMealTypeBadgeColors(meal.type)}`}>
          {meal.type}
        </span>
        <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-lg text-[11px] font-bold text-amber-700">
          <Flame size={11} /> {meal.kcal} kcal
        </span>
        <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px] font-bold text-emerald-700">
          <Zap size={11} /> {meal.protein}g białka
        </span>
        <span className="font-mono text-[10px] text-slate-400 ml-auto">
          W: {meal.carbs}g &nbsp;|&nbsp; T: {meal.fats}g
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-slate-800 mb-4 leading-snug">{meal.title}</h3>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Ingredients */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Składniki
          </p>
          <ul className="space-y-1.5">
            {meal.ingredients.map((ing, i) => (
              <li key={i} className="text-[13px] text-slate-600 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {/* Instruction */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Przygotowanie
          </p>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3.5 border border-slate-100">
            <p className="text-[13px] text-slate-600 italic leading-relaxed">{meal.instruction}</p>
          </div>
        </div>
      </div>

      {/* Optional tip */}
      {meal.tip && (
        <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 mb-4">
          <p className="text-[12px] text-amber-800">
            <span className="font-semibold">💡 Wskazówka:</span> {meal.tip}
          </p>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center flex-wrap gap-2 pt-3 border-t border-slate-100">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onToggleEaten}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
            meal.eaten
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
          }`}
        >
          <CheckCircle size={13} /> {meal.eaten ? 'Zjedzone ✓' : 'Zjedz posiłek'}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
        >
          <Pencil size={12} /> Edytuj
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onSwap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-all"
        >
          <RefreshCw size={12} /> Wymień
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 hover:text-sky-700 transition-all"
        >
          <CopyPlus size={12} /> Kopiuj
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all ml-auto"
        >
          <Trash2 size={12} /> Usuń
        </motion.button>
      </div>
    </motion.div>
  );
}
