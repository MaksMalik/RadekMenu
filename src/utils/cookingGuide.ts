import type { DayPlan, MealType, CookingGuideEntry } from '../types';
import { formatLong } from './dateUtils';

export type { CookingGuideEntry };

const MEAL_ORDER: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

/**
 * Generates a sequential cooking guide for all meals in the provided day plans.
 * Ordered by date (ascending), then by meal type order.
 */
export function generateCookingGuide(dayPlans: DayPlan[]): CookingGuideEntry[] {
  const entries: CookingGuideEntry[] = [];

  const sorted = [...dayPlans].sort((a, b) => a.date.localeCompare(b.date));

  for (const dp of sorted) {
    const sortedMeals = [...dp.meals].sort(
      (a, b) => MEAL_ORDER.indexOf(a.type) - MEAL_ORDER.indexOf(b.type)
    );

    for (const meal of sortedMeals) {
      const steps = meal.instruction
        .split(/\.\s*/)
        .filter(s => s.trim().length > 0)
        .map(s => s.trim() + (s.endsWith('.') ? '' : '.'));

      entries.push({
        date: dp.date,
        dayLabel: formatLong(dp.date),
        mealType: meal.type,
        mealTitle: meal.title,
        steps,
        tip: meal.tip,
      });
    }
  }

  return entries;
}
