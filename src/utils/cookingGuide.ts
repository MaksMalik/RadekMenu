import type { DayPlan, MealType, CookingGuideEntry } from '../types';

export type { CookingGuideEntry };

const MEAL_ORDER: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];
const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

/**
 * Generates a sequential cooking guide for all meals in the provided day plans.
 * Ordered by day (ascending), then by meal type order.
 */
export function generateCookingGuide(dayPlans: DayPlan[]): CookingGuideEntry[] {
  const entries: CookingGuideEntry[] = [];

  // Sort by day number ascending
  const sorted = [...dayPlans].sort((a, b) => a.day - b.day);

  for (const dp of sorted) {
    // Sort meals by meal type order
    const sortedMeals = [...dp.meals].sort(
      (a, b) => MEAL_ORDER.indexOf(a.type) - MEAL_ORDER.indexOf(b.type)
    );

    for (const meal of sortedMeals) {
      const dayName = DAY_NAMES[(dp.day - 1) % 7];
      // Split instruction into steps by sentence
      const steps = meal.instruction
        .split(/\.\s*/)
        .filter(s => s.trim().length > 0)
        .map(s => s.trim() + (s.endsWith('.') ? '' : '.'));

      entries.push({
        day: dp.day,
        dayName,
        mealType: meal.type,
        mealTitle: meal.title,
        steps,
        tip: meal.tip,
      });
    }
  }

  return entries;
}
