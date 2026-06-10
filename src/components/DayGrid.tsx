import { motion } from 'framer-motion';
import type { DayPlan } from '../types';

const SHORT_DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

interface DayGridProps {
  dayPlans: DayPlan[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

export function DayGrid({ dayPlans, selectedDay, onSelectDay }: DayGridProps) {
  const getDayPlan = (day: number): DayPlan | undefined =>
    dayPlans.find((dp) => dp.day === day);

  const renderWeek = (weekIndex: number) => {
    const startDay = weekIndex * 7 + 1;
    const days = Array.from({ length: 7 }, (_, i) => startDay + i);

    return (
      <div key={weekIndex}>
        <p className="text-xs font-semibold text-slate-400 uppercase mb-1.5">
          Tydzień {weekIndex + 1}
        </p>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const plan = getDayPlan(day);
            const isSelected = day === selectedDay;
            const hasMeals = (plan?.meals.length ?? 0) > 0;

            return (
              <motion.button
                key={day}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectDay(day)}
                className={`relative flex flex-col items-center justify-center w-full min-h-[52px] py-2 px-1 rounded-xl text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md'
                    : hasMeals
                      ? 'bg-white text-slate-700 shadow-sm hover:shadow-md'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] leading-tight opacity-70">
                  {SHORT_DAYS[(day - 1) % 7]}
                </span>
                <span className="font-bold leading-tight">{day}</span>
                {hasMeals && !isSelected && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renderWeek(0)}
      {renderWeek(1)}
    </div>
  );
}
