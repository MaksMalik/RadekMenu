import { motion } from 'framer-motion';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react';
import type { Meal } from '../types';
import { computeTotals, computeEatenTotals } from '../utils/macros';

interface MacroRingsProps {
  meals: Meal[];
  calorieTarget: number;
  proteinTarget: number;
}

const RING = 132;
const STROKE = 12;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;

export function MacroRings({ meals, calorieTarget, proteinTarget }: MacroRingsProps) {
  const totals = computeTotals(meals);
  const eaten = computeEatenTotals(meals);

  const carbTarget = Math.round((calorieTarget * 0.4) / 4);
  const fatTarget = Math.round((calorieTarget * 0.3) / 9);

  const kcalPct = calorieTarget > 0 ? Math.min(totals.kcal / calorieTarget, 1) : 0;
  const kcalPercent = calorieTarget > 0 ? Math.round((totals.kcal / calorieTarget) * 100) : 0;
  const over = totals.kcal > calorieTarget;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
      {/* Calorie donut */}
      <div className="flex flex-col items-center mb-5">
        <div className="relative" style={{ width: RING, height: RING }}>
          <svg width={RING} height={RING} className="-rotate-90">
            <circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              className="stroke-slate-100"
            />
            <motion.circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              className={over ? 'stroke-rose-500' : 'stroke-amber-400'}
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - kcalPct) }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame size={18} className="text-amber-500 mb-0.5" />
            <span className="text-2xl font-extrabold text-slate-800 leading-none">
              {Math.round(totals.kcal)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">/ {calorieTarget} kcal</span>
            <span className={`text-[11px] font-bold mt-0.5 ${over ? 'text-rose-500' : 'text-amber-500'}`}>
              {kcalPercent}%
            </span>
          </div>
        </div>
        {eaten.kcal > 0 && (
          <p className="text-[11px] text-slate-400 mt-2">
            Zjedzone: <span className="font-semibold text-emerald-600">{Math.round(eaten.kcal)} kcal</span>
          </p>
        )}
      </div>

      {/* Macro bars */}
      <div className="space-y-3">
        <MacroBar
          icon={<Beef size={14} />} label="Białko" iconBg="bg-emerald-50 text-emerald-600"
          value={totals.protein} target={proteinTarget} barClass="bg-emerald-500" unit="g"
        />
        <MacroBar
          icon={<Wheat size={14} />} label="Węglowodany" iconBg="bg-sky-50 text-sky-600"
          value={totals.carbs} target={carbTarget} barClass="bg-sky-500" unit="g"
        />
        <MacroBar
          icon={<Droplet size={14} />} label="Tłuszcze" iconBg="bg-violet-50 text-violet-600"
          value={totals.fats} target={fatTarget} barClass="bg-violet-500" unit="g"
        />
      </div>
    </div>
  );
}

function MacroBar({
  icon, label, iconBg, value, target, barClass, unit,
}: {
  icon: React.ReactNode;
  label: string;
  iconBg: string;
  value: number;
  target: number;
  barClass: string;
  unit: string;
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const percent = target > 0 ? Math.round((value / target) * 100) : 0;
  const over = value > target;

  return (
    <div className="flex items-center gap-3">
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-sm font-medium text-slate-600">{label}</span>
          <span className="text-sm font-bold text-slate-800">
            {Math.round(value)}
            <span className="text-xs font-normal text-slate-400"> / {target} {unit}</span>
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`h-full rounded-full ${over ? 'bg-rose-500' : barClass}`}
          />
        </div>
      </div>
      <span className="text-[11px] font-semibold text-slate-400 w-9 text-right">{percent}%</span>
    </div>
  );
}
