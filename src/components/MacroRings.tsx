import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import type { Meal, MacroTargets } from '../types';
import { computeTotals, computeEatenTotals } from '../utils/macros';

interface MacroRingsProps {
  meals: Meal[];
  calorieTarget?: number;
  proteinTarget?: number;
  macroTargets?: MacroTargets;
}

/* Main ring dimensions */
const RING = 150;
const STROKE = 10;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;

/* Mini ring dimensions */
const MINI = 50;
const MINI_STROKE = 6;
const MINI_R = (MINI - MINI_STROKE) / 2;
const MINI_C = 2 * Math.PI * MINI_R;

export function MacroRings({ meals, calorieTarget = 0, proteinTarget = 0, macroTargets }: MacroRingsProps) {
  const totals = computeTotals(meals);
  const eaten = computeEatenTotals(meals);
  const targets = macroTargets ?? {
    kcal: calorieTarget,
    protein: proteinTarget,
    carbs: Math.round((calorieTarget * 0.4) / 4),
    fats: Math.round((calorieTarget * 0.3) / 9),
  };
  const remaining = {
    kcal: targets.kcal - totals.kcal,
    protein: targets.protein - totals.protein,
    carbs: targets.carbs - totals.carbs,
    fats: targets.fats - totals.fats,
  };

  const kcalPct = targets.kcal > 0 ? Math.min(totals.kcal / targets.kcal, 1) : 0;
  const kcalPercent = targets.kcal > 0 ? Math.round((totals.kcal / targets.kcal) * 100) : 0;
  const over = totals.kcal > targets.kcal;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      {/* Calorie donut */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative" style={{ width: RING, height: RING }}>
          <svg width={RING} height={RING} className="-rotate-90">
            <defs>
              <linearGradient id="emerald-ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              className="stroke-slate-100 dark:stroke-slate-700"
            />
            <motion.circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              stroke={over ? '#f43f5e' : 'url(#emerald-ring-gradient)'}
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - kcalPct) }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame size={18} className={over ? 'text-rose-500 mb-0.5' : 'text-emerald-500 mb-0.5'} />
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">
              {Math.round(totals.kcal)}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">/ {targets.kcal} kcal</span>
            <span className={`text-[11px] font-bold mt-0.5 ${over ? 'text-rose-500' : 'text-emerald-500'}`}>
              {kcalPercent}%
            </span>
          </div>
        </div>
        {eaten.kcal > 0 && (
          <p className="text-[11px] text-slate-400 mt-2">
            Zjedzone: <span className="font-semibold text-emerald-600">{Math.round(eaten.kcal)} kcal</span>
          </p>
        )}
        <p className={`text-[11px] mt-2 ${remaining.kcal < 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
          Pozostało: <span className="font-semibold">{Math.round(remaining.kcal)} kcal</span>
        </p>
      </div>

      {/* Mini macro rings */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <MiniRing
          value={totals.protein}
          target={targets.protein}
          remaining={remaining.protein}
          label="Białko"
          color="#10b981"
          unit="g"
        />
        <MiniRing
          value={totals.carbs}
          target={targets.carbs}
          remaining={remaining.carbs}
          label="Węgle"
          color="#0ea5e9"
          unit="g"
        />
        <MiniRing
          value={totals.fats}
          target={targets.fats}
          remaining={remaining.fats}
          label="Tłuszcze"
          color="#8b5cf6"
          unit="g"
        />
      </div>
    </div>
  );
}

function MiniRing({
  value,
  target,
  remaining,
  label,
  color,
  unit,
}: {
  value: number;
  target: number;
  remaining: number;
  label: string;
  color: string;
  unit: string;
}) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const over = value > target;
  const strokeColor = over ? '#f43f5e' : color;

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="relative" style={{ width: MINI, height: MINI }}>
        <svg width={MINI} height={MINI} className="-rotate-90">
          <circle
            cx={MINI / 2}
            cy={MINI / 2}
            r={MINI_R}
            fill="none"
            strokeWidth={MINI_STROKE}
            className="stroke-slate-100 dark:stroke-slate-700"
          />
          <motion.circle
            cx={MINI / 2}
            cy={MINI / 2}
            r={MINI_R}
            fill="none"
            strokeWidth={MINI_STROKE}
            strokeLinecap="round"
            stroke={strokeColor}
            strokeDasharray={MINI_C}
            initial={{ strokeDashoffset: MINI_C }}
            animate={{ strokeDashoffset: MINI_C * (1 - pct) }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {Math.round(value)}
            <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">{unit}</span>
          </span>
        </div>
      </div>
      <span className="mt-1.5 max-w-full truncate text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <span className="max-w-full truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        {Math.round(value)} / {target}{unit}
      </span>
      <span className={`max-w-full truncate text-[10px] font-semibold ${over ? 'text-rose-500' : 'text-slate-400'}`}>
        {remaining < 0 ? `${Math.round(Math.abs(remaining))}${unit} ponad` : `${Math.round(remaining)}${unit} zostało`}
      </span>
    </div>
  );
}
