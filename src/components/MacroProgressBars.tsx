import { motion } from 'framer-motion';
import { Flame, Zap, TrendingUp, Droplets } from 'lucide-react';
import type { Meal } from '../types';
import { computeTotals, computeEatenTotals } from '../utils/macros';

interface MacroProgressBarsProps {
  meals: Meal[];
  calorieTarget: number;
  proteinTarget: number;
}

interface MacroBarProps {
  label: string;
  icon: React.ReactNode;
  eaten: number;
  planned: number;
  target?: number;
  color: string;
  bgColor: string;
  unit: string;
}

function MacroBar({ label, icon, eaten, planned, target, color, bgColor, unit }: MacroBarProps) {
  const isOverTarget = target ? planned > target : false;
  const percentEaten = target ? Math.min((eaten / target) * 100, 100) : 0;
  const percentPlanned = target ? Math.min((planned / target) * 100, 100) : 0;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>

      {/* Values */}
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${isOverTarget ? 'text-rose-600' : 'text-slate-800'}`}>
          {Math.round(eaten)}
        </span>
        {target && (
          <span className="text-sm text-slate-400">/ {target} {unit}</span>
        )}
        {!target && <span className="text-sm text-slate-400">{unit}</span>}
      </div>

      {/* Subtext */}
      <p className="text-[11px] text-slate-400">
        Plan: {Math.round(planned)} {unit}
        {isOverTarget && target && <span className="text-rose-500 ml-1">(+{Math.round(planned - target)})</span>}
      </p>

      {/* Progress bar */}
      {target ? (
        <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
          {/* Planned (lighter, background layer) */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentPlanned}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`absolute inset-y-0 left-0 rounded-full ${isOverTarget ? 'bg-rose-200' : bgColor}`}
          />
          {/* Eaten (solid, foreground layer) */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentEaten}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className={`absolute inset-y-0 left-0 rounded-full ${isOverTarget ? 'bg-rose-500' : color}`}
          />
        </div>
      ) : (
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${planned > 0 ? Math.min((eaten / (planned || 1)) * 100, 100) : 0}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${color}`}
          />
        </div>
      )}
    </div>
  );
}

export function MacroProgressBars({ meals, calorieTarget, proteinTarget }: MacroProgressBarsProps) {
  const totals = computeTotals(meals);
  const eaten = computeEatenTotals(meals);

  return (
    <div className="rounded-2xl bg-white shadow-sm p-5 border border-slate-100">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MacroBar
          label="Kalorie"
          icon={<Flame size={14} className="text-amber-500" />}
          eaten={eaten.kcal}
          planned={totals.kcal}
          target={calorieTarget}
          color="bg-amber-500"
          bgColor="bg-amber-200"
          unit="kcal"
        />
        <MacroBar
          label="Białko"
          icon={<Zap size={14} className="text-emerald-500" />}
          eaten={eaten.protein}
          planned={totals.protein}
          target={proteinTarget}
          color="bg-emerald-500"
          bgColor="bg-emerald-200"
          unit="g"
        />
        <MacroBar
          label="Węglowodany"
          icon={<TrendingUp size={14} className="text-sky-500" />}
          eaten={eaten.carbs}
          planned={totals.carbs}
          color="bg-sky-500"
          bgColor="bg-sky-200"
          unit="g"
        />
        <MacroBar
          label="Tłuszcze"
          icon={<Droplets size={14} className="text-violet-500" />}
          eaten={eaten.fats}
          planned={totals.fats}
          color="bg-violet-500"
          bgColor="bg-violet-200"
          unit="g"
        />
      </div>
    </div>
  );
}
