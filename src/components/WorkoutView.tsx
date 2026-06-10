import { motion } from 'framer-motion';
import { Dumbbell, Target, CheckCircle2, Plus, Minus } from 'lucide-react';
import { useUser } from '../context/UserContext';
import type { StepCount, WorkoutDay } from '../types';

const STEP_TARGET = 12000;

export function WorkoutView() {
  const { state, dispatch } = useUser();
  const { workoutPlan, stepCounts } = state;

  const todayStep = stepCounts[0] ?? { day: 1, count: 0, target: STEP_TARGET };

  return (
    <div className="space-y-6">
      {/* Step Tracker */}
      <StepTracker
        stepCount={todayStep}
        onUpdate={(count) =>
          dispatch({ type: 'UPDATE_STEPS', day: todayStep.day, count })
        }
      />

      {/* Daily step cards overview */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target size={16} /> Przegląd kroków (14 dni)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {stepCounts.map((sc) => (
            <StepDayMini
              key={sc.day}
              stepCount={sc}
              onUpdate={(count) =>
                dispatch({ type: 'UPDATE_STEPS', day: sc.day, count })
              }
            />
          ))}
        </div>
      </div>

      {/* Workout Day Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {workoutPlan.map((day) => (
          <WorkoutDayCard key={day.id} workoutDay={day} />
        ))}
      </div>
    </div>
  );
}

function StepTracker({
  stepCount,
  onUpdate,
}: {
  stepCount: StepCount;
  onUpdate: (count: number) => void;
}) {
  const percent = Math.min((stepCount.count / stepCount.target) * 100, 100);
  const isComplete = stepCount.count >= stepCount.target;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      onUpdate(value);
    } else if (e.target.value === '') {
      onUpdate(0);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Target size={16} className="text-emerald-600" /> Kroki – Dzień {stepCount.day}
        </h3>
        {isComplete && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <CheckCircle2 size={28} className="text-emerald-500" />
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={() => onUpdate(Math.max(0, stepCount.count - 1000))}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          aria-label="Zmniejsz o 1000 kroków"
        >
          <Minus size={18} />
        </button>

        <input
          type="number"
          value={stepCount.count}
          onChange={handleInputChange}
          min={0}
          className="flex-1 text-center text-2xl font-bold text-slate-800 bg-slate-50 rounded-xl py-2 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Liczba kroków"
        />

        <button
          onClick={() => onUpdate(stepCount.count + 1000)}
          className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-600 transition-colors"
          aria-label="Zwiększ o 1000 kroków"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              isComplete ? 'bg-emerald-400' : 'bg-emerald-500'
            }`}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">0</span>
          <span className="text-xs text-slate-500 font-medium">
            {stepCount.count.toLocaleString('pl-PL')} / {stepCount.target.toLocaleString('pl-PL')} kroków
          </span>
          <span className="text-xs text-slate-400">{stepCount.target.toLocaleString('pl-PL')}</span>
        </div>
      </div>

      {isComplete && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-emerald-600 font-medium text-center"
        >
          🎉 Cel dzienny osiągnięty!
        </motion.p>
      )}
    </div>
  );
}

function StepDayMini({
  stepCount,
  onUpdate,
}: {
  stepCount: StepCount;
  onUpdate: (count: number) => void;
}) {
  const percent = Math.min((stepCount.count / stepCount.target) * 100, 100);
  const isComplete = stepCount.count >= stepCount.target;

  return (
    <div
      className={`rounded-xl p-3 text-center ${
        isComplete ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-50'
      }`}
    >
      <p className="text-xs text-slate-400 mb-1">Dzień {stepCount.day}</p>
      <p
        className={`text-sm font-bold ${
          isComplete ? 'text-emerald-600' : 'text-slate-700'
        }`}
      >
        {stepCount.count.toLocaleString('pl-PL')}
      </p>
      <p className="text-[10px] text-slate-400">
        / {stepCount.target.toLocaleString('pl-PL')}
      </p>
      {/* Progress bar */}
      <div className="h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className={`h-full rounded-full ${
            isComplete ? 'bg-emerald-400' : 'bg-emerald-500'
          }`}
        />
      </div>
      {/* Increment/decrement buttons */}
      <div className="flex justify-center gap-1 mt-2">
        <button
          onClick={() => onUpdate(Math.max(0, stepCount.count - 1000))}
          className="p-1 rounded-md hover:bg-slate-200 text-slate-400"
          aria-label={`Zmniejsz kroki dzień ${stepCount.day}`}
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => onUpdate(stepCount.count + 1000)}
          className="p-1 rounded-md hover:bg-slate-200 text-slate-400"
          aria-label={`Zwiększ kroki dzień ${stepCount.day}`}
        >
          <Plus size={12} />
        </button>
      </div>
      {isComplete && (
        <CheckCircle2 size={14} className="mx-auto mt-1 text-emerald-500" />
      )}
    </div>
  );
}

function WorkoutDayCard({ workoutDay }: { workoutDay: WorkoutDay }) {
  const isUpper = workoutDay.name.includes('Góra');

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-3xl shadow-sm p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`p-2 rounded-xl ${
            isUpper
              ? 'bg-blue-50 text-blue-600'
              : 'bg-amber-50 text-amber-600'
          }`}
        >
          <Dumbbell size={18} />
        </span>
        <h3 className="text-lg font-bold text-slate-800">
          {workoutDay.name}
        </h3>
        <span className="ml-auto text-xs text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full">
          {isUpper ? 'Góra ciała' : 'Dół ciała'}
        </span>
      </div>

      <div className="space-y-1">
        {workoutDay.exercises.map((ex, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700">{ex.name}</p>
              <span className="inline-block text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5">
                {ex.equipment === 'drążek do podciągania'
                  ? 'drążek do podciągania'
                  : ex.equipment === 'hantle regulowane'
                    ? 'hantle regulowane 2.5kg–24kg'
                    : ex.equipment}
              </span>
            </div>
            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap ml-2">
              {ex.sets} × {ex.reps}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
