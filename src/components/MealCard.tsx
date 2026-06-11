import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Beef, Wheat, Droplet, Pencil, RefreshCw, Trash2, CopyPlus,
  ChevronDown, Lightbulb,
} from 'lucide-react';
import type { Meal } from '../types';

interface MealCardProps {
  meal: Meal;
  onToggleEaten: () => void;
  onEdit: () => void;
  onSwap: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

function typeBadge(type: string): string {
  switch (type) {
    case 'Śniadanie': return 'bg-orange-50 text-orange-600';
    case 'II Śniadanie': return 'bg-yellow-50 text-yellow-700';
    case 'Obiad': return 'bg-emerald-50 text-emerald-700';
    case 'Przekąska': return 'bg-violet-50 text-violet-600';
    case 'Kolacja': return 'bg-indigo-50 text-indigo-600';
    default: return 'bg-slate-50 text-slate-600';
  }
}

export function MealCard({ meal, onToggleEaten, onEdit, onSwap, onDelete, onCopy }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasInstruction = meal.instruction.trim().length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl bg-white dark:bg-slate-900 shadow-sm border transition-all ${
        meal.eaten ? 'opacity-60 border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/20' : 'border-slate-100 dark:border-slate-800'
      }`}
    >
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Eaten checkbox */}
        <motion.span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onToggleEaten(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onToggleEaten(); } }}
          animate={{ backgroundColor: meal.eaten ? '#10b981' : '#f1f5f9' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <motion.path
              d="M20 6 9 17l-5-5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: meal.eaten ? 1 : 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </svg>
        </motion.span>

        {/* Title + type */}
        <div className="flex-1 min-w-0">
          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold mb-1 ${typeBadge(meal.type)}`}>
            {meal.type}
          </span>
          <motion.h3
            animate={{ color: meal.eaten ? '#94a3b8' : '#1e293b' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="text-sm font-bold"
          >
            <span
              className="bg-no-repeat transition-[background-size] duration-300 ease-in-out"
              style={{
                lineHeight: '1.5em',
                backgroundImage:
                  'linear-gradient(transparent calc(50% - 1px), #94a3b8 calc(50% - 1px), #94a3b8 calc(50% + 1px), transparent calc(50% + 1px))',
                backgroundRepeat: 'repeat-y',
                backgroundSize: meal.eaten ? '100% 1.5em' : '0% 1.5em',
              }}
            >
              {meal.title}
            </span>
          </motion.h3>
        </div>

        {/* Compact macros */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <MacroPill icon={<Flame size={12} />} value={`${meal.kcal}`} color="text-amber-600 bg-amber-50" />
          <MacroPill icon={<Beef size={12} />} value={`${meal.protein}g`} color="text-emerald-600 bg-emerald-50" />
        </div>

        <ChevronDown
          size={18}
          className={`text-slate-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Mobile macros row */}
      <div className="sm:hidden flex items-center gap-2 px-4 pb-2 -mt-1">
        <MacroPill icon={<Flame size={12} />} value={`${meal.kcal} kcal`} color="text-amber-600 bg-amber-50" />
        <MacroPill icon={<Beef size={12} />} value={`${meal.protein}g`} color="text-emerald-600 bg-emerald-50" />
        <MacroPill icon={<Wheat size={12} />} value={`${meal.carbs}g`} color="text-sky-600 bg-sky-50" />
        <MacroPill icon={<Droplet size={12} />} value={`${meal.fats}g`} color="text-violet-600 bg-violet-50" />
      </div>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {/* Full macros */}
              <div className="hidden sm:flex flex-wrap items-center gap-2 mb-4">
                <MacroPill icon={<Wheat size={12} />} value={`Węgle ${meal.carbs}g`} color="text-sky-600 bg-sky-50" />
                <MacroPill icon={<Droplet size={12} />} value={`Tłuszcze ${meal.fats}g`} color="text-violet-600 bg-violet-50" />
              </div>

              <div className={`grid grid-cols-1 gap-4 ${hasInstruction ? 'md:grid-cols-2' : ''}`}>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Składniki</p>
                  <ul className="space-y-1.5">
                    {meal.ingredients.map((ing, i) => (
                      <li key={i} className="text-[13px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>
                {hasInstruction && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Przygotowanie</p>
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700">
                      <p className="text-[13px] text-slate-600 dark:text-slate-300 italic leading-relaxed">{meal.instruction}</p>
                    </div>
                  </div>
                )}
              </div>

              {meal.tip && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50/70 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3">
                  <Lightbulb size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-800 dark:text-amber-300">{meal.tip}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <ActionBtn onClick={onEdit} icon={<Pencil size={12} />} label="Edytuj" color="bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100" />
                <ActionBtn onClick={onSwap} icon={<RefreshCw size={12} />} label="Wymień" color="bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100" />
                <ActionBtn onClick={onCopy} icon={<CopyPlus size={12} />} label="Kopiuj" color="bg-sky-50 border-sky-200 text-sky-600 hover:bg-sky-100" />
                <ActionBtn onClick={onDelete} icon={<Trash2 size={12} />} label="Usuń" color="bg-white border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 ml-auto" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MacroPill({ icon, value, color }: { icon: React.ReactNode; value: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${color}`}>
      {icon} {value}
    </span>
  );
}

function ActionBtn({ onClick, icon, label, color }: { onClick: () => void; icon: React.ReactNode; label: string; color: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${color}`}
    >
      {icon} {label}
    </motion.button>
  );
}
