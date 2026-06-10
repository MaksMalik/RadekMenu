import type { Meal, MacroTargets } from '../types';

/**
 * Compute total macros by summing all meals in a list.
 */
export function computeTotals(meals: Meal[]): MacroTargets {
  return meals.reduce(
    (acc, meal) => ({
      kcal: acc.kcal + meal.kcal,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fats: acc.fats + meal.fats,
    }),
    { kcal: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

/**
 * Compute total macros only from eaten meals.
 */
export function computeEatenTotals(meals: Meal[]): MacroTargets {
  return computeTotals(meals.filter(m => m.eaten));
}

/**
 * Heatmap score for a day: how well the planned macros hit kcal + protein targets.
 * Returns 0 (no data) to 1 (on target). Used for calendar coloring.
 */
export function dayScore(
  meals: Meal[],
  calorieTarget: number,
  proteinTarget: number
): number {
  if (meals.length === 0) return 0;
  const t = computeTotals(meals);
  const kcalRatio = calorieTarget > 0 ? Math.min(t.kcal / calorieTarget, 1.2) : 0;
  const proteinRatio = proteinTarget > 0 ? Math.min(t.protein / proteinTarget, 1.2) : 0;
  // Closeness to 1.0 (perfect). Average of the two, clamped.
  const score = (Math.min(kcalRatio, 1) + Math.min(proteinRatio, 1)) / 2;
  return Math.max(0, Math.min(1, score));
}
