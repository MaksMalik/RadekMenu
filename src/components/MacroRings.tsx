import { motion } from 'framer-motion';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react';
import type { Meal } from '../types';
import { computeTotals, computeEatenTotals } from '../utils/macros';

interface MacroRingsProps {
  meals: Meal[];
  calorieTarget: number;
  proteinTarget: number;
}

interface RingDef {
  key: string;
  label: string;
  eaten: number;
  planned: number;
  target: number;
  radius: number;
  color: string;
  trackColor: string;
  textColor: string;
  bgColor: string;
  icon: React.ReactNode;
  unit: string;
}

const SIZE = 160;
const CENTER = SIZE / 2;
const STROKE = 12;

function Ring({ def }: { def: RingDef }) {
  const circumference = 2 * Math.PI * def.radius;
  const pct = def.target > 0 ? Math.min(def.eaten / def.target, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <>
      {/* Track */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={def.radius}
        fill="none"
        strokeWidth={STROKE}
        className={def.trackColor}
        stroke="currentColor"
      />
      {/* Progress */}
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={def.radius}
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="round"
        className={def.color}
        stroke="currentColor"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />
    </>
  );
}

export function MacroRings({ meals, calorieTarget, proteinTarget }: MacroRingsProps) {
  const totals = computeTotals(meals);
  const eaten = computeEatenTotals(meals);

  // Derived targets for carbs & fats from calorie target (40% carbs, 30% fats)
  const carbTarget = Math.round((calorieTarget * 0.4) / 4);
  const fatTarget = Math.round((calorieTarget * 0.3) / 9);

  const rings: RingDef[] = [
    {
      key: 'kcal',
      label: 'Kalorie',
      eaten: eaten.kcal,
      planned: totals.kcal,
      target: calorieTarget,
      radius: 68,
      color: 'text-amber-500',
      trackColor: 'text-amber-100',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      icon: <Flame size={15} />,
      unit: 'kcal',
    },
    {
      key: 'protein',
      label: 'Białko',
      eaten: eaten.protein,
      planned: totals.protein,
      target: proteinTarget,
      radius: 54,
      color: 'text-emerald-500',
      trackColor: 'text-emerald-100',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      icon: <Beef size={15} />,
      unit: 'g',
    },
    {
      key: 'carbs',
      label: 'Węglowodany',
      eaten: eaten.carbs,
      planned: totals.carbs,
      target: carbTarget,
      radius: 40,
      color: 'text-sky-500',
      trackColor: 'text-sky-100',
      textColor: 'text-sky-600',
      bgColor: 'bg-sky-50',
      icon: <Wheat size={15} />,
      unit: 'g',
    },
    {
      key: 'fats',
      label: 'Tłuszcze',
      eaten: eaten.fats,
      planned: totals.fats,
      target: fatTarget,
      radius: 26,
      color: 'text-violet-500',
      trackColor: 'text-violet-100',
      textColor: 'text-violet-600',
      bgColor: 'bg-violet-50',
      icon: <Droplet size={15} />,
      unit: 'g',
    },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Rings */}
        <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="block">
            {rings.map((r) => (
              <Ring key={r.key} def={r} />
            ))}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <Flame size={16} className="text-amber-500" />
            <span className="text-lg font-bold text-slate-800 leading-none mt-0.5">
              {Math.round(eaten.kcal)}
            </span>
            <span className="text-[10px] text-slate-400">/ {calorieTarget}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2.5">
          {rings.map((r) => {
            const pct = r.target > 0 ? Math.round((r.eaten / r.target) * 100) : 0;
            return (
              <div key={r.key} className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl ${r.bgColor} ${r.textColor} flex items-center justify-center flex-shrink-0`}>
                  {r.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-600">{r.label}</span>
                    <span className="text-sm font-bold text-slate-800">
                      {Math.round(r.eaten)}
                      <span className="text-xs font-normal text-slate-400"> / {r.target} {r.unit}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Plan: {Math.round(r.planned)} {r.unit}</span>
                    <span className={`text-[11px] font-semibold ${r.textColor}`}>{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
