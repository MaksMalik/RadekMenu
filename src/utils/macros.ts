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
